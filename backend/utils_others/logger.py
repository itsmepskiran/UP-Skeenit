import logging
import sys
from logging.handlers import RotatingFileHandler
import os
import json
from datetime import datetime


# ---------------------------------------------------------
# JSON Log Formatter
# ---------------------------------------------------------
class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "environment": os.getenv("ENVIRONMENT", "development"),
            "pid": os.getpid(),
            "thread": record.thread,
        }

        # Request ID (from middleware)
        if hasattr(record, "request_id"):
            log_record["request_id"] = record.request_id

        # Optional request metadata
        if hasattr(record, "request_path"):
            log_record["path"] = record.request_path
        if hasattr(record, "request_method"):
            log_record["method"] = record.request_method

        # Exception details
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_record)


# ---------------------------------------------------------
# Filter to ensure request_id always exists
# ---------------------------------------------------------
class RequestIDFilter(logging.Filter):
    def filter(self, record):
        if not hasattr(record, "request_id"):
            record.request_id = None
        return True


# ---------------------------------------------------------
# Logger Setup
# ---------------------------------------------------------
def setup_logging():
    # Determine absolute log directory
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    log_dir = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "logs"))
    os.makedirs(log_dir, exist_ok=True)

    # Root logger
    logger = logging.getLogger()
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    logger.setLevel(log_level)

    formatter = JSONFormatter()

    # Console handler (Render logs)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(RequestIDFilter())

    # File handler (local + production)
    file_handler = RotatingFileHandler(
        os.path.join(log_dir, "app.log"),
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5
    )
    file_handler.setFormatter(formatter)
    file_handler.addFilter(RequestIDFilter())

    # Avoid duplicate handlers on reload
    if not logger.handlers:
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)

    # Sync Uvicorn + FastAPI logs
    for name in ["uvicorn", "uvicorn.error", "fastapi"]:
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers = logger.handlers
        uvicorn_logger.setLevel(logger.level)
        uvicorn_logger.propagate = False

    return logger


# Global logger instance
logger = setup_logging()
