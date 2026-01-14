from typing import Optional
from supabase import Client

def upload_to_bucket(
    client: Client,
    bucket: str,
    path: str,
    content: bytes,
    content_type: Optional[str] = None
) -> str:
    """
    Uploads content to a specified Supabase Storage bucket.
    Returns the uploaded file path.
    """
    up = client.storage.from_(bucket).upload(
        path,
        content,
        content_type or "application/octet-stream"
    )

    # Handle both object-style and dict-style responses
    error = getattr(up, "error", None)
    if not error and isinstance(up, dict):
        error = up.get("error")

    if error:
        raise Exception(f"Upload error: {error}")

    return path


def create_signed_url(
    client: Client,
    bucket: str,
    path: str,
    expire_seconds: int = 3600
) -> str:
    """
    Generates a signed URL for accessing content in a Supabase bucket.
    """
    su = client.storage.from_(bucket).create_signed_url(path, expire_seconds)

    # Supabase returns {"signedURL": "..."}
    if isinstance(su, dict):
        url = su.get("signedURL")
    else:
        url = getattr(su, "signedURL", None)

    if not url:
        raise Exception("Failed to create signed URL")

    return url
