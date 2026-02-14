run:
	uv run uvicorn app:app --reload

format:
	uv run black . && uv run isort .

install:
	uv sync --all-extras

lock:
	uv lock

test:
	uv run pytest -v

test-cov:
	uv run pytest -v --cov=. --cov-report=term-missing
