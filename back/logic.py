import dataclasses
import datetime
import re
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

import openai
import pandas as pd
import plotly.express as px
import requests
from bs4 import BeautifulSoup
from ddgs import DDGS
from plotly.graph_objs import Figure
from pydantic import BaseModel, Field

from environment import OPENAI_API_KEY

OPENAI_CLIENT = openai.OpenAI(
    api_key=OPENAI_API_KEY,
)
MODEL="gpt-4.1-mini"

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
  - a duration in minutes only if explicitly mentioned in the recipe (e.g. "cook for 10 minutes"). If no duration is stated, set to null. If duration is variable (2 to 3 minutes), take the longest interval.
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


def get_website_text(url: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    html_content = requests.get(url, headers=headers).content
    soup = BeautifulSoup(html_content, "html.parser")
    element = soup.find("body")
    text = element.get_text()
    return re.sub(r"\n+", "\n", text)


def can_fetch_content(url: str) -> bool:
    """Check if a URL can be scraped (returns real content, not JS blocker)."""
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=5)
        if response.status_code != 200:
            return False

        soup = BeautifulSoup(response.content, "html.parser")
        body = soup.find("body")
        if not body:
            return False

        text = body.get_text()
        if len(text.strip()) < 200:
            return False

        if "enable javascript" in text.lower():
            return False

        return True
    except Exception:
        return False


def filter_accessible_urls(results: list[dict], max_workers: int = 4) -> list[dict]:
    """Filter search results to only include accessible URLs."""
    accessible = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_result = {
            executor.submit(can_fetch_content, r["url"]): r for r in results
        }
        for future in as_completed(future_to_result):
            result = future_to_result[future]
            if future.result():
                accessible.append(result)

    return accessible


PAGE_SIZE = 10


def search_recipes(query: str, page: int = 0) -> dict:
    """Search for recipes using DuckDuckGo with pagination.

    Returns a dict with 'results' (list of recipes) and 'has_more' (boolean).
    """
    # Fetch enough results to cover all pages up to and including the requested page
    fetch_count = (page + 1) * PAGE_SIZE

    with DDGS() as ddgs:
        all_results = list(ddgs.text(f"{query} recipe", max_results=fetch_count))

    # Check if there might be more results
    has_more = len(all_results) >= fetch_count

    # Get only the results for the current page
    start_idx = page * PAGE_SIZE
    end_idx = start_idx + PAGE_SIZE
    page_results = all_results[start_idx:end_idx]

    raw_results = [
        {"title": r["title"], "url": r["href"], "snippet": r["body"]}
        for r in page_results
    ]

    filtered_results = filter_accessible_urls(raw_results)

    return {"results": filtered_results, "has_more": has_more}


class ExtractedRecipe(BaseModel):
    recipe: str
    ingredients: str
    title: str = ""


def extract_recipe(url: str) -> ExtractedRecipe:
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
    result = ExtractedRecipe.model_validate_json(chat_completion.choices[0].message.content)
    result.title = title
    return result


def generate_dependency_graph(recipe_string: str, ingredients: str) -> str:
    chat_completion = OPENAI_CLIENT.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt_recipe_to_graph.format(recipe=recipe_string, ingredients=ingredients),
            }
        ],
        model=MODEL,
        response_format={"type": "json_object"},
    )
    return chat_completion.choices[0].message.content


#     return """{
#     "steps": [
#         {"id": 6, "name": "Égoutter les pâtes et les mettre dans la poêle", "duration": 2},
#         {"id": 12, "name": "Battre les jaunes d'oeufs et ajouter du sel et du parmesan", "duration": 3},
#         {"id": 2, "name": "Faire bouillir une grande casserole d'eau", "duration": 2},
#         {"id": 0, "name": "Mélanger le tout avec la préparation de jaunes d'oeufs, saler, poivrer", "duration": 3},
#         {"id": 10, "name": "Couper la pancetta et la cuire", "duration": 5},
#         {"id": 4, "name": "Cuire les pâtes quand l'eau bout", "duration": 10},
#         {"id": 1, "name": "Réserver la pancetta au chaud", "duration": 1}
#     ],
#     "dependencies": [{"do": 12, "before":  0}, {"do": 2, "before": 4}, {"do": 10, "before": 1}, {"do": 4, "before": 6},\
#      {"do": 1, "before": 6}, {"do": 6, "before": 0}]
# } """


@dataclasses.dataclass
class PlannedStep:
    name: str
    start_time: int
    duration_minutes: int | None
    step_id: int
    dependencies: list[int]
    ingredients: list[str]

    @property
    def end_time(self) -> int:
        return self.start_time + (self.duration_minutes or 0)

    @property
    def start_date(self) -> datetime.datetime:
        return to_time(self.start_time)

    @property
    def end_date(self) -> datetime.datetime:
        return to_time(self.end_time)


def parse_recipe_graph(recipe_graph_parsable_string: str) -> RecipeGraph:
    return RecipeGraph.model_validate_json(recipe_graph_parsable_string)


def visit_recipe_graph(graph: RecipeGraph) -> list[int]:
    depends_on_mapping = defaultdict(set)
    depended_on_mapping = defaultdict(set)

    for dependency in graph.dependencies:
        depends_on_mapping[dependency.id_dependent_step].add(
            dependency.id_depended_step
        )
        depended_on_mapping[dependency.id_depended_step].add(
            dependency.id_dependent_step
        )

    to_visit = []
    visit_order = []

    for step in graph.steps:
        dependencies = depends_on_mapping[step.step_id]
        if len(dependencies) == 0:
            to_visit.append(step.step_id)

    while len(to_visit) > 0:
        step_id = to_visit.pop(0)
        visit_order.append(step_id)

        for dependent_step in depended_on_mapping[step_id]:
            depends_on_mapping[dependent_step].remove(step_id)
            if len(depends_on_mapping[dependent_step]) == 0:
                to_visit.append(dependent_step)

    assert len(visit_order) == len(graph.steps)
    return visit_order


def plan_steps(graph: RecipeGraph) -> list[PlannedStep]:
    # TODO have the dependency and step mappings in the graph data structure instead
    depends_on_mapping = defaultdict(set)
    depended_on_mapping = defaultdict(set)

    for dependency in graph.dependencies:
        depends_on_mapping[dependency.id_dependent_step].add(
            dependency.id_depended_step
        )
        depended_on_mapping[dependency.id_depended_step].add(
            dependency.id_dependent_step
        )
    steps_mapping: dict[int, Step] = {t.step_id: t for t in graph.steps}

    visit_order = visit_recipe_graph(graph)

    planned_steps: dict[int, PlannedStep] = {}

    for step_id in visit_order:
        step = steps_mapping[step_id]
        start_time = max(
            (
                planned_steps[dependency_id].end_time
                for dependency_id in depends_on_mapping[step_id]
            ),
            default=0,
        )
        planned_steps[step_id] = PlannedStep(
            name=step.name,
            start_time=start_time,
            duration_minutes=step.duration,
            step_id=step_id,
            dependencies=list(depends_on_mapping[step_id]),
            ingredients=step.ingredients,
        )

    return list(planned_steps.values())


def to_time(minute_offset: int) -> datetime.datetime:
    return datetime.datetime(year=2000, month=1, day=1) + datetime.timedelta(
        minutes=minute_offset
    )


def make_gannt(planned_steps: list[PlannedStep]) -> Figure:
    df = pd.DataFrame(
        [
            {"Step": step.name, "Start": step.start_time, "End": step.end_time}
            for step in planned_steps
        ]
    )

    df["Start"] = df["Start"].apply(lambda x: to_time(x))
    df["End"] = df["End"].apply(lambda x: to_time(x))

    fig = px.timeline(df, x_start="Start", x_end="End", y="Step")
    fig.update_yaxes(
        autorange="reversed"
    )  # otherwise tasks are listed from the bottom up
    return fig


def ganntify_recipe(url: str) -> tuple[list[PlannedStep], Figure, str]:
    extracted = extract_recipe(url)
    graph_string = generate_dependency_graph(extracted.recipe, extracted.ingredients)
    recipe_graph = parse_recipe_graph(graph_string)
    planned_steps = plan_steps(recipe_graph)
    return planned_steps, make_gannt(planned_steps), extracted.title


if __name__ == "__main__":
    URL = "https://www.marmiton.org/recettes/recette_boeuf-bourguignon_18889.aspx"
    planned_steps, fig, title = ganntify_recipe(URL)
    print(f"Title: {title}")
    print(planned_steps)
    fig.show()
