from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

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


class PlannedStep(BaseModel):
    step_id: str
    step_name: str
    duration_minute: int
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


@app.post("/ganntify_recipe")
def ganntify_recipe_api(recipe_url: RecipeUrl):
    _, figure = ganntify_recipe(str(recipe_url.recipe_url))
    img_bytes = figure.to_image(format="png")
    return Response(content=img_bytes, media_type="image/png")


@app.post("/ganntify_recipe_data")
def ganntify_recipe_data_api(recipe_url: RecipeUrl):
    planned_steps, _ = ganntify_recipe(str(recipe_url.recipe_url))
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
