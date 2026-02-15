"""Pydantic schemas for recipe data structures."""

from pydantic import BaseModel, Field


class Step(BaseModel):
    step_id: int = Field(alias="id")
    name: str
    duration: int | None = None
    ingredients: list[str] = []


class Dependency(BaseModel):
    id_dependent_step: int = Field(alias="before")
    id_depended_step: int = Field(alias="do")


class RecipeGraph(BaseModel):
    steps: list[Step]
    dependencies: list[Dependency]


class ExtractedRecipe(BaseModel):
    recipe: str
    ingredients: str
    title: str = ""
