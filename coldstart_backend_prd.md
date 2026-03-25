# Coldstart — Backend PRD
**Version:** 1.0 | **Stack:** FastAPI (Python) + Supabase + Gemini API/Groq + Gmail API

---

## 1. Overview

This document defines all backend logic, data models, API contracts, and service responsibilities for Coldstart — an AI-powered cold email automation platform. The backend is a stateless FastAPI service that handles authentication delegation, file processing, AI email generation, and Gmail-based email delivery.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| API Framework | FastAPI (Python 3.11+) |
| Auth | Supabase Auth (JWT-based) |
| Database | Supabase PostgreSQL |
| File Storage | Supabase Storage |
| AI | Gemini API or Groq AI |
| Email Sending | Gmail API (OAuth2) |
| PDF Parsing | `pdfplumber` |
| CSV Parsing | `pandas` |
| GitHub Scraping | `httpx` + GitHub REST API |
| Background Tasks | FastAPI `BackgroundTasks` (Celery in V2) |
| Validation | Pydantic v2 |

---

## 3. Authentication

### Strategy
- Supabase handles user sign-up, login, and session management
- Backend receives a Supabase JWT in the `Authorization: Bearer <token>` header on every request
- All routes (except `/health`) are protected via a `get_current_user` dependency that validates the JWT against Supabase

### Dependency
```python
async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserContext:
    # Validate JWT via supabase.auth.get_user(token)
    # Return UserContext(user_id, email)
```

### Gmail OAuth
- Separate OAuth2 flow for Gmail using Google's OAuth2 library
- After consent, store `access_token` + `refresh_token` in `user_gmail_tokens` table (encrypted at rest)
- Token refresh handled transparently before any send operation

---

## 4. Data Models

### `users` (managed by Supabase Auth)
| Field | Type |
|---|---|
| id | uuid (PK) |
| email | text |
| created_at | timestamptz |

---

### `contacts`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → users) | |
| company_name | text | |
| contact_email | text | |
| role | text | nullable |
| notes | text | nullable |
| created_at | timestamptz | |

---

### `emails`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| contact_id | uuid (FK → contacts) | |
| user_id | uuid (FK → users) | |
| generated_text | text | Raw LLM output |
| edited_text | text | nullable — user's edited version |
| status | enum('draft','queued','sent','failed') | |
| sent_at | timestamptz | nullable |
| gmail_message_id | text | nullable — for dedup |
| created_at | timestamptz | |

---

### `files`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → users) | |
| file_type | enum('resume','cover_letter','transcript','csv') | |
| file_url | text | Supabase Storage URL |
| parsed_text | text | nullable — extracted text cached here |
| created_at | timestamptz | |

---

### `user_github_profiles`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → users) | |
| github_username | text | |
| top_repos | jsonb | Array of {name, description, languages, stars} |
| summary_text | text | LLM-generated summary of GitHub profile |
| last_fetched_at | timestamptz | |

---

### `user_gmail_tokens`
| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid (FK → users) | |
| access_token | text | encrypted |
| refresh_token | text | encrypted |
| token_expiry | timestamptz | |

---

## 5. API Endpoints

### Health
```
GET /health
Response: { "status": "ok" }
```

---

### File Upload

#### Upload PDF (resume / supporting doc)
```
POST /files/upload-pdf
Auth: Required
Body: multipart/form-data { file: File, file_type: "resume" | "cover_letter" | "transcript" }
Processing:
  1. Validate file is PDF, max 10MB
  2. Upload to Supabase Storage at users/{user_id}/pdfs/{uuid}.pdf
  3. Run pdfplumber to extract text → store in files.parsed_text
  4. Return file record
Response: FileRecord
```

#### Upload CSV
```
POST /files/upload-csv
Auth: Required
Body: multipart/form-data { file: File }
Processing:
  1. Validate CSV has required columns: company_name, contact_email
  2. Parse with pandas
  3. Upsert rows into contacts table (dedup on contact_email + user_id)
  4. Upload raw CSV to Supabase Storage
  5. Return parsed count + any row errors
Response: { inserted: int, skipped: int, errors: list[RowError] }
```

---

### GitHub

#### Save GitHub Profile
```
POST /github/sync
Auth: Required
Body: { github_username: string }
Processing:
  1. Call GitHub REST API: GET /users/{username}/repos?sort=stars&per_page=6
  2. Extract: name, description, language, stargazers_count, topics
  3. Call Gemini API to generate a 2-3 sentence summary of the developer's profile
  4. Upsert into user_github_profiles
Response: GitHubProfileRecord
```

---

### Email Generation

#### Generate Emails (batch)
```
POST /emails/generate
Auth: Required
Body: { contact_ids: list[uuid] | "all", file_id: uuid (resume) }
Processing:
  1. Fetch contacts for user
  2. Fetch resume parsed_text from files
  3. Fetch GitHub summary from user_github_profiles (if exists)
  4. For each contact, build prompt (see Prompt Template below)
  5. Call Gemini API with structured output
  6. Insert into emails table with status='draft'
  7. Return list of created email records
Response: list[EmailRecord]
Constraints:
  - Max 500 contacts per batch
  - Rate-limited: 10 Gemini API calls/second using asyncio.Semaphore
  - Each call is independent (parallel with semaphore)
```

#### Prompt Template
```
System:
You are a cold email writer helping a software developer land internships and jobs.
Write concise, human, non-cringe cold emails that get replies.
Never use buzzwords like "synergy", "passion", or "leverage".
Output ONLY the email body — no subject line, no greetings beyond "Hi [Name]".

User:
Write a cold email to {contact_email} at {company_name}.
{role if provided: "I am interested in the {role} role."}
About me:
{resume_text (first 800 tokens)}
{github_summary if exists}
{notes if provided}
Keep it under 150 words. End with a clear call to action.
```

#### Regenerate Single Email
```
POST /emails/{email_id}/regenerate
Auth: Required
Body: { notes: string? }  — optional override notes
Processing: Same as single-contact generate flow
Response: EmailRecord (updated)
```

---

### Email Management

```
GET /emails
Auth: Required
Query params: status? (draft|sent|failed), page, page_size (default 50)
Response: Paginated<EmailRecord>

PATCH /emails/{email_id}
Auth: Required
Body: { edited_text: string }
Processing: Update emails.edited_text, do NOT change status
Response: EmailRecord

DELETE /emails/{email_id}
Auth: Required
Processing: Soft delete (set deleted_at) or hard delete
Response: 204 No Content

DELETE /emails/bulk
Auth: Required
Body: { email_ids: list[uuid] }
Response: { deleted: int }
```

---

### Gmail Integration

#### OAuth Connect
```
GET /gmail/connect
Auth: Required
Processing: Redirect to Google OAuth2 consent screen
Scopes: https://www.googleapis.com/auth/gmail.send

GET /gmail/callback
Processing:
  1. Exchange code for tokens
  2. Encrypt and store in user_gmail_tokens
  3. Redirect to frontend with success flag
```

#### Send Single Email
```
POST /emails/{email_id}/send
Auth: Required
Processing:
  1. Check gmail token exists and is valid (refresh if expired)
  2. Use edited_text if exists, else generated_text
  3. Build MIME message
  4. Call Gmail API messages.send
  5. On success: update status='sent', store gmail_message_id, set sent_at
  6. On failure: update status='failed', log error
  7. Dedup check: if gmail_message_id already exists → skip
Response: EmailRecord
```

#### Bulk Send
```
POST /emails/send-bulk
Auth: Required
Body: { email_ids: list[uuid] }
Processing:
  1. For each email_id, queue a send task (BackgroundTasks)
  2. Rate limit: 1 send per 2 seconds to avoid Gmail spam flags
  3. Return immediately with job acknowledgement
Response: { queued: int, job_id: string }
```

---

## 6. Error Handling

All errors follow this shape:
```json
{
  "error": "DESCRIPTIVE_CODE",
  "message": "Human-readable explanation",
  "details": {}
}
```

| HTTP Code | When |
|---|---|
| 400 | Bad input (invalid CSV, missing columns, bad file type) |
| 401 | Missing or invalid JWT |
| 403 | Accessing another user's resource |
| 404 | Resource not found |
| 409 | Duplicate send attempt (gmail_message_id conflict) |
| 422 | Pydantic validation error |
| 429 | Rate limit exceeded |
| 500 | Unhandled server error |
| 502 | Upstream API failure (Gemini API, Gmail, GitHub) |

---

## 7. Security

- All routes require Supabase JWT validation
- Row-Level Security (RLS) enabled on all Supabase tables — users can only access their own rows
- Gmail tokens encrypted at rest using `cryptography.fernet` with server-side key
- File uploads validated: type (PDF/CSV only), size (max 10MB), virus scan optional in V2
- CORS restricted to frontend origin in production
- Environment secrets via `.env` — never committed

---

## 8. Performance Constraints

| Operation | Target |
|---|---|
| Single email generation | < 5s |
| Batch 100 emails | < 60s (parallel w/ semaphore) |
| CSV parse + upsert (500 rows) | < 3s |
| PDF text extraction | < 2s |
| Single email send | < 3s |

---

## 9. Environment Variables

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
GEMINI_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GMAIL_TOKEN_ENCRYPTION_KEY=
FRONTEND_URL=
```

---

## 10. File Structure

```
backend/
├── main.py                  # FastAPI app, CORS, router includes
├── config.py                # Settings via pydantic-settings
├── dependencies.py          # get_current_user, get_db
├── routers/
│   ├── files.py             # /files/*
│   ├── github.py            # /github/*
│   ├── emails.py            # /emails/*
│   └── gmail.py             # /gmail/*
├── services/
│   ├── pdf_parser.py        # pdfplumber extraction
│   ├── csv_parser.py        # pandas CSV validation + parsing
│   ├── github_service.py    # GitHub API calls + summarization
│   ├── email_generator.py   # Gemini APII prompt + generation logic
│   └── gmail_service.py     # Gmail OAuth + send logic
├── models/
│   ├── schemas.py           # Pydantic request/response models
│   └── db_models.py         # SQLAlchemy or raw dict helpers
└── utils/
    ├── encryption.py        # Fernet encrypt/decrypt for tokens
    └── rate_limiter.py      # asyncio semaphore wrapper
```

---

## 11. MVP Scope (What to Build First)

**Phase 1 (Ship this):**
- `POST /files/upload-csv` — parse + store contacts
- `POST /files/upload-pdf` — parse resume text
- `POST /emails/generate` — batch generation with Gemini API
- `GET /emails` — fetch all drafts
- `PATCH /emails/{id}` — edit email text
- `DELETE /emails/{id}` — delete draft
- JWT auth dependency wired to all routes

**Phase 2:**
- `POST /github/sync` — GitHub profile parsing
- `POST /emails/{id}/regenerate` — single regeneration

**Phase 3:**
- `GET /gmail/connect` + callback — OAuth flow
- `POST /emails/{id}/send` — single send
- `POST /emails/send-bulk` — bulk send with rate limiting
