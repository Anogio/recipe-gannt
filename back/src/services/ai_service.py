"""OpenAI integration for recipe extraction and processing."""

import re

import openai
import requests
from bs4 import BeautifulSoup

from src.config.environment import OPENAI_API_KEY
from src.services.schemas import ExtractedRecipe

OPENAI_CLIENT = openai.OpenAI(
    api_key=OPENAI_API_KEY,
)
MODEL = "gpt-4.1-mini"

prompt_extract_recipe_content = """
I will provide you with the full text of a cooking website page.
Your goal is to extract:
1. The recipe steps (the description of what to do to prepare the recipe, no headers/footers)
2. The list of ingredients

Answer in JSON format with two keys: "recipe" (the recipe steps as text) and "ingredients" (the list of ingredients as text, preserving quantities).

___
Example input (excerpt):
Ingrédients: 4 jaunes d'œufs, 200g de pancetta, 400g de spaghetti, 40g de parmesan, sel, poivre, huile d'olive

Préparation:
Battre les jaunes d'œufs en y ajoutant 1 pincée de sel...
___
Example output:
{{
  "recipe": "Battre les jaunes d'œufs en y ajoutant 1 pincée de sel, 2 pincées de poivre et 40 g de parmigiano reggiano râpé.\n\nRemplir une grande casserole d'eau et la faire chauffer avec deux pincées de gros sel.\n\nPendant ce temps, couper la pancetta en lamelles grossières et les faire dorer dans une poêle avec 1 cuillère à soupe d'huile d'olive.\n\nQuand l'eau dans la casserole commence à bouillir mettez vos pâtes.\n\nPrendre deux cuillères à soupe d'eau de cuisson des pâtes, les verser dans le jaunes d'œufs puis remuer.\n\nRéservez la pancetta et laissez la poêle au chaud.\n\nUne fois la cuisson des pâtes al dente, les égoutter sommairement et les mettre dans la poêle et remuer.\n\nVerser le mélange dans un saladier et incorporez la préparation des jaunes d'œufs.\n\nAjouter la pancetta et deux pincées de poivre. Servez.",
  "ingredients": "4 jaunes d'œufs, 200g de pancetta, 400g de spaghetti, 40g de parmesan râpé, sel, poivre, huile d'olive"
}}
___
Here is the text:
{text}
"""

# https://www.marmiton.org/recettes/recette_carbonara-traditionnelle_340808.aspx
prompt_recipe_to_graph = """
I will provide you with a cooking recipe and a list of ingredients.
Your goal is to represent this recipe as a dependency graph, where each edge represents the fact that a step must\
 be performed before another.
The output will be:
- A list of steps, each with:
  - a unique id
  - a simple description (name)
  - a duration in minutes ONLY if explicitly mentioned in the recipe (e.g. "cook for 10 minutes"). If no duration is stated, set to null. If duration is variable (2 to 3 minutes), take the longest interval. Never add a duration if it is not explicitly stated in the recipe.
  - a list of ingredients used in this step (ingredients). Include quantities when relevant (e.g. "400g of tomatoes"), but some ingredients don't need quantities (e.g. "salt", "pepper", "olive oil").
- A list of edges that determines the dependencies between steps

Answer in JSON format.

___
Example
___
Input recipe:

Battre les jaunes d'œufs en y ajoutant 1 pincée de sel, 2 pincées de poivre et 40 g de parmigiano reggiano râpé.

Remplir une grande casserole d'eau et la faire chauffer avec deux pincées de gros sel.

Pendant ce temps, couper la pancetta en lamelles grossières et les faire dorer dans une poêle avec 1 cuillère à soupe d'huile d'olive pendant 5 minutes.

Quand l'eau dans la casserole commence à bouillir mettez vos pâtes.

Prendre deux cuillères à soupe d'eau de cuisson des pâtes, les verser dans le jaunes d'œufs puis remuer.

Réservez la pancetta et laissez la poêle au chaud.

Une fois la cuisson des pâtes al dente, les égoutter sommairement et les mettre dans la poêle et remuer.

Verser le mélange dans un saladier et incorporez la préparation des jaunes d'œufs.

Ajouter la pancetta et deux pincées de poivre. Servez.

Input ingredients:

4 jaunes d'œufs, 200g de pancetta, 400g de spaghetti, 40g de parmesan râpé, sel, poivre, huile d'olive
___
Output:
{{
    "steps": [
        {{"id": 1, "name": "Battre les jaunes d'oeufs et ajouter du sel et du parmesan", "duration": null, "ingredients": ["4 jaunes d'oeufs", "40g de parmesan râpé", "sel", "poivre"]}},
        {{"id": 2, "name": "Faire bouillir une grande casserole d'eau", "duration": null, "ingredients": ["sel"]}},
        {{"id": 3, "name": "Couper la pancetta et la cuire pendant 5 minutes", "duration": 5, "ingredients": ["200g de pancetta", "huile d'olive"]}},
        {{"id": 4, "name": "Cuire les pâtes quand l'eau bout", "duration": null, "ingredients": ["400g de spaghetti"]}},
        {{"id": 5, "name": "Réserver la pancetta au chaud", "duration": null, "ingredients": []}},
        {{"id": 6, "name": "Égoutter les pâtes et les mettre dans la poêle", "duration": null, "ingredients": []}},
        {{"id": 7, "name": "Mélanger le tout avec la préparation de jaunes d'oeufs, saler, poivrer", "duration": null, "ingredients": ["poivre"]}}
    ],
    "dependencies": [{{"do": 1, "before":  7}}, {{"do": 2, "before": 4}}, {{"do": 3, "before": 5}}, {{"do": 4, "before": 6}},\
     {{"do": 5, "before": 6}}, {{"do": 6, "before": 7}}]
}}
___
Here is the recipe to process:
{recipe}

Here are the ingredients:
{ingredients}
"""


def extract_recipe(url: str) -> ExtractedRecipe:
    """Extract recipe content from a URL using AI."""
    # Fetch page and extract title
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    html_content = requests.get(url, headers=headers).content
    soup = BeautifulSoup(html_content, "html.parser")

    # Extract title
    title = ""
    title_tag = soup.find("title")
    if title_tag and title_tag.string:
        title = title_tag.string.strip()
    elif h1_tag := soup.find("h1"):
        title = h1_tag.get_text().strip()

    # Extract body text
    body = soup.find("body")
    website_text = re.sub(r"\n+", "\n", body.get_text()) if body else ""

    chat_completion = OPENAI_CLIENT.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt_extract_recipe_content.format(text=website_text),
            }
        ],
        model=MODEL,
        response_format={"type": "json_object"},
    )
    result = ExtractedRecipe.model_validate_json(
        chat_completion.choices[0].message.content
    )
    result.title = title
    return result


def generate_dependency_graph(recipe_string: str, ingredients: str) -> str:
    """Generate a dependency graph from recipe text using AI."""
    chat_completion = OPENAI_CLIENT.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt_recipe_to_graph.format(
                    recipe=recipe_string, ingredients=ingredients
                ),
            }
        ],
        model=MODEL,
        response_format={"type": "json_object"},
    )
    return chat_completion.choices[0].message.content
