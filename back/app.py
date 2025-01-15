from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from logic import ganntify_recipe

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://recipe-gannt.anog.fr",
    "https://www.recipe-gannt.anog.fr",
    "https://recipe-gannt-front.onrender.com/",
    "https://www.recipe-gannt-front.onrender.com/"
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


@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/ganntify_recipe")
def ganntify_recipe_api(recipe_url: RecipeUrl):
    figure = ganntify_recipe(recipe_url.recipe_url)
    img_bytes = figure.to_image(format="png")
    return Response(content=img_bytes, media_type="image/png")
