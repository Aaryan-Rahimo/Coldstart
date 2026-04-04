import asyncio
import base64
import logging
import traceback

import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.dependencies import get_current_user
from app.models.schemas import UserContext
from app.services.supabase_service import supabase_service

try:
    import google.generativeai as genai
    from app.config import get_settings
    genai.configure(api_key=get_settings().gemini_api_key)
    GEMINI_AVAILABLE = True
except Exception:
    GEMINI_AVAILABLE = False

router = APIRouter(prefix="/github", tags=["github"])
logger = logging.getLogger("coldstart.github")

MAX_REPOS = 100
GH_API = "https://api.github.com"


def _gh_headers(token: str) -> dict:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
    }


# ── Fetch README content for a repo ──────────────────────────
async def fetch_readme(
    client: httpx.AsyncClient, owner: str, repo: str, token: str
) -> str | None:
    """Fetch and decode a repo's README. Returns plain text or None."""
    try:
        res = await client.get(
            f"{GH_API}/repos/{owner}/{repo}/readme",
            headers=_gh_headers(token),
        )
        if res.status_code != 200:
            return None
        data = res.json()
        content = data.get("content", "")
        if not content:
            return None
        decoded = base64.b64decode(content).decode("utf-8", errors="replace")
        # Truncate to ~4000 chars to keep Gemini prompts reasonable
        return decoded[:4000]
    except Exception as e:
        logger.debug(f"  README fetch failed for {owner}/{repo}: {e}")
        return None


# ── Fetch top 3 languages for a repo ─────────────────────────
async def fetch_languages(
    client: httpx.AsyncClient, owner: str, repo: str, token: str
) -> list[str]:
    """Fetch the languages breakdown and return the top 3 by bytes."""
    try:
        res = await client.get(
            f"{GH_API}/repos/{owner}/{repo}/languages",
            headers=_gh_headers(token),
        )
        if res.status_code != 200:
            return []
        lang_data: dict[str, int] = res.json()
        if not lang_data:
            return []
        sorted_langs = sorted(lang_data.items(), key=lambda x: x[1], reverse=True)
        return [lang for lang, _ in sorted_langs[:3]]
    except Exception as e:
        logger.debug(f"  Languages fetch failed for {owner}/{repo}: {e}")
        return []


# ── Generate Gemini summary from README ──────────────────────
async def generate_summary(
    repo_name: str, readme: str | None, description: str, languages: list[str]
) -> str:
    """Generate a one-sentence professional summary using README content."""
    lang_str = ", ".join(languages) if languages else "unknown technologies"

    # Build the best available context
    if readme and readme.strip():
        context = readme
    elif description and description.strip():
        context = description
    else:
        # No README, no description — use a simple fallback
        return f"A software project built using {lang_str}."

    if not GEMINI_AVAILABLE:
        # No Gemini — return description or a fallback
        if description and description.strip():
            return description
        return f"A software project built using {lang_str}."

    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        prompt = (
            "Summarize this GitHub project in 1-2 concise, professional sentences. "
            "Focus on what the project does and the key technologies used.\n\n"
            f"{context}"
        )
        response = await asyncio.to_thread(model.generate_content, prompt)
        text = response.text.strip()
        return text if text else (description or f"A software project built using {lang_str}.")
    except Exception as e:
        logger.warning(f"  Gemini summary failed for {repo_name}: {e}")
        if description and description.strip():
            return description
        return f"A software project built using {lang_str}."


# ── POST /github/sync ────────────────────────────────────────
@router.post("/sync")
async def sync_github(user: UserContext = Depends(get_current_user)):
    user_id = user.user_id
    logger.info(f"=== GITHUB SYNC START === user_id={user_id}")

    try:
        # ── Get GitHub token ─────────────────────────────────
        integration = await asyncio.to_thread(
            supabase_service.get_user_integration, user_id, "github"
        )

        logger.info(f"  integration exists: {integration is not None}")
        if integration:
            logger.info(f"  access_token: {str(integration.get('access_token', ''))[:15]}...")

        github_token = None
        if integration:
            token = integration.get("access_token", "")
            if token and token != "linked_via_supabase":
                github_token = token
                logger.info(f"  ✓ Token from user_integrations")
            else:
                logger.info(f"  ✗ Token is placeholder: '{token}'")

        # Fallback: Supabase identity data
        if not github_token:
            logger.info("  Trying identity fallback...")
            try:
                identity_token = await asyncio.to_thread(
                    supabase_service.get_github_token_from_identity, user_id
                )
                if identity_token:
                    github_token = identity_token
                    logger.info("  ✓ Token from identity")
                    await asyncio.to_thread(
                        supabase_service.upsert_user_integration,
                        user_id=user_id,
                        provider="github",
                        access_token=github_token,
                        refresh_token=None,
                    )
                else:
                    logger.info("  ✗ No token in identities")
            except Exception as e:
                logger.warning(f"  Identity lookup failed: {e}")

        if not github_token:
            logger.warning(f"  ABORT: No GitHub token for user {user_id}")
            return JSONResponse(
                status_code=200,
                content={
                    "success": False,
                    "error": "GitHub not connected. Please go to Settings, disconnect GitHub, then reconnect it.",
                },
            )

        # ── Fetch repos ──────────────────────────────────────
        logger.info(f"  Fetching repos (max {MAX_REPOS})...")

        async with httpx.AsyncClient(timeout=30.0) as client:
            gh_response = await client.get(
                f"{GH_API}/user/repos",
                headers=_gh_headers(github_token),
                params={"sort": "updated", "per_page": MAX_REPOS, "type": "owner"},
            )

            if gh_response.status_code == 401:
                logger.error("  GitHub API 401 — clearing token")
                await asyncio.to_thread(
                    supabase_service.delete_user_integration, user_id, "github"
                )
                return JSONResponse(
                    status_code=200,
                    content={"success": False, "error": "GitHub token expired. Please reconnect GitHub."},
                )

            if gh_response.status_code != 200:
                logger.error(f"  GitHub API {gh_response.status_code}: {gh_response.text[:300]}")
                return JSONResponse(
                    status_code=200,
                    content={"success": False, "error": f"GitHub API error ({gh_response.status_code})."},
                )

            repos = gh_response.json()
            logger.info(f"  Fetched {len(repos)} repos")

            if not repos:
                return JSONResponse(
                    status_code=200,
                    content={"success": True, "projects": [], "message": "No repositories found"},
                )

            logger.info(f"  First repo: {repos[0].get('name', '?')}")

            # ── Process each repo ────────────────────────────
            projects = []
            saved_count = 0
            readme_ok = 0
            readme_fail = 0
            gemini_ok = 0

            for repo in repos[:MAX_REPOS]:
                repo_name = repo.get("name", "")
                full_name = repo.get("full_name", "")
                owner = full_name.split("/")[0] if "/" in full_name else ""
                description = repo.get("description") or ""
                stars = repo.get("stargazers_count", 0)
                github_url = repo.get("html_url", "")
                primary_language = repo.get("language") or ""

                # STEP 5: Fetch top 3 languages from GitHub API
                top_languages = await fetch_languages(client, owner, repo_name, github_token)
                if not top_languages and primary_language:
                    top_languages = [primary_language]

                # STEP 3: Fetch README
                readme_content = await fetch_readme(client, owner, repo_name, github_token)
                if readme_content:
                    readme_ok += 1
                else:
                    readme_fail += 1

                # STEP 4: Generate Gemini summary from README
                summary = await generate_summary(repo_name, readme_content, description, top_languages)
                if summary and summary != description:
                    gemini_ok += 1

                project = {
                    "repo_name": repo_name,
                    "description": description,
                    "summary": summary,
                    "language": primary_language,
                    "languages": top_languages,
                    "stars": stars,
                    "github_url": github_url,
                }

                # STEP 1: UPSERT into user_projects
                try:
                    await asyncio.to_thread(
                        supabase_service.upsert_user_project, user_id, project
                    )
                    saved_count += 1
                except Exception as e:
                    logger.warning(f"  Failed to upsert {repo_name}: {e}")

                projects.append(project)

        # ── STEP 8: Debug summary ────────────────────────────
        logger.info(f"  === GITHUB SYNC DONE ===")
        logger.info(f"  repos fetched:   {len(repos)}")
        logger.info(f"  projects saved:  {saved_count}/{len(projects)}")
        logger.info(f"  README success:  {readme_ok}")
        logger.info(f"  README failed:   {readme_fail}")
        logger.info(f"  Gemini summaries:{gemini_ok}")

        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "count": len(projects),
                "projects": projects,
            },
        )

    except Exception as e:
        logger.error(f"GitHub sync CRASH: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Unexpected error: {str(e)}"},
        )


# ── GET /github/projects ─────────────────────────────────────
@router.get("/projects")
async def get_projects(user: UserContext = Depends(get_current_user)):
    """Load persisted projects from user_projects table (used on page load)."""
    logger.info(f"Get projects — user: {user.user_id}")
    try:
        projects = await asyncio.to_thread(
            supabase_service.list_user_projects, user.user_id
        )
        return JSONResponse(
            status_code=200,
            content={"success": True, "projects": projects},
        )
    except Exception as e:
        logger.error(f"Get projects error: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)},
        )
