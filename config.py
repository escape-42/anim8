import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Central configuration. Every value can be overridden via env vars."""

    SECRET_KEY = os.getenv("SECRET_KEY", "dev-fallback-change-me")
    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    DEBUG = os.getenv("FLASK_DEBUG", "0") == "1"

    # File handling
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 16 * 1024 * 1024))
    ALLOWED_EXTENSIONS = set(
        os.getenv("ALLOWED_EXTENSIONS", "png,jpg,jpeg,webp,bmp,gif").split(",")
    )

    # GIF constraints
    MAX_IMAGES = int(os.getenv("MAX_IMAGES", 8))
    MAX_DRAW_FRAMES = int(os.getenv("MAX_DRAW_FRAMES", 50))
    MIN_IMAGES = int(os.getenv("MIN_IMAGES", 2))
    DEFAULT_FRAME_DURATION = int(os.getenv("DEFAULT_FRAME_DURATION", 500))

    # Security
    RATE_LIMIT = os.getenv("RATE_LIMIT", "20/minute")

    # Server
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 7222))
