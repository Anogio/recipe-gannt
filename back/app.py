from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from history import recipe_history
from logic import ganntify_recipe, search_recipes

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://recipe-gannt.anog.fr",
    "https://www.recipe-gannt.anog.fr",
    "https://recipe-gannt-front.onrender.com",
    "https://www.recipe-gannt-front.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecipeUrl(BaseModel):
    recipe_url: HttpUrl
    title: str | None = None
    snippet: str | None = None


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


@app.get("/search_recipes")
async def search_recipes_api(query: str, page: int = 0) -> SearchResponse:
    data = search_recipes(query, page=page)
    return SearchResponse(
        results=[SearchResult(**r) for r in data["results"]],
        has_more=data["has_more"],
    )


@app.get("/popular_recipes")
async def get_popular_recipes() -> PopularRecipesResponse:
    """Return the list of recently processed recipes."""
    entries = await recipe_history.get_all()
    return PopularRecipesResponse(
        recipes=[
            SearchResult(title=e.title, url=e.url, snippet=e.snippet)
            for e in entries
        ]
    )


@app.post("/ganntify_recipe")
async def ganntify_recipe_api(recipe_url: RecipeUrl):
    url = str(recipe_url.recipe_url)
    _, figure, extracted_title = ganntify_recipe(url)

    # Record to history
    title = recipe_url.title or extracted_title or "Recipe"
    snippet = recipe_url.snippet or ""
    await recipe_history.add(title=title, url=url, snippet=snippet)

    img_bytes = figure.to_image(format="png")
    return Response(content=img_bytes, media_type="image/png")


@app.post("/ganntify_recipe_data")
async def ganntify_recipe_data_api(recipe_url: RecipeUrl):
    url = str(recipe_url.recipe_url)
    planned_steps, _, extracted_title = ganntify_recipe(url)

    # Record to history
    title = recipe_url.title or extracted_title or "Recipe"
    snippet = recipe_url.snippet or ""
    await recipe_history.add(title=title, url=url, snippet=snippet)

    return PlannedSteps(
        planned_steps=[
            PlannedStep(
                step_id=str(step.step_id),
                step_name=step.name,
                duration_minute=step.duration_minutes,
                dependencies=[str(dep) for dep in step.dependencies],
                ingredients=step.ingredients,
            )
            for step in planned_steps
        ]
    )
