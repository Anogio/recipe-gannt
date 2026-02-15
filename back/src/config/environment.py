"""Environment configuration and secrets."""

import os

import dotenv

dotenv.load_dotenv()


def get_openai_api_key() -> str:
    """Return OPENAI_API_KEY or raise a descriptive error."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY environment variable is required")
    return api_key
