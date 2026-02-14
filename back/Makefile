run:
	uv run uvicorn app:app --reload

format:
	uv run black . && uv run isort .

install:
	uv sync --all-extras

lock:
	uv lock
