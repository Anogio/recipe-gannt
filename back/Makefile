run:
	uv run uvicorn src.app:app --reload

format:
	uv run black . && uv run isort . && uv run ruff check --fix .

lint:
	uv run ruff check .

install:
	uv sync

install-dev:
	uv sync --all-extras

lock:
	uv lock

test:
	uv run pytest -v

test-cov:
	uv run pytest -v --cov=src --cov-report=term-missing

# Database commands
db-up:
	docker compose up -d

db-down:
	docker compose down

db-logs:
	docker compose logs -f db

db-reset:
	docker compose down -v && docker compose up -d

# Alembic migration commands
migrate:
	uv run alembic upgrade head

migrate-down:
	uv run alembic downgrade -1

migrate-new:
	@read -p "Migration message: " msg; uv run alembic revision --autogenerate -m "$$msg"

migrate-history:
	uv run alembic history
