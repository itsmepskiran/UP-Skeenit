from typing import List
from utils_others.logger import logger
from utils_others.error_handler import UnauthorizedError, ForbiddenError
from utils_others.rbac_config import ROLES


# ---------------------------------------------------------
# GET ALL PERMISSIONS FOR A ROLE (INCLUDING INHERITED)
# ---------------------------------------------------------
def get_permissions_for_role(role: str) -> List[str]:
    if role not in ROLES:
        return []

    role_info = ROLES[role]
    perms = set(role_info["permissions"])

    # Add inherited permissions
    for parent in role_info["inherits"]:
        perms.update(get_permissions_for_role(parent))

    return list(perms)


# ---------------------------------------------------------
# CHECK IF ROLE HAS A SPECIFIC PERMISSION
# ---------------------------------------------------------
def role_has_permission(role: str, permission: str) -> bool:
    return permission in get_permissions_for_role(role)


# ---------------------------------------------------------
# ENSURE USER HAS REQUIRED ROLE
# ---------------------------------------------------------
def ensure_role(request, allowed_roles: List[str]) -> None:
    user = getattr(request.state, "user", None)

    if not user:
        raise UnauthorizedError("Authentication required")

    role = user.get("user_metadata", {}).get("role")

    if not role:
        raise ForbiddenError("User role missing")

    if role not in allowed_roles:
        logger.warning(
            "Role mismatch",
            extra={
                "required_roles": allowed_roles,
                "actual_role": role,
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        raise ForbiddenError("Insufficient role permissions")


# ---------------------------------------------------------
# ENSURE USER HAS REQUIRED PERMISSION
# ---------------------------------------------------------
def ensure_permission(request, permission: str) -> None:
    user = getattr(request.state, "user", None)

    if not user:
        raise UnauthorizedError("Authentication required")

    role = user.get("user_metadata", {}).get("role")

    if not role:
        raise ForbiddenError("User role missing")

    if not role_has_permission(role, permission):
        logger.warning(
            "Permission denied",
            extra={
                "required_permission": permission,
                "role": role,
                "request_id": getattr(request.state, "request_id", None),
            },
        )
        raise ForbiddenError("Insufficient permissions")
