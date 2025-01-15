import dataclasses
import datetime
import re
from collections import defaultdict

import openai
import pandas as pd
import plotly.express as px
import requests
from bs4 import BeautifulSoup
from plotly.graph_objs import Figure
from pydantic import BaseModel, Field

from environment import OPENAI_API_KEY

OPENAI_CLIENT = openai.OpenAI(
    api_key=OPENAI_API_KEY,
)

prompt_extract_recipe_content = """
I will provide you with the full text of a cooking website page.
Your goal is to extract only the text of the recipe and nothing else (no headers/footers, no ingredients, or anything else than the description of the steps to prepare the recipe.

___
Example good output:
Battre les jaunes d'œufs en y ajoutant 1 pincée de sel, 2 pincées de poivre et 40 g de parmigiano reggiano râpé.

Remplir une grande casserole d'eau et la faire chauffer avec deux pincées de gros sel.

Pendant ce temps, couper la pancetta en lamelles grossières et les faire dorer dans une poêle avec 1 cuillère à soupe d'huile d'olive.

Quand l’eau dans la casserole commence à bouillir mettez vos pâtes.

Prendre deux cuillères à soupe d'eau de cuisson des pâtes, les verser dans le jaunes d'œufs puis remuer.

Réservez la pancetta et laissez la poêle au chaud.

Une fois la cuisson des pâtes al dente, les égoutter sommairement et les mettre dans la poêle et remuer.

Verser le mélange dans un saladier et incorporez la préparation des jaunes d'œufs.

Ajouter la pancetta et deux pincées de poivre. Servez.
___
Here is the text:
{text}
"""

# https://www.marmiton.org/recettes/recette_carbonara-traditionnelle_340808.aspx
prompt_recipe_to_graph = """
I will provide you with a cooking recipe.
Your goal is to represent this recipe as a dependency graph, where each edge represents the fact that a step must\
 be performed before another.
The output will be:
- A list of steps, each with a unique id, a simple description and an estimated time in minutes
- A list of edges that determines the dependencies between steps 

Answer in JSON format.

___
Example
___ 
Input:

Battre les jaunes d'œufs en y ajoutant 1 pincée de sel, 2 pincées de poivre et 40 g de parmigiano reggiano râpé.

Remplir une grande casserole d'eau et la faire chauffer avec deux pincées de gros sel.

Pendant ce temps, couper la pancetta en lamelles grossières et les faire dorer dans une poêle avec 1 cuillère à soupe d'huile d'olive.

Quand l’eau dans la casserole commence à bouillir mettez vos pâtes.

Prendre deux cuillères à soupe d'eau de cuisson des pâtes, les verser dans le jaunes d'œufs puis remuer.

Réservez la pancetta et laissez la poêle au chaud.

Une fois la cuisson des pâtes al dente, les égoutter sommairement et les mettre dans la poêle et remuer.

Verser le mélange dans un saladier et incorporez la préparation des jaunes d'œufs.

Ajouter la pancetta et deux pincées de poivre. Servez.
___
Output:
{{
    "steps": [
        {{"id": 1, "name": "Battre les jaunes d'oeufs et ajouter du sel et du parmesan", "duration": 3}},
        {{"id": 2, "name": "Faire bouillir une grande casserole d'eau", "duration": 2}},
        {{"id": 3, "name": "Couper la pancetta et la cuire", "duration": 5}},
        {{"id": 4, "name": "Cuire les pâtes quand l'eau bout", "duration": 10}},
        {{"id": 5, "name": "Réserver la pancetta au chaud", "duration": 1}},
        {{"id": 6, "name": "Égoutter les pâtes et les mettre dans la poêle", "duration": 2}},
        {{"id": 7, "name": "Mélanger le tout avec la préparation de jaunes d'oeufs, saler, poivrer", "duration": 3}} 
    ],
    "dependencies": [{{"do": 1, "before":  7}}, {{"do": 2, "before": 4}}, {{"do": 3, "before": 5}}, {{"do": 4, "before": 6}},\
     {{"do": 5, "before": 6}}, {{"do": 6, "before": 7}}]
}} 
___
Here is the recipe to process:
{recipe}
"""


class Step(BaseModel):
    step_id: int = Field(alias="id")
    name: str
    duration: int


class Dependency(BaseModel):
    id_dependent_step: int = Field(alias="before")
    id_depended_step: int = Field(alias="do")


class RecipeGraph(BaseModel):
    steps: list[Step]
    dependencies: list[Dependency]


def get_website_text(url: str) -> str:
    html_content = requests.get(url).content
    soup = BeautifulSoup(html_content, "html.parser")
    element = soup.find("body")
    text = element.get_text()
    return re.sub(r"\n+", "\n", text)


def extract_recipe(url: str) -> str:
    website_text = get_website_text(url)
    chat_completion = OPENAI_CLIENT.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt_extract_recipe_content.format(text=website_text),
            }
        ],
        model="gpt-4o-mini",
    )
    return chat_completion.choices[0].message.content


def generate_dependency_graph(recipe_string: str) -> str:
    chat_completion = OPENAI_CLIENT.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt_recipe_to_graph.format(recipe=recipe_string),
            }
        ],
        model="gpt-4o-mini",
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
    duration: int

    @property
    def end_time(self):
        return self.start_time + self.duration


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


def plan_steps(graph: RecipeGraph) -> dict[int, PlannedStep]:
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
            name=step.name, start_time=start_time, duration=step.duration
        )

    return planned_steps


def to_time(minute_offset: int) -> datetime.datetime:
    return datetime.datetime(year=2000, month=1, day=1) + datetime.timedelta(
        minutes=minute_offset
    )


def make_gannt(planned_steps: dict[int, PlannedStep]) -> Figure:
    df = pd.DataFrame(
        [
            {"Step": step.name, "Start": step.start_time, "End": step.end_time}
            for step in planned_steps.values()
        ]
    )

    df["Start"] = df["Start"].apply(lambda x: to_time(x))
    df["End"] = df["End"].apply(lambda x: to_time(x))

    fig = px.timeline(df, x_start="Start", x_end="End", y="Step")
    fig.update_yaxes(
        autorange="reversed"
    )  # otherwise tasks are listed from the bottom up
    return fig


def ganntify_recipe(url: str) -> Figure:
    recipe = extract_recipe(url)
    graph_string = generate_dependency_graph(recipe)
    recipe_graph = parse_recipe_graph(graph_string)
    planned_steps = plan_steps(recipe_graph)
    return make_gannt(planned_steps)


if __name__ == "__main__":
    URL = "https://www.marmiton.org/recettes/recette_boeuf-bourguignon_18889.aspx"
    fig = ganntify_recipe(URL)
    fig.show()
