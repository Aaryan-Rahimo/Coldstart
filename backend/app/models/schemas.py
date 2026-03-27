from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, HttpUrl, model_validator


class UserContext(BaseModel):
    user_id: str
    email: EmailStr | None = None


class CompanyData(BaseModel):
    company_name: str = Field(..., min_length=1)
    contact_email: EmailStr
    role: str | None = None
    notes: str | None = None


class GenerateEmailsRequest(BaseModel):
    companies: list[CompanyData] | None = None
    csv_data: str | None = None
    resume_summary: str
    github_summary: str | None = None

    @model_validator(mode="after")
    def validate_source(self) -> "GenerateEmailsRequest":
        if not self.companies and not self.csv_data:
            raise ValueError("Either companies or csv_data must be provided")
        return self


class EmailRecord(BaseModel):
    id: str
    user_id: str
    company_name: str
    contact_email: EmailStr
    role: str | None = None
    notes: str | None = None
    subject: str
    generated_text: str
    status: str
    sent_at: datetime | None = None
    created_at: datetime | None = None


class GenerateEmailsResponse(BaseModel):
    emails: list[EmailRecord]
    count: int


class SendEmailRequest(BaseModel):
    email_id: str


class UpdateEmailRequest(BaseModel):
    edited_text: str = Field(..., min_length=1)


class GithubSummaryRequest(BaseModel):
    github_url: HttpUrl
    project_descriptions: list[str] | None = None


class UploadPdfResponse(BaseModel):
    file_id: str
    summary: str


class GmailCallbackResponse(BaseModel):
    success: bool
    message: str


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
