import traceback

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routes import auth_router, core_router, files_router, github_router

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
app.include_router(files_router)
app.include_router(github_router)


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict):
        payload = {"success": False, **detail}
    else:
        payload = {"success": False, "error": str(detail)}
    return JSONResponse(status_code=exc.status_code, content=payload)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    print("ERROR:", str(exc))
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"success": False, "error": str(exc)})
