import asyncio
import logging

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.models.schemas import UserContext
from app.services.gemini_service import gemini_service
from app.services.supabase_service import supabase_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/github", tags=["github"])


class GithubConnectRequest(BaseModel):
    access_token: str
    refresh_token: str | None = None


@router.post("/connect")
async def connect_github(
    payload: GithubConnectRequest,
    user: UserContext = Depends(get_current_user),
) -> dict:
    try:
        row = await asyncio.to_thread(
            supabase_service.upsert_user_integration,
            user_id=user.user_id,
            provider="github",
            access_token=payload.access_token,
            refresh_token=payload.refresh_token,
        )
        return {"success": True, "integration": row}
    except Exception as e:
        print("ERROR:", str(e))
        return {
            "success": False,
            "error": str(e),
        }


@router.post("/sync")
async def sync_github_repos(user: UserContext = Depends(get_current_user)) -> dict:
    try:
        user_id = user.user_id
        integration = await asyncio.to_thread(supabase_service.get_user_integration, user_id, "github")
        if not integration or not integration.get("access_token"):
            return {
                "success": False,
                "error": "GitHub not connected",
            }

        github_token = integration["access_token"]

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/user/repos",
                headers={
                    "Authorization": f"Bearer {github_token}",
                    "Accept": "application/vnd.github+json",
                },
                params={"per_page": 30, "sort": "updated", "type": "owner"},
            )
            if response.status_code == 401:
                return {"success": False, "error": "GitHub token expired or invalid"}
            response.raise_for_status()
            repos = response.json()

        if not repos:
            return {"success": True, "projects": [], "count": 0}

        repo_data = []
        for repo in repos:
            if repo.get("fork"):
                continue
            repo_data.append(
                {
                    "name": repo.get("name", ""),
                    "description": repo.get("description") or "",
                    "language": repo.get("language") or "",
                    "topics": repo.get("topics") or [],
                }
            )

        summaries = await asyncio.to_thread(gemini_service.summarize_repos, repo_data)
        projects = []
        for i, repo in enumerate(repo_data):
            languages = [repo["language"]] if repo["language"] else []
            languages.extend(repo.get("topics", []))
            projects.append(
                {
                    "user_id": user_id,
                    "repo_name": repo["name"],
                    "description": repo["description"],
                    "summary": summaries[i] if i < len(summaries) else repo["description"],
                    "languages": languages,
                }
            )

        saved = await asyncio.to_thread(supabase_service.upsert_user_projects, user_id, projects)
        logger.info("[github] synced %d projects for user %s", len(saved), user_id)

        return {"success": True, "projects": saved, "count": len(saved)}
    except Exception as exc:
        logger.error("[github] sync failed: %s", exc)
        print("ERROR:", str(exc))
        return {
            "success": False,
            "error": str(exc),
        }


@router.get("/projects")
async def get_projects(user: UserContext = Depends(get_current_user)) -> dict:
    try:
        projects = await asyncio.to_thread(supabase_service.get_user_projects, user.user_id)
        return {"success": True, "projects": projects}
    except Exception as e:
        print("ERROR:", str(e))
        return {
            "success": False,
            "error": str(e),
        }


@router.delete("/disconnect")
async def disconnect_github(user: UserContext = Depends(get_current_user)) -> dict:
    try:
        await asyncio.to_thread(supabase_service.delete_user_integration, user.user_id, "github")
        return {"success": True}
    except Exception as e:
        print("ERROR:", str(e))
        return {
            "success": False,
            "error": str(e),
        }
