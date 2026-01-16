<<<<<<< D:\Official\UP Skeenit\backend\utils_others\security.py
from fastapi import Request
from utils_others.logger import logger
from utils_others.error_handler import UnauthorizedError, ForbiddenError

=======
from fastapi import Request, HTTPException
from typing import Optional, Dict, Any
import jwt
from datetime import datetime
import os
from dotenv import load_dotenv

from utils_others.logger import logger
from utils_others.error_handler import UnauthorizedError, ForbiddenError

# Load environment variables
load_dotenv()

# Get JWT secret from environment variables
JWT_SECRET = os.getenv('SUPABASE_JWT_SECRET')
if not JWT_SECRET:
    raise ValueError("SUPABASE_JWT_SECRET environment variable not set")

def validate_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Validates a Supabase JWT token and returns the decoded user data if valid.
    
    Args:
        token: JWT token from Authorization header
        
    Returns:
        dict: Decoded token payload if valid, None otherwise
        
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        # Decode the token
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Supabase tokens don't include aud claim
        )
        
        # Check if token is expired
        exp = payload.get('exp')
        if exp and datetime.utcnow().timestamp() > exp:
            raise jwt.ExpiredSignatureError("Token has expired")
            
        return payload
        
    except jwt.ExpiredSignatureError:
        logger.warning("Token has expired")
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError as e:
        logger.warning(f"Invalid token: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Error validating token: {str(e)}")
        raise HTTPException(status_code=500, detail="Error validating token")

>>>>>>> c:\Users\Sheetal Paidimarri\.windsurf\worktrees\UP Skeenit\UP Skeenit-1dbe3ff5\backend\utils_others\security.py

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
