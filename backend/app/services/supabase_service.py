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

    def upsert_user_integration(
        self,
        *,
        user_id: str,
        provider: str,
        access_token: str,
        refresh_token: str | None,
    ) -> dict[str, Any]:
        response = (
            self.client.table("user_integrations")
            .upsert(
                {
                    "user_id": user_id,
                    "provider": provider,
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                },
                on_conflict="user_id,provider",
            )
            .execute()
        )
        data = response.data or []
        if not data:
            raise ValueError(f"Failed to upsert {provider} integration")
        return data[0]

    def get_user_integration(self, user_id: str, provider: str) -> dict[str, Any] | None:
        response = (
            self.client.table("user_integrations")
            .select("*")
            .eq("user_id", user_id)
            .eq("provider", provider)
            .limit(1)
            .execute()
        )
        data = response.data or []
        return data[0] if data else None

    def list_user_integrations(self, user_id: str) -> list[dict[str, Any]]:
        response = (
            self.client.table("user_integrations")
            .select("provider")
            .eq("user_id", user_id)
            .execute()
        )
        return response.data or []

    def delete_user_integration(self, user_id: str, provider: str) -> None:
        (
            self.client.table("user_integrations")
            .delete()
            .eq("user_id", user_id)
            .eq("provider", provider)
            .execute()
        )

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

    def delete_gmail_tokens(self, user_id: str) -> None:
        (
            self.client.table("user_gmail_tokens")
            .delete()
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

    # ---------- File upload methods ----------

    def check_duplicate_file(self, user_id: str, file_name: str) -> bool:
        response = (
            self.client.table("user_files")
            .select("id")
            .eq("user_id", user_id)
            .eq("file_name", file_name)
            .limit(1)
            .execute()
        )
        return len(response.data or []) > 0

    def upload_to_storage(self, bucket: str, path: str, file_bytes: bytes, content_type: str) -> Any:
        return self.client.storage.from_(bucket).upload(
            path,
            file_bytes,
            file_options={"content-type": content_type, "upsert": "false"},
        )

    def insert_user_file(self, user_id: str, file_name: str, file_type: str, storage_path: str) -> dict[str, Any]:
        response = (
            self.client.table("user_files")
            .insert(
                {
                    "user_id": user_id,
                    "file_name": file_name,
                    "file_type": file_type,
                    "storage_path": storage_path,
                }
            )
            .execute()
        )
        data = response.data or []
        if not data:
            raise ValueError("Failed to insert file metadata")
        return data[0]

    def get_user_files(self, user_id: str) -> list[dict[str, Any]]:
        response = (
            self.client.table("user_files")
            .select("*")
            .eq("user_id", user_id)
            .order("uploaded_at", desc=True)
            .execute()
        )
        return response.data or []

    # ---------- GitHub project methods ----------

    def get_github_token(self, user_id: str) -> str | None:
        row = self.get_user_integration(user_id, "github")
        if not row:
            return None
        token = row.get("access_token")
        return token if token else None

    def upsert_user_projects(self, user_id: str, projects: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not projects:
            return []
        response = (
            self.client.table("user_projects")
            .upsert(projects, on_conflict="user_id,repo_name")
            .execute()
        )
        return response.data or []

    def get_user_projects(self, user_id: str) -> list[dict[str, Any]]:
        response = (
            self.client.table("user_projects")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data or []

    # ---------- New methods for updated routes ----------

    def check_file_exists(self, user_id: str, filename: str) -> bool:
        try:
            result = self.client.table("user_files") \
                .select("id") \
                .eq("user_id", user_id) \
                .eq("file_name", filename) \
                .execute()
            return bool(result.data and len(result.data) > 0)
        except Exception as e:
            print(f"check_file_exists error: {e}")
            return False

    def upload_file_to_storage(self, bucket: str, path: str, content: bytes, content_type: str):
        try:
            result = self.client.storage.from_(bucket).upload(
                path=path,
                file=content,
                file_options={"content-type": content_type, "upsert": "false"},
            )
            return result
        except Exception as e:
            print(f"upload_file_to_storage error: {e}")
            raise

    def list_user_files(self, user_id: str) -> list:
        try:
            result = self.client.table("user_files") \
                .select("*") \
                .eq("user_id", user_id) \
                .order("uploaded_at", desc=True) \
                .execute()
            return result.data or []
        except Exception as e:
            print(f"list_user_files error: {e}")
            return []

    def get_user_file_by_id(self, file_id: str, user_id: str):
        try:
            result = self.client.table("user_files") \
                .select("*") \
                .eq("id", file_id) \
                .eq("user_id", user_id) \
                .single() \
                .execute()
            return result.data
        except Exception:
            return None

    def delete_user_file(self, file_id: str, user_id: str):
        self.client.table("user_files") \
            .delete() \
            .eq("id", file_id) \
            .eq("user_id", user_id) \
            .execute()

    def delete_file_from_storage(self, bucket: str, path: str):
        try:
            self.client.storage.from_(bucket).remove([path])
        except Exception as e:
            print(f"delete_file_from_storage error: {e}")

    def upsert_user_project(self, user_id: str, project: dict):
        try:
            # Ensure languages is always a list of strings
            languages = project.get("languages", [])
            if not isinstance(languages, list):
                languages = [languages] if languages else []
            languages = [str(l) for l in languages if l]

            payload = {
                "user_id": user_id,
                "repo_name": project.get("repo_name", ""),
                "description": (project.get("description") or "")[:2000],
                "summary": (project.get("summary") or "")[:500],
                "language": project.get("language") or "",
                "languages": languages,
                "stars": project.get("stars", 0),
                "github_url": project.get("github_url", ""),
                "updated_at": datetime.now(UTC).isoformat(),
            }
            self.client.table("user_projects").upsert(
                payload,
                on_conflict="user_id,repo_name"
            ).execute()
        except Exception as e:
            print(f"upsert_user_project error for {project.get('repo_name', '?')}: {e}")
            raise

    def list_user_projects(self, user_id: str) -> list:
        try:
            result = self.client.table("user_projects") \
                .select("*") \
                .eq("user_id", user_id) \
                .order("updated_at", desc=True) \
                .execute()
            return result.data or []
        except Exception as e:
            print(f"list_user_projects error: {e}")
            return []


    def get_github_token_from_identity(self, user_id: str) -> str | None:
        """
        Fetches the GitHub OAuth token directly from Supabase auth identities.
        Used as fallback when user_integrations doesn't have a real token.
        """
        try:
            response = self.client.auth.admin.get_user_by_id(user_id)
            user = getattr(response, 'user', None)
            if not user:
                return None

            identities = getattr(user, 'identities', None) or []
            for identity in identities:
                provider = getattr(identity, 'provider', None)
                if provider == 'github':
                    identity_data = getattr(identity, 'identity_data', None) or {}
                    token = identity_data.get('provider_token') or identity_data.get('access_token')
                    if token:
                        return token
            return None
        except Exception as e:
            print(f"get_github_token_from_identity error: {e}")
            return None


supabase_service = SupabaseService()

