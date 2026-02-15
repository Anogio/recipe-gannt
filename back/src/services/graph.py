"""Graph processing for recipe dependency planning."""

import dataclasses
import datetime
from collections import defaultdict

from src.services.ai_service import extract_recipe, generate_dependency_graph
from src.services.schemas import RecipeGraph, Step


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
    """Parse a JSON string into a RecipeGraph."""
    return RecipeGraph.model_validate_json(recipe_graph_parsable_string)


def visit_recipe_graph(graph: RecipeGraph) -> list[int]:
    """Perform topological sort on recipe graph, returning step IDs in order."""
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
    """Plan recipe steps with timing based on dependencies."""
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
    """Convert minute offset to datetime."""
    return datetime.datetime(year=2000, month=1, day=1) + datetime.timedelta(
        minutes=minute_offset
    )


def ganntify_recipe(url: str) -> tuple[list[PlannedStep], str]:
    """Process a recipe URL into planned steps with timing."""
    extracted = extract_recipe(url)
    graph_string = generate_dependency_graph(extracted.recipe, extracted.ingredients)
    recipe_graph = parse_recipe_graph(graph_string)
    planned_steps = plan_steps(recipe_graph)
    return planned_steps, extracted.title
