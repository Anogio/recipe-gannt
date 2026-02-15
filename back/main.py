import logging
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from database import check_database_connection, get_db, run_migrations
from logic import ganntify_recipe, search_recipes
from repository import RecipeHistoryRepository

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # Startup: check database connection and run migrations
    logger.info("Starting up...")
    try:
        logger.info("Checking database connection...")
        check_database_connection()
        logger.info("Database connection successful")

        logger.info("Running database migrations...")
        run_migrations()
        logger.info("Database migrations complete")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

    yield

    # Shutdown
    logger.info("Shutting down...")


limiter = Limiter(key_func=get_remote_address)
app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://flow-recipe.anog.fr",
    "https://www.flow-recipe.anog.fr",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Accept", "Origin"],
)


class RecipeUrl(BaseModel):
    recipe_url: HttpUrl
    title: str | None = None
    snippet: str | None = None

    @field_validator("recipe_url")
    @classmethod
    def validate_url_scheme(cls, v: HttpUrl) -> HttpUrl:
        if str(v).startswith(("http://", "https://")):
            return v
        raise ValueError("URL must use http or https scheme")


class PlannedStep(BaseModel):
    step_id: str
    step_name: str
    duration_minute: int | None
    dependencies: list[str]
    ingredients: list[str]


class PlannedSteps(BaseModel):
    planned_steps: list[PlannedStep]


class SearchResult(BaseModel):
    title: str
    url: str
    snippet: str


class SearchResponse(BaseModel):
    results: list[SearchResult]
    has_more: bool


class PopularRecipesResponse(BaseModel):
    recipes: list[SearchResult]


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/health")
async def health():
    """Health check endpoint that verifies database connectivity."""
    try:
        check_database_connection()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={"status": "unhealthy", "database": str(e)},
        ) from e


@app.get("/search_recipes")
@limiter.limit("30/minute")
async def search_recipes_api(
    request: Request,
    query: Annotated[str, Query(min_length=1, max_length=200)],
    page: Annotated[int, Query(ge=0, le=100)] = 0,
) -> SearchResponse:
    data = search_recipes(query, page=page)
    return SearchResponse(
        results=[SearchResult(**r) for r in data["results"]],
        has_more=data["has_more"],
    )


@app.get("/popular_recipes")
@limiter.limit("60/minute")
async def get_popular_recipes(
    request: Request, db: Session = Depends(get_db)
) -> PopularRecipesResponse:
    """Return the list of recently processed recipes."""
    repo = RecipeHistoryRepository(db)
    entries = repo.get_popular(limit=10)
    return PopularRecipesResponse(
        recipes=[
            SearchResult(title=e.title, url=e.url, snippet=e.snippet) for e in entries
        ]
    )


@app.post("/ganntify_recipe_data")
@limiter.limit("10/minute")
async def ganntify_recipe_data_api(
    request: Request, recipe_url: RecipeUrl, db: Session = Depends(get_db)
):
    url = str(recipe_url.recipe_url)
    repo = RecipeHistoryRepository(db)

    # Check cache first
    cached = repo.get_by_url(url)
    if cached:
        repo.touch(url)
        return PlannedSteps(
            planned_steps=[
                PlannedStep(
                    step_id=str(step["step_id"]),
                    step_name=step["step_name"],
                    duration_minute=step.get("duration_minute"),
                    dependencies=step.get("dependencies", []),
                    ingredients=step.get("ingredients", []),
                )
                for step in cached.planned_steps
            ]
        )

    # Process recipe
    try:
        planned_steps, extracted_title = ganntify_recipe(url)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process recipe: {str(e)}",
        ) from e

    # Store in database
    title = recipe_url.title or extracted_title or "Recipe"
    snippet = recipe_url.snippet or ""
    steps_data = [
        {
            "step_id": str(step.step_id),
            "step_name": step.name,
            "duration_minute": step.duration_minutes,
            "dependencies": [str(dep) for dep in step.dependencies],
            "ingredients": step.ingredients,
        }
        for step in planned_steps
    ]
    repo.upsert(url=url, title=title, snippet=snippet, planned_steps=steps_data)

    return PlannedSteps(planned_steps=[PlannedStep(**step) for step in steps_data])
