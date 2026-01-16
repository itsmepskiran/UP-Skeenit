from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from utils_others.logger import logger


# ---------------------------------------------------------
# BASE APPLICATION ERRORS
# ---------------------------------------------------------
class AppError(Exception):
    """
    Base class for all custom application errors.
    """
    def __init__(self, message: str, status_code: int = 400, code: str = "app_error"):
        self.status_code = status_code
        self.code = code
        self.message = message


class NotFoundError(AppError):
    def __init__(self, message: str = "Not found"):
        super().__init__(message, status_code=404, code="not_found")


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, status_code=401, code="unauthorized")


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, status_code=403, code="forbidden")


class ValidationError(AppError):
    def __init__(self, message: str = "Validation error"):
        super().__init__(message, status_code=422, code="validation_error")


# ---------------------------------------------------------
# REGISTER GLOBAL EXCEPTION HANDLERS
# ---------------------------------------------------------
def register_exception_handlers(app: FastAPI) -> None:
    """
    Registers global exception handlers for:
    - Custom AppError
    - FastAPI validation errors
    - Unexpected server errors
    """

    # -----------------------------
    # Custom application errors
    # -----------------------------
    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError):
        logger.error(
            f"AppError: {exc.code} - {exc.message}",
            extra={"path": request.url.path, "method": request.method}
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "ok": False,
                "error": exc.code,
                "message": exc.message,
            }
        )

    # -----------------------------
    # FastAPI validation errors
    # -----------------------------
    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        logger.error(
            "Request validation failed",
            extra={"errors": exc.errors(), "path": request.url.path}
        )
        return JSONResponse(
            status_code=422,
            content={
                "ok": False,
                "error": "validation_error",
                "message": exc.errors(),
            }
        )

    # -----------------------------
    # Unexpected server errors
    # -----------------------------
    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception):
        logger.exception(
            "Unexpected server error",
            extra={"path": request.url.path, "method": request.method}
        )
        return JSONResponse(
            status_code=500,
            content={
                "ok": False,
                "error": "server_error",
                "message": "Internal server error",
            }
        )
