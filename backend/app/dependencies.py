import asyncio

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.models.schemas import UserContext
from app.services.supabase_service import supabase_service

security = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserContext:
    token = credentials.credentials
    try:
        return await asyncio.to_thread(supabase_service.validate_user_token, token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "error": "INVALID_AUTH_TOKEN",
                "message": "Invalid or expired authentication token",
                "details": {"reason": str(exc)},
            },
        ) from exc
