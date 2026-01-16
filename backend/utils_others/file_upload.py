from typing import Optional
from supabase import Client
from utils_others.logger import logger


def upload_to_bucket(
    client: Client,
    bucket: str,
    path: str,
    content: bytes,
    content_type: Optional[str] = None
) -> str:
    """
    Uploads content to a Supabase Storage bucket.
    Returns the uploaded file path.
    Raises RuntimeError on failure.
    """
    try:
        response = (
            client.storage
            .from_(bucket)
            .upload(path, content, content_type or "application/octet-stream")
        )

        # Supabase Python client is inconsistent: may return object or dict
        error = getattr(response, "error", None)
        if not error and isinstance(response, dict):
            error = response.get("error")

        if error:
            raise RuntimeError(error)

        logger.info(
            "File uploaded to bucket",
            extra={"bucket": bucket, "path": path}
        )

        return path

    except Exception as e:
        logger.error(
            f"Upload to bucket failed: {str(e)}",
            extra={"bucket": bucket, "path": path}
        )
        raise RuntimeError("Failed to upload file to storage")


def create_signed_url(
    client: Client,
    bucket: str,
    path: str,
    expire_seconds: int = 3600
) -> str:
    """
    Generates a signed URL for accessing a file in a Supabase bucket.
    Raises RuntimeError on failure.
    """
    try:
        response = (
            client.storage
            .from_(bucket)
            .create_signed_url(path, expire_seconds)
        )

        # Supabase returns {"signedURL": "..."} or object.signedURL
        if isinstance(response, dict):
            url = response.get("signedURL")
        else:
            url = getattr(response, "signedURL", None)

        if not url:
            raise RuntimeError("Signed URL missing")

        logger.info(
            "Signed URL created",
            extra={"bucket": bucket, "path": path}
        )

        return url

    except Exception as e:
        logger.error(
            f"Signed URL creation failed: {str(e)}",
            extra={"bucket": bucket, "path": path}
        )
        raise RuntimeError("Failed to create signed URL")
