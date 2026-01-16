import os
from supabase import create_client, Client
from utils_others.logger import logger

_supabase_client: Client | None = None


def get_client() -> Client:
    """
    Returns a singleton Supabase client.
    Ensures credentials exist and logs failures clearly.
    """
    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        logger.error("Supabase credentials missing", extra={
            "SUPABASE_URL": bool(supabase_url),
            "SUPABASE_SERVICE_ROLE_KEY": bool(supabase_key)
        })
        raise RuntimeError("Supabase credentials are not set in environment variables.")

    try:
        _supabase_client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized successfully")
        return _supabase_client

    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        raise RuntimeError("Failed to initialize Supabase client")
