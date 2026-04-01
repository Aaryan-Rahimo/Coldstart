import asyncio

from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse

from app.dependencies import get_current_user
from app.models.schemas import UserContext
from app.services.gmail_service import gmail_service
from app.services.supabase_service import supabase_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google")
async def start_google_oauth(user: UserContext = Depends(get_current_user)) -> RedirectResponse:
    auth_url = await asyncio.to_thread(gmail_service.get_auth_url, user.user_id)
    return RedirectResponse(url=auth_url)


@router.get("/status")
async def gmail_connection_status(user: UserContext = Depends(get_current_user)) -> dict[str, bool]:
    try:
        row = await asyncio.to_thread(supabase_service.get_user_integration, user.user_id, "google")
        return {"success": True, "connected": bool(row)}
    except Exception as e:
        print("ERROR:", str(e))
        return {
            "success": False,
            "error": str(e),
        }

@router.delete("/google")
async def disconnect_google(user: UserContext = Depends(get_current_user)) -> dict[str, bool]:
    await asyncio.to_thread(supabase_service.delete_gmail_tokens, user.user_id)
    await asyncio.to_thread(supabase_service.delete_user_integration, user.user_id, "google")
    return {"success": True}


@router.get("/me")
async def auth_me(user: UserContext = Depends(get_current_user)) -> dict:
    try:
        user_id = user.user_id
        integrations = await asyncio.to_thread(supabase_service.list_user_integrations, user_id)
        providers = {row.get("provider") for row in integrations}

        return {
            "success": True,
            "user_id": user_id,
            "email": user.email,
            "has_github": "github" in providers,
            "has_google": "google" in providers,
        }
    except Exception as e:
        print("ERROR:", str(e))
        return {
            "success": False,
            "error": str(e),
        }


@router.get("/callback")
async def google_oauth_callback(
    code: str = Query(...),
    state: str = Query(..., description="Signed state token from OAuth initiation"),
) -> RedirectResponse:
    try:
        user_id = await asyncio.to_thread(gmail_service.decode_state, state)
        token_payload = await asyncio.to_thread(gmail_service.exchange_code, code)
        await asyncio.to_thread(gmail_service.store_user_tokens, user_id, token_payload)
        return RedirectResponse(gmail_service.callback_redirect_url(True, "Gmail connected"))
    except Exception as exc:
        return RedirectResponse(gmail_service.callback_redirect_url(False, f"Google OAuth failed: {str(exc)}"))
