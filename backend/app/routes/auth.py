import asyncio

from fastapi import APIRouter, Depends, HTTPException, Query
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
    row = await asyncio.to_thread(supabase_service.get_gmail_tokens, user.user_id)
    return {"connected": bool(row)}


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
        raise HTTPException(
            status_code=400,
            detail={
                "error": "GOOGLE_OAUTH_FAILED",
                "message": "Failed to complete Gmail OAuth callback",
                "details": {"reason": str(exc)},
            },
        ) from exc
