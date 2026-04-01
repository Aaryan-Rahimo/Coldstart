from app.routes.auth import router as auth_router
from app.routes.core import router as core_router
from app.routes.files import router as files_router
from app.routes.github import router as github_router

__all__ = ["auth_router", "core_router", "files_router", "github_router"]
