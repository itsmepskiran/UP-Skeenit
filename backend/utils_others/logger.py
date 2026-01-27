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

        # Request metadata (middleware attaches these)
        for field in ["request_id", "request_path", "request_method", "user_id", "role", "ip"]:
            if hasattr(record, field):
                log_record[field] = getattr(record, field)

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
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    log_dir = os.path.abspath(os.path.join(BASE_DIR, "..", "..", "logs"))
    os.makedirs(log_dir, exist_ok=True)

    logger = logging.getLogger()
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    logger.setLevel(log_level)

    formatter = JSONFormatter()

    # Remove existing handlers (Uvicorn adds its own)
    for handler in list(logger.handlers):
        logger.removeHandler(handler)

    # Console handler (always enabled)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(RequestIDFilter())
    logger.addHandler(console_handler)

    # File handler (only for local/dev)
    if os.getenv("ENVIRONMENT", "development") != "production":
        file_handler = RotatingFileHandler(
            os.path.join(log_dir, "app.log"),
            maxBytes=10 * 1024 * 1024,
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        file_handler.addFilter(RequestIDFilter())
        logger.addHandler(file_handler)

    # Sync Uvicorn + FastAPI logs
    for name in ["uvicorn", "uvicorn.error", "fastapi"]:
        uvicorn_logger = logging.getLogger(name)
        uvicorn_logger.handlers = logger.handlers
        uvicorn_logger.setLevel(logger.level)
        uvicorn_logger.propagate = False

    return logger


logger = setup_logging()
