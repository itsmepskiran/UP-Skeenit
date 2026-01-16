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

def ensure_role(request: Request, required_role: str) -> None:
    """
    Ensures the authenticated user has the required role.
    
    Args:
        request: FastAPI request object
        required_role: The role required to access the endpoint
        
    Raises:
        UnauthorizedError: If user is not authenticated
        ForbiddenError: If user doesn't have the required role
    """
    user = getattr(request.state, "user", None)

    if not user:
        logger.warning("Unauthorized: No user found in request")
        raise UnauthorizedError("Authentication required")

    metadata = user.get("user_metadata") or {}
    role = metadata.get("role")

    if not role:
        logger.warning("User metadata missing role")
        raise ForbiddenError("User role not found")

    if role != required_role:
        logger.warning(
            "Insufficient permissions",
            extra={
                "required_role": required_role,
                "user_role": role,
                "request_id": getattr(request.state, "request_id", None)
            }
        )
        raise ForbiddenError("Insufficient permissions")
