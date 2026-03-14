# Flow Recipe

Web app that turns recipe URLs into step-by-step cooking checklists and a simple dependency graph.

## Copy rules

- Any new or modified user-facing copy must be updated in all supported languages.
- `Flow Recipe` is the product name and must never be translated.

## Repo layout

- `back/`: FastAPI backend, SQLAlchemy models, Alembic migrations, pytest suite
- `front/`: Next.js 15 frontend, TypeScript, Jest tests

## Backend

The backend lives in `back/` and uses `uv`. The virtualenv is `back/.venv`.

Important runtime behavior:
- `src/app.py` defines the FastAPI app and imports the search, graph, DB, and rate-limit stack at import time.
- On startup, the lifespan hook checks database connectivity and runs pending Alembic migrations.
- `make run` starts `uvicorn` with `--reload`, so local dev runs a reloader parent process plus a worker process.

Useful commands from `back/`:

```bash
make install
make install-dev
make run
make format
make lint
make test
make test-cov
make db-up
make db-down
make migrate
make migrate-history
```

Key backend files:
- `src/app.py`: API routes, CORS, rate limiting, app lifespan
- `src/db/database.py`: engine/session setup, DB connectivity check, migration runner
- `src/db/repository.py`: recipe history persistence and cache lookups
- `src/services/search.py`: DuckDuckGo search flow
- `src/services/scraping.py`: URL fetch/accessibility filtering
- `src/services/ai_service.py`: OpenAI calls and recipe extraction
- `src/services/graph.py`: graph parsing and step planning

Environment:
- `OPENAI_API_KEY` is required for AI-backed recipe processing
- DB config comes from `DATABASE_URL` or `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME`

## Frontend

The frontend lives in `front/` and uses Next.js 15 with Turbopack in dev.

Useful commands from `front/`:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
npm run test:coverage
```

Key frontend files:
- `src/app/page.tsx`: main user flow
- `src/components/`: search, checklist, graph, and timer UI
- `src/services/api.ts`: backend API client
- `src/hooks/`: recipe and timer state

Frontend API configuration:
- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`
- Defaults to `http://127.0.0.1:8000` in development and `https://flow-recipe-api.anog.fr` in production

## Local development

1. `cd back && make db-up`
2. `cd back && make run`
3. `cd front && npm run dev`
4. Open `http://localhost:3000`

## Deployment

Railway services:
- `Recipe Back`
- `Recipe Front`
- `Recipe DB`

Useful Railway commands:

```bash
railway service "Recipe Back"
railway service "Recipe Front"
railway deployment list --limit 5
railway logs --build
railway logs
railway domain
```

Deployment note:
- `back/Procfile` is required because the FastAPI app entrypoint is `src.app:app`, not a root-level `app.py`
