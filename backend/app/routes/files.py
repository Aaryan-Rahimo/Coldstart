import asyncio
import logging
import os
import traceback

from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import JSONResponse

from app.dependencies import get_current_user
from app.models.schemas import UserContext
from app.services.supabase_service import supabase_service

router = APIRouter(prefix="/files", tags=["files"])
logger = logging.getLogger("coldstart.files")

ALLOWED_EXTENSIONS = {
    ".csv": "text/csv",
    ".pdf": "application/pdf",
}
BUCKET = "user-files"


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    user: UserContext = Depends(get_current_user),
):
    logger.info(f"=== UPLOAD REQUEST === user={user.user_id} file={file.filename}")

    try:
        # Validate filename
        if not file or not file.filename:
            logger.warning("No file provided")
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "No file provided"}
            )

        filename = file.filename
        ext = os.path.splitext(filename)[1].lower()
        logger.info(f"File extension: {ext}")

        if ext not in ALLOWED_EXTENSIONS:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": f"File type '{ext}' not allowed. Only .csv and .pdf files accepted."}
            )

        content_type = ALLOWED_EXTENSIONS[ext]
        file_type = "csv" if ext == ".csv" else "pdf"
        user_id = user.user_id
        storage_path = f"{user_id}/{filename}"

        # Read file bytes
        try:
            content = await file.read()
            logger.info(f"Read {len(content)} bytes")
        except Exception as e:
            logger.error(f"Failed to read file: {traceback.format_exc()}")
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": f"Failed to read file content: {str(e)}"}
            )

        if len(content) == 0:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "File is empty"}
            )

        # Check for duplicate
        try:
            exists = await asyncio.to_thread(
                supabase_service.check_file_exists, user_id, filename
            )
            if exists:
                logger.info(f"Duplicate file: {filename}")
                return JSONResponse(
                    status_code=409,
                    content={"success": False, "error": f"'{filename}' already uploaded. Delete it first to replace."}
                )
        except Exception as e:
            logger.warning(f"Duplicate check failed (continuing): {e}")

        # Upload to Supabase Storage
        logger.info(f"Uploading to bucket='{BUCKET}' path='{storage_path}'")
        try:
            await asyncio.to_thread(
                supabase_service.upload_file_to_storage,
                BUCKET, storage_path, content, content_type
            )
            logger.info("Storage upload successful")
        except Exception as e:
            err = str(e)
            logger.error(f"Storage upload failed: {traceback.format_exc()}")
            if "already exists" in err.lower():
                return JSONResponse(
                    status_code=409,
                    content={"success": False, "error": "File already exists in storage."}
                )
            return JSONResponse(
                status_code=500,
                content={"success": False, "error": f"Storage upload failed: {err}"}
            )

        # Save metadata to user_files table
        logger.info("Inserting into user_files table")
        try:
            await asyncio.to_thread(
                supabase_service.insert_user_file,
                user_id, filename, file_type, storage_path
            )
            logger.info("DB insert successful")
        except Exception as e:
            logger.error(f"DB insert failed: {traceback.format_exc()}")
            return JSONResponse(
                status_code=500,
                content={"success": False, "error": f"File uploaded but metadata save failed: {str(e)}"}
            )

        logger.info(f"Upload complete: {filename}")
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "file_name": filename,
                "file_type": file_type,
                "storage_path": storage_path,
                "bucket": BUCKET,
            }
        )

    except Exception as e:
        logger.error(f"Unexpected upload error: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": f"Unexpected server error: {str(e)}"}
        )


@router.get("/list")
async def list_files(user: UserContext = Depends(get_current_user)):
    logger.info(f"List files — user={user.user_id}")
    try:
        files = await asyncio.to_thread(
            supabase_service.list_user_files, user.user_id
        )
        logger.info(f"Returning {len(files)} files")
        return JSONResponse(
            status_code=200,
            content={"success": True, "files": files}
        )
    except Exception as e:
        logger.error(f"List files error: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )


@router.delete("/{file_id}")
async def delete_file(file_id: str, user: UserContext = Depends(get_current_user)):
    logger.info(f"Delete file — user={user.user_id} file_id={file_id}")
    try:
        record = await asyncio.to_thread(
            supabase_service.get_user_file_by_id, file_id, user.user_id
        )
        if not record:
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "File not found"}
            )

        try:
            await asyncio.to_thread(
                supabase_service.delete_file_from_storage,
                BUCKET, record.get("storage_path", "")
            )
        except Exception as e:
            logger.warning(f"Storage delete failed (continuing): {e}")

        await asyncio.to_thread(
            supabase_service.delete_user_file, file_id, user.user_id
        )
        return JSONResponse(status_code=200, content={"success": True})

    except Exception as e:
        logger.error(f"Delete error: {traceback.format_exc()}")
        return JSONResponse(
            status_code=500,
            content={"success": False, "error": str(e)}
        )
