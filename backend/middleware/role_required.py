from functools import wraps
from fastapi import Request, HTTPException
from utils_others.logger import logger

def require_role(required_role: str):
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            user = getattr(request.state, "user", None)

            if not user:
                logger.error("Missing user in request.state", extra={"request_id": request.state.request_id})
                raise HTTPException(status_code=401, detail="Authentication required")

            role = user.get("user_metadata", {}).get("role")

            if role != required_role:
                logger.warning(
                    f"Forbidden: required={required_role}, actual={role}",
                    extra={"request_id": request.state.request_id}
                )
                raise HTTPException(status_code=403, detail="Forbidden: insufficient role")

            return await func(request, *args, **kwargs)
        return wrapper
    return decorator
