import asyncio
import csv
import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.dependencies import get_current_user
from app.models.schemas import (
    CompanyData,
    GenerateEmailsRequest,
    GenerateEmailsResponse,
    GithubSummaryRequest,
    SendEmailRequest,
    UploadPdfResponse,
    UserContext,
)
from app.services.gemini_service import gemini_service
from app.services.gmail_service import gmail_service
from app.services.supabase_service import supabase_service
from app.utils.pdf_parser import extract_pdf_text

router = APIRouter(tags=["core"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


def _companies_from_csv(csv_data: str) -> list[CompanyData]:
    reader = csv.DictReader(io.StringIO(csv_data))
    required_columns = {"company_name", "contact_email"}
    if not required_columns.issubset(set(reader.fieldnames or [])):
        raise ValueError("CSV must include company_name and contact_email columns")

    rows: list[CompanyData] = []
    for row in reader:
        rows.append(
            CompanyData(
                company_name=row.get("company_name", ""),
                contact_email=row.get("contact_email", ""),
                role=row.get("role") or None,
                notes=row.get("notes") or None,
            )
        )
    return rows


@router.post("/generate-emails", response_model=GenerateEmailsResponse)
async def generate_emails(
    payload: GenerateEmailsRequest,
    user: UserContext = Depends(get_current_user),
) -> GenerateEmailsResponse:
    companies = payload.companies or []
    if payload.csv_data:
        companies.extend(_companies_from_csv(payload.csv_data))

    if not companies:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "NO_COMPANIES_PROVIDED",
                "message": "At least one company row is required",
                "details": {},
            },
        )

    semaphore = asyncio.Semaphore(10)

    async def _generate_and_store(company: CompanyData) -> dict:
        async with semaphore:
            generated_text = await asyncio.to_thread(
                gemini_service.generate_email,
                company,
                payload.resume_summary,
                payload.github_summary,
            )
            return await asyncio.to_thread(
                supabase_service.insert_generated_email,
                user_id=user.user_id,
                company=company,
                subject=f"Quick intro - {company.company_name}",
                generated_text=generated_text,
                resume_summary=payload.resume_summary,
                github_summary=payload.github_summary,
            )

    stored = await asyncio.gather(*[_generate_and_store(company) for company in companies])
    return GenerateEmailsResponse(emails=stored, count=len(stored))


@router.get("/emails")
async def get_emails(user: UserContext = Depends(get_current_user)) -> list[dict]:
    return await asyncio.to_thread(supabase_service.get_user_emails, user.user_id)


@router.post("/send-email")
async def send_email(
    payload: SendEmailRequest,
    user: UserContext = Depends(get_current_user),
) -> dict:
    row = await asyncio.to_thread(supabase_service.get_user_email_by_id, user.user_id, payload.email_id)
    if not row:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "EMAIL_NOT_FOUND",
                "message": "Email not found for current user",
                "details": {},
            },
        )

    body = row.get("edited_text") or row.get("generated_text")
    if not body:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "EMAIL_BODY_MISSING",
                "message": "Email body is empty",
                "details": {},
            },
        )

    try:
        message_id = await asyncio.to_thread(
            gmail_service.send_email,
            user.user_id,
            row["contact_email"],
            row.get("subject") or "Quick introduction",
            body,
        )
        return await asyncio.to_thread(
            supabase_service.mark_email_sent,
            user.user_id,
            payload.email_id,
            message_id,
        )
    except Exception as exc:
        await asyncio.to_thread(supabase_service.mark_email_failed, user.user_id, payload.email_id)
        raise HTTPException(
            status_code=502,
            detail={
                "error": "GMAIL_SEND_FAILED",
                "message": "Failed to send email via Gmail API",
                "details": {"reason": str(exc)},
            },
        ) from exc


@router.post("/upload-pdf", response_model=UploadPdfResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    user: UserContext = Depends(get_current_user),
) -> UploadPdfResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "INVALID_FILE_TYPE",
                "message": "Only PDF files are accepted",
                "details": {},
            },
        )

    raw = await file.read()
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "FILE_TOO_LARGE",
                "message": "PDF file exceeds 10MB limit",
                "details": {},
            },
        )

    extracted_text = await asyncio.to_thread(extract_pdf_text, raw)
    if not extracted_text.strip():
        raise HTTPException(
            status_code=400,
            detail={
                "error": "PDF_PARSE_FAILED",
                "message": "Could not extract text from PDF",
                "details": {},
            },
        )

    summary = await asyncio.to_thread(gemini_service.summarize_resume, extracted_text)
    row = await asyncio.to_thread(supabase_service.insert_pdf_summary, user.user_id, summary, file.filename)
    return UploadPdfResponse(file_id=row["id"], summary=summary)


@router.post("/github-summary")
async def github_summary(
    payload: GithubSummaryRequest,
    user: UserContext = Depends(get_current_user),
) -> dict:
    summary = await asyncio.to_thread(
        gemini_service.summarize_github,
        str(payload.github_url),
        payload.project_descriptions,
    )
    row = await asyncio.to_thread(
        supabase_service.upsert_github_summary,
        user.user_id,
        str(payload.github_url),
        summary,
    )
    return {"summary": summary, "record": row}
