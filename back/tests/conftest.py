import pytest


@pytest.fixture
def sample_recipe_graph_json() -> str:
    """Sample recipe graph JSON for testing."""
    return """{
        "steps": [
            {"id": 1, "name": "Beat eggs with salt and parmesan", "duration": 3, "ingredients": ["4 eggs", "parmesan", "salt"]},
            {"id": 2, "name": "Boil water", "duration": 10, "ingredients": ["water", "salt"]},
            {"id": 3, "name": "Cook pancetta", "duration": 5, "ingredients": ["200g pancetta", "olive oil"]},
            {"id": 4, "name": "Cook pasta", "duration": 8, "ingredients": ["400g spaghetti"]},
            {"id": 5, "name": "Reserve pancetta", "duration": null, "ingredients": []},
            {"id": 6, "name": "Drain pasta and add to pan", "duration": 2, "ingredients": []},
            {"id": 7, "name": "Mix everything together", "duration": 3, "ingredients": ["pepper"]}
        ],
        "dependencies": [
            {"do": 1, "before": 7},
            {"do": 2, "before": 4},
            {"do": 3, "before": 5},
            {"do": 4, "before": 6},
            {"do": 5, "before": 6},
            {"do": 6, "before": 7}
        ]
    }"""


@pytest.fixture
def sample_recipe_graph_linear_json() -> str:
    """A simple linear recipe graph for testing."""
    return """{
        "steps": [
            {"id": 1, "name": "Step 1", "duration": 5, "ingredients": ["a"]},
            {"id": 2, "name": "Step 2", "duration": 3, "ingredients": ["b"]},
            {"id": 3, "name": "Step 3", "duration": 2, "ingredients": ["c"]}
        ],
        "dependencies": [
            {"do": 1, "before": 2},
            {"do": 2, "before": 3}
        ]
    }"""


@pytest.fixture
def sample_recipe_graph_parallel_json() -> str:
    """A recipe graph with parallel steps for testing."""
    return """{
        "steps": [
            {"id": 1, "name": "Prep A", "duration": 5, "ingredients": ["a"]},
            {"id": 2, "name": "Prep B", "duration": 3, "ingredients": ["b"]},
            {"id": 3, "name": "Combine", "duration": 2, "ingredients": []}
        ],
        "dependencies": [
            {"do": 1, "before": 3},
            {"do": 2, "before": 3}
        ]
    }"""
