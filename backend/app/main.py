from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import auth_router, core_router

settings = get_settings()

app = FastAPI(title="Coldstart Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(core_router)
app.include_router(auth_router)
