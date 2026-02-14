# Recipe Gantt

A web application that generates Gantt charts for recipe preparation.

## Project Structure

- `back/` - Python FastAPI backend
- `front/` - Next.js frontend

## Backend

The backend uses UV for Python dependency management. The virtual environment is located in `back/.venv`.

### Commands (from `back/` directory)

```bash
make install    # Install dependencies (uv sync --all-extras)
make run        # Start dev server (uvicorn on port 8000)
make format     # Format code with black and isort
make lock       # Update uv.lock file
```

### Key files

- `app.py` - FastAPI application entry point
- `logic.py` - Core business logic
- `pyproject.toml` - Dependencies and project config
- `.env` - Environment variables (not in git)

## Frontend

Next.js application in the `front/` directory.

### Commands (from `front/` directory)

```bash
npm install     # Install dependencies
npm run dev     # Start dev server (port 3000)
npm run build   # Production build
```

## Development

1. Start backend: `cd back && make run`
2. Start frontend: `cd front && npm run dev`
3. Access app at http://localhost:3000
