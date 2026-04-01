import asyncio
import logging
import time

from fastapi import APIRouter, Depends, File, Header, UploadFile

from app.dependencies import get_current_user
from app.models.schemas import UserContext
from app.services.supabase_service import supabase_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["files"])

ALLOWED_EXTENSIONS = {".csv", ".pdf"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _get_extension(filename: str) -> str:
    return "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


def _get_file_type(extension: str) -> str:
    return "csv" if extension == ".csv" else "pdf"


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    authorization: str | None = Header(default=None),
) -> dict:
    try:
        if not authorization or not authorization.lower().startswith("bearer "):
            return {"success": False, "error": "Missing or invalid Authorization header"}

        token = authorization.split(" ", 1)[1].strip()
        user = await asyncio.to_thread(supabase_service.validate_user_token, token)
        user_id = user.user_id

        filename = (file.filename or "").strip()
        logger.info("[upload] user_id=%s filename=%s content_type=%s", user_id, filename, file.content_type)
        print(f"[upload] user_id={user_id}")
        print(f"[upload] file_name={filename}")

        if not filename:
            return {"success": False, "error": "Filename is required"}

        ext = _get_extension(filename)
        if ext not in ALLOWED_EXTENSIONS:
            logger.warning("[upload] rejected file type: %s (user=%s)", ext, user_id)
            return {"success": False, "error": f"Only .csv and .pdf files are allowed, got {ext}"}

        raw = await file.read()
        if len(raw) == 0:
            return {"success": False, "error": "File is empty"}

        if len(raw) > MAX_FILE_SIZE:
            return {"success": False, "error": f"File exceeds 10 MB limit ({len(raw)} bytes)"}

        is_duplicate = await asyncio.to_thread(supabase_service.check_duplicate_file, user_id, filename)
        if is_duplicate:
            logger.warning("[upload] duplicate file: %s (user=%s)", filename, user_id)
            return {"success": False, "error": "File already exists"}

        file_type = _get_file_type(ext)
        storage_path = f"{user_id}/{int(time.time())}_{filename}"
        content_type = "text/csv" if ext == ".csv" else "application/pdf"

        upload_result = await asyncio.to_thread(
            supabase_service.upload_to_storage,
            bucket="user-files",
            path=storage_path,
            file_bytes=raw,
            content_type=content_type,
        )
        logger.info("[upload] storage response: %s", upload_result)
        print(f"[upload] upload_result={upload_result}")

        db_row = await asyncio.to_thread(
            supabase_service.insert_user_file,
            user_id=user_id,
            file_name=filename,
            file_type=file_type,
            storage_path=storage_path,
        )
        logger.info("[upload] metadata saved: user=%s path=%s", user_id, storage_path)
        print(f"[upload] db_insert_result={db_row}")

        return {"success": True, "path": storage_path, "file": db_row}
    except Exception as e:
        print("ERROR:", str(e))
        return {
            "success": False,
            "error": str(e),
        }


@router.get("/list")
async def list_files(user: UserContext = Depends(get_current_user)) -> dict:
    try:
        files = await asyncio.to_thread(supabase_service.get_user_files, user.user_id)
        return {"success": True, "files": files}
    except Exception as e:
        print("ERROR:", str(e))
        return {
            "success": False,
            "error": str(e),
        }
