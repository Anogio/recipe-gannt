# Flow Recipe

A web application that turns recipes into interactive step-by-step cooking checklists.

## Project Structure

- `back/` - Python FastAPI backend
- `front/` - Next.js frontend

## Backend

The backend uses UV for Python dependency management. The virtual environment is located in `back/.venv`.

### Commands (from `back/` directory)

```bash
make install      # Install production dependencies
make install-dev  # Install all dependencies including dev tools
make run          # Start dev server (uvicorn on port 8000)
make format       # Format code with black, isort, and ruff --fix
make lint         # Run ruff linter
make lock         # Update uv.lock file
make test         # Run test suite
make test-cov     # Run tests with coverage report
```

### Database Commands (from `back/` directory)

```bash
make db-up        # Start local PostgreSQL container
make db-down      # Stop PostgreSQL container
make db-logs      # View PostgreSQL container logs
make db-reset     # Reset database (delete data and restart)
make migrate      # Run pending Alembic migrations
make migrate-down # Rollback one migration
make migrate-new  # Create a new migration (prompts for message)
make migrate-history  # Show migration history
```

### Key files

- `main.py` - FastAPI application entry point
- `logic.py` - Core business logic
- `database.py` - Database connection and migration management
- `pyproject.toml` - Dependencies and project config
- `alembic/` - Database migrations
- `.env` - Environment variables (not in git)
- `.env.example` - Example environment variables

### Database Configuration

The backend uses PostgreSQL with SQLAlchemy and Alembic for migrations.

**Environment variables:**
- `DATABASE_URL` - Full database connection string (used in production)
- Or individual components for local development:
  - `DB_HOST` (default: localhost)
  - `DB_PORT` (default: 5432)
  - `DB_USER` (default: postgres)
  - `DB_PASSWORD` (default: postgres)
  - `DB_NAME` (default: recipe_gantt)

On startup, the server automatically:
1. Checks database connectivity
2. Runs any pending Alembic migrations

## Frontend

Next.js 15 TypeScript application in the `front/` directory.

### Commands (from `front/` directory)

```bash
npm install     # Install dependencies
npm run dev     # Start dev server (port 3000)
npm run build   # Production build
npm run lint    # Run ESLint
```

## Development

1. Start database: `cd back && make db-up`
2. Start backend: `cd back && make run`
3. Start frontend: `cd front && npm run dev`
4. Access app at http://localhost:3000

## Deployment

The project is deployed on Railway with:
- `Recipe Back` - FastAPI backend
- `Recipe Front` - Next.js frontend
- `Recipe DB` - PostgreSQL database

Railway auto-deploys on push to master. The backend automatically runs migrations on startup.
