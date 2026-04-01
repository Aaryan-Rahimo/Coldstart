from __future__ import annotations

import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from email.mime.text import MIMEText
from typing import Any
from urllib.parse import quote_plus

from cryptography.fernet import Fernet
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

from app.config import get_settings
from app.services.supabase_service import supabase_service

GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send"


class GmailService:
    def __init__(self) -> None:
        settings = get_settings()
        self.client_id = settings.google_client_id
        self.client_secret = settings.google_client_secret
        self.redirect_uri = settings.google_redirect_uri
        self.frontend_url = settings.frontend_url
        self._state_secret = settings.supabase_service_role_key.encode("utf-8")
        self._fernet = self._build_fernet(settings.gmail_token_encryption_key)

    def _encode_state(self, user_id: str) -> str:
        payload = {
            "user_id": user_id,
            "iat": int(datetime.now(tz=UTC).timestamp()),
        }
        payload_raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
        signature = hmac.new(self._state_secret, payload_raw, hashlib.sha256).hexdigest()
        envelope = {
            "p": base64.urlsafe_b64encode(payload_raw).decode("utf-8"),
            "s": signature,
        }
        return base64.urlsafe_b64encode(
            json.dumps(envelope, separators=(",", ":")).encode("utf-8")
        ).decode("utf-8")

    def decode_state(self, state_token: str) -> str:
        decoded = base64.urlsafe_b64decode(state_token.encode("utf-8")).decode("utf-8")
        envelope = json.loads(decoded)
        payload_b64 = envelope["p"]
        signature = envelope["s"]

        payload_raw = base64.urlsafe_b64decode(payload_b64.encode("utf-8"))
        expected = hmac.new(self._state_secret, payload_raw, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("Invalid OAuth state signature")

        payload = json.loads(payload_raw.decode("utf-8"))
        issued_at = datetime.fromtimestamp(payload["iat"], tz=UTC)
        if datetime.now(tz=UTC) - issued_at > timedelta(minutes=15):
            raise ValueError("OAuth state has expired")

        return payload["user_id"]

    @staticmethod
    def _build_fernet(raw_key: str | None) -> Fernet | None:
        if not raw_key:
            return None
        return Fernet(raw_key.encode("utf-8"))

    def _encrypt(self, value: str | None) -> str | None:
        if value is None:
            return None
        if self._fernet is None:
            return value
        return self._fernet.encrypt(value.encode("utf-8")).decode("utf-8")

    def _decrypt(self, value: str | None) -> str | None:
        if value is None:
            return None
        if self._fernet is None:
            return value
        return self._fernet.decrypt(value.encode("utf-8")).decode("utf-8")

    def get_auth_url(self, user_id: str) -> str:
        state_token = self._encode_state(user_id)
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri],
                }
            },
            scopes=[GMAIL_SEND_SCOPE],
            redirect_uri=self.redirect_uri,
        )
        auth_url, _ = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="consent",
            state=state_token,
        )
        return auth_url

    def exchange_code(self, code: str) -> dict[str, Any]:
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri],
                }
            },
            scopes=[GMAIL_SEND_SCOPE],
            redirect_uri=self.redirect_uri,
        )
        flow.fetch_token(code=code)
        credentials = flow.credentials
        expiry = credentials.expiry or datetime.now(tz=UTC) + timedelta(minutes=50)
        return {
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_expiry": expiry.isoformat(),
        }

    def store_user_tokens(self, user_id: str, token_payload: dict[str, Any]) -> None:
        encrypted_access = self._encrypt(token_payload["access_token"])
        encrypted_refresh = self._encrypt(token_payload.get("refresh_token"))

        supabase_service.upsert_gmail_tokens(
            user_id,
            {
                "access_token": encrypted_access,
                "refresh_token": encrypted_refresh,
                "token_expiry": token_payload["token_expiry"],
            },
        )
        supabase_service.upsert_user_integration(
            user_id=user_id,
            provider="google",
            access_token=encrypted_access or token_payload["access_token"],
            refresh_token=encrypted_refresh,
        )

    def _build_credentials(self, user_id: str) -> Credentials:
        row = supabase_service.get_gmail_tokens(user_id)
        if not row:
            raise ValueError("Gmail is not connected for this user")

        access_token = self._decrypt(row.get("access_token"))
        refresh_token = self._decrypt(row.get("refresh_token"))
        expiry_raw = row.get("token_expiry")
        expiry = None
        if expiry_raw:
            expiry = datetime.fromisoformat(expiry_raw.replace("Z", "+00:00"))

        creds = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=[GMAIL_SEND_SCOPE],
        )
        creds.expiry = expiry

        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            token_expiry = (
                creds.expiry.isoformat()
                if creds.expiry
                else (datetime.now(tz=UTC) + timedelta(minutes=50)).isoformat()
            )
            supabase_service.update_gmail_access_token(
                user_id,
                encrypted_access_token=self._encrypt(creds.token) or creds.token,
                token_expiry=token_expiry,
            )

        return creds

    def send_email(self, user_id: str, to: str, subject: str, body: str) -> str:
        creds = self._build_credentials(user_id)
        service = build("gmail", "v1", credentials=creds)

        mime_message = MIMEText(body)
        mime_message["to"] = to
        mime_message["subject"] = subject

        raw = base64.urlsafe_b64encode(mime_message.as_bytes()).decode("utf-8")
        response = (
            service.users()
            .messages()
            .send(userId="me", body={"raw": raw})
            .execute()
        )
        message_id = response.get("id")
        if not message_id:
            raise ValueError("Gmail API returned no message id")
        return message_id

    def callback_redirect_url(self, success: bool, message: str) -> str:
        return f"{self.frontend_url}/app/settings?gmail_connected={str(success).lower()}&message={quote_plus(message)}"


gmail_service = GmailService()
