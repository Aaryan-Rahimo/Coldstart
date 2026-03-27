from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from supabase import Client, create_client

from app.config import get_settings
from app.models.schemas import CompanyData, UserContext


class SupabaseService:
    def __init__(self) -> None:
        settings = get_settings()
        self._client: Client = create_client(settings.supabase_url, settings.supabase_service_role_key)

    @property
    def client(self) -> Client:
        return self._client

    def validate_user_token(self, token: str) -> UserContext:
        response = self.client.auth.get_user(token)
        user = getattr(response, "user", None)
        if not user:
            raise ValueError("User not found for token")
        return UserContext(user_id=str(user.id), email=user.email)

    def insert_generated_email(
        self,
        *,
        user_id: str,
        company: CompanyData,
        subject: str,
        generated_text: str,
        resume_summary: str,
        github_summary: str | None,
    ) -> dict[str, Any]:
        payload = {
            "user_id": user_id,
            "company_name": company.company_name,
            "contact_email": str(company.contact_email),
            "role": company.role,
            "notes": company.notes,
            "subject": subject,
            "generated_text": generated_text,
            "resume_summary": resume_summary,
            "github_summary": github_summary,
            "status": "draft",
        }
        response = self.client.table("emails").insert(payload).execute()
        data = response.data or []
        if not data:
            raise ValueError("Failed to insert generated email")
        return data[0]

    def get_user_emails(self, user_id: str) -> list[dict[str, Any]]:
        response = (
            self.client.table("emails")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []

    def get_user_email_by_id(self, user_id: str, email_id: str) -> dict[str, Any] | None:
        response = (
            self.client.table("emails")
            .select("*")
            .eq("id", email_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None

    def update_email_edited_text(self, user_id: str, email_id: str, edited_text: str) -> dict[str, Any]:
        response = (
            self.client.table("emails")
            .update({"edited_text": edited_text, "status": "draft"})
            .eq("id", email_id)
            .eq("user_id", user_id)
            .execute()
        )
        data = response.data or []
        if not data:
            raise ValueError("Failed to update email draft")
        return data[0]

    def mark_email_sent(self, user_id: str, email_id: str, gmail_message_id: str) -> dict[str, Any]:
        response = (
            self.client.table("emails")
            .update(
                {
                    "status": "sent",
                    "gmail_message_id": gmail_message_id,
                    "sent_at": datetime.now(tz=UTC).isoformat(),
                }
            )
            .eq("id", email_id)
            .eq("user_id", user_id)
            .execute()
        )
        data = response.data or []
        if not data:
            raise ValueError("Failed to update email status")
        return data[0]

    def mark_email_failed(self, user_id: str, email_id: str) -> None:
        (
            self.client.table("emails")
            .update({"status": "failed"})
            .eq("id", email_id)
            .eq("user_id", user_id)
            .execute()
        )

    def upsert_gmail_tokens(self, user_id: str, encrypted_tokens: dict[str, Any]) -> None:
        payload = {
            "user_id": user_id,
            "access_token": encrypted_tokens["access_token"],
            "refresh_token": encrypted_tokens.get("refresh_token"),
            "token_expiry": encrypted_tokens["token_expiry"],
        }
        (
            self.client.table("user_gmail_tokens")
            .upsert(payload, on_conflict="user_id")
            .execute()
        )

    def get_gmail_tokens(self, user_id: str) -> dict[str, Any] | None:
        response = (
            self.client.table("user_gmail_tokens")
            .select("*")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None

    def update_gmail_access_token(self, user_id: str, encrypted_access_token: str, token_expiry: str) -> None:
        (
            self.client.table("user_gmail_tokens")
            .update({"access_token": encrypted_access_token, "token_expiry": token_expiry})
            .eq("user_id", user_id)
            .execute()
        )

    def insert_pdf_summary(self, user_id: str, summary: str, filename: str) -> dict[str, Any]:
        response = (
            self.client.table("files")
            .insert(
                {
                    "user_id": user_id,
                    "file_type": "resume",
                    "file_url": filename,
                    "parsed_text": summary,
                }
            )
            .execute()
        )
        data = response.data or []
        if not data:
            raise ValueError("Failed to store resume summary")
        return data[0]

    def upsert_github_summary(self, user_id: str, github_url: str, summary_text: str) -> dict[str, Any]:
        response = (
            self.client.table("user_github_profiles")
            .upsert(
                {
                    "user_id": user_id,
                    "github_username": github_url.rstrip("/").split("/")[-1],
                    "summary_text": summary_text,
                    "last_fetched_at": datetime.now(tz=UTC).isoformat(),
                },
                on_conflict="user_id",
            )
            .execute()
        )
        data = response.data or []
        if not data:
            raise ValueError("Failed to store GitHub summary")
        return data[0]


supabase_service = SupabaseService()
