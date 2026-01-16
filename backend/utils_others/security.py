from fastapi import Request
from utils_others.logger import logger
from utils_others.error_handler import UnauthorizedError, ForbiddenError


def ensure_role(request: Request, required_role: str) -> None:
    """
    Ensures the authenticated user (from AuthMiddleware)
    has the required role.
    Raises:
        UnauthorizedError – if no user is attached to request.state
        ForbiddenError – if user role does not match required_role
    """

    user = getattr(request.state, "user", None)

    if not user:
        logger.error(
            "Missing user in request.state",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )
        raise UnauthorizedError("Authentication required")

    metadata = user.get("user_metadata") or {}
    role = metadata.get("role")

    if not role:
        logger.error(
            "User metadata missing role",
            extra={"request_id": getattr(request.state, "request_id", None)}
        )
        raise ForbiddenError("User role missing")

    if role != required_role:
        logger.warning(
            "Role mismatch",
            extra={
                "required_role": required_role,
                "actual_role": role,
                "request_id": getattr(request.state, "request_id", None)
            }
        )
        raise ForbiddenError("Insufficient role permissions")
