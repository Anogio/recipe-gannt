"""Tests for app.py - FastAPI endpoints."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.app import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    return MagicMock()


@pytest.fixture
def mock_repo():
    """Create a mock repository."""
    return MagicMock()


class TestRootEndpoint:
    """Tests for GET / endpoint."""

    def test_root_returns_hello_world(self, client):
        """Should return hello world message."""
        response = client.get("/")

        assert response.status_code == 200
        assert response.json() == {"message": "Hello World"}


class TestSearchRecipesEndpoint:
    """Tests for GET /search_recipes endpoint."""

    @patch("src.app.search_recipes")
    def test_search_returns_results(self, mock_search, client):
        """Should return search results."""
        mock_search.return_value = {
            "results": [
                {
                    "title": "Pasta Recipe",
                    "url": "https://example.com/pasta",
                    "snippet": "Delicious pasta",
                }
            ],
            "has_more": False,
        }

        response = client.get("/search_recipes?query=pasta")

        assert response.status_code == 200
        data = response.json()
        assert len(data["results"]) == 1
        assert data["results"][0]["title"] == "Pasta Recipe"
        assert data["has_more"] is False

    @patch("src.app.search_recipes")
    def test_search_with_pagination(self, mock_search, client):
        """Should pass page parameter to search."""
        mock_search.return_value = {"results": [], "has_more": True}

        response = client.get("/search_recipes?query=pasta&page=2")

        assert response.status_code == 200
        mock_search.assert_called_once_with("pasta", page=2)

    @patch("src.app.search_recipes")
    def test_search_empty_results(self, mock_search, client):
        """Should handle empty results."""
        mock_search.return_value = {"results": [], "has_more": False}

        response = client.get("/search_recipes?query=nonexistent")

        assert response.status_code == 200
        assert response.json()["results"] == []

    def test_search_missing_query(self, client):
        """Should return 422 for missing query parameter."""
        response = client.get("/search_recipes")

        assert response.status_code == 422


class TestPopularRecipesEndpoint:
    """Tests for GET /popular_recipes endpoint."""

    @patch("src.app.RecipeHistoryRepository")
    @patch("src.app.get_db")
    def test_returns_popular_recipes(self, mock_get_db, mock_repo_class, client):
        """Should return popular recipes from database."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_repo = MagicMock()
        mock_entry = MagicMock()
        mock_entry.title = "Popular Recipe"
        mock_entry.url = "https://example.com/popular"
        mock_entry.snippet = "Very popular"
        mock_repo.get_popular.return_value = [mock_entry]
        mock_repo_class.return_value = mock_repo

        response = client.get("/popular_recipes")

        assert response.status_code == 200
        data = response.json()
        assert len(data["recipes"]) == 1
        assert data["recipes"][0]["title"] == "Popular Recipe"

    @patch("src.app.RecipeHistoryRepository")
    @patch("src.app.get_db")
    def test_returns_empty_when_no_history(self, mock_get_db, mock_repo_class, client):
        """Should return empty list when no history."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_repo = MagicMock()
        mock_repo.get_popular.return_value = []
        mock_repo_class.return_value = mock_repo

        response = client.get("/popular_recipes")

        assert response.status_code == 200
        assert response.json()["recipes"] == []


class TestGanntifyRecipeDataEndpoint:
    """Tests for POST /ganntify_recipe_data endpoint."""

    @patch("src.app.RecipeHistoryRepository")
    @patch("src.app.get_db")
    @patch("src.app.ganntify_recipe")
    def test_returns_planned_steps_from_processing(
        self, mock_ganntify, mock_get_db, mock_repo_class, client
    ):
        """Should return planned steps data when not cached."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_repo = MagicMock()
        mock_repo.get_by_url.return_value = None  # Not cached
        mock_repo_class.return_value = mock_repo

        mock_step = MagicMock()
        mock_step.step_id = 1
        mock_step.name = "Boil water"
        mock_step.duration_minutes = 10
        mock_step.dependencies = [2, 3]
        mock_step.ingredients = ["water", "salt"]
        mock_ganntify.return_value = ([mock_step], "Test Recipe")

        response = client.post(
            "/ganntify_recipe_data",
            json={"recipe_url": "https://example.com/recipe"},
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["planned_steps"]) == 1
        assert data["planned_steps"][0]["step_name"] == "Boil water"
        assert data["planned_steps"][0]["duration_minute"] == 10
        assert data["planned_steps"][0]["dependencies"] == ["2", "3"]
        assert data["planned_steps"][0]["ingredients"] == ["water", "salt"]
        mock_repo.upsert.assert_called_once()

    @patch("src.app.RecipeHistoryRepository")
    @patch("src.app.get_db")
    @patch("src.app.ganntify_recipe")
    def test_returns_cached_steps(
        self, mock_ganntify, mock_get_db, mock_repo_class, client
    ):
        """Should return cached steps without reprocessing."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_repo = MagicMock()
        mock_cached = MagicMock()
        mock_cached.planned_steps = [
            {
                "step_id": "1",
                "step_name": "Cached step",
                "duration_minute": 5,
                "dependencies": [],
                "ingredients": ["flour"],
            }
        ]
        mock_repo.get_by_url.return_value = mock_cached
        mock_repo_class.return_value = mock_repo

        response = client.post(
            "/ganntify_recipe_data",
            json={"recipe_url": "https://example.com/recipe"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["planned_steps"][0]["step_name"] == "Cached step"
        mock_ganntify.assert_not_called()  # Should not process
        mock_repo.touch.assert_called_once()  # Should update timestamp

    @patch("src.app.RecipeHistoryRepository")
    @patch("src.app.get_db")
    @patch("src.app.ganntify_recipe")
    def test_saves_to_database(
        self, mock_ganntify, mock_get_db, mock_repo_class, client
    ):
        """Should save recipe to database after processing."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_repo = MagicMock()
        mock_repo.get_by_url.return_value = None
        mock_repo_class.return_value = mock_repo

        mock_ganntify.return_value = ([], "Extracted Title")

        client.post(
            "/ganntify_recipe_data",
            json={
                "recipe_url": "https://example.com/recipe",
                "title": "Custom Title",
                "snippet": "Custom snippet",
            },
        )

        mock_repo.upsert.assert_called_once()
        call_kwargs = mock_repo.upsert.call_args[1]
        assert call_kwargs["url"] == "https://example.com/recipe"
        assert call_kwargs["title"] == "Custom Title"
        assert call_kwargs["snippet"] == "Custom snippet"

    @patch("src.app.RecipeHistoryRepository")
    @patch("src.app.get_db")
    @patch("src.app.ganntify_recipe")
    def test_uses_extracted_title_as_fallback(
        self, mock_ganntify, mock_get_db, mock_repo_class, client
    ):
        """Should use extracted title when none provided."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_repo = MagicMock()
        mock_repo.get_by_url.return_value = None
        mock_repo_class.return_value = mock_repo

        mock_ganntify.return_value = ([], "Extracted Title")

        client.post(
            "/ganntify_recipe_data",
            json={"recipe_url": "https://example.com/recipe"},
        )

        call_kwargs = mock_repo.upsert.call_args[1]
        assert call_kwargs["title"] == "Extracted Title"

    @patch("src.app.RecipeHistoryRepository")
    @patch("src.app.get_db")
    @patch("src.app.ganntify_recipe")
    def test_uses_default_title_when_no_title(
        self, mock_ganntify, mock_get_db, mock_repo_class, client
    ):
        """Should use 'Recipe' as default when no title available."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_repo = MagicMock()
        mock_repo.get_by_url.return_value = None
        mock_repo_class.return_value = mock_repo

        mock_ganntify.return_value = ([], "")

        client.post(
            "/ganntify_recipe_data",
            json={"recipe_url": "https://example.com/recipe"},
        )

        call_kwargs = mock_repo.upsert.call_args[1]
        assert call_kwargs["title"] == "Recipe"

    def test_invalid_url(self, client):
        """Should return 422 for invalid URL."""
        response = client.post(
            "/ganntify_recipe_data",
            json={"recipe_url": "not-a-valid-url"},
        )

        assert response.status_code == 422

    def test_missing_url(self, client):
        """Should return 422 for missing URL."""
        response = client.post(
            "/ganntify_recipe_data",
            json={},
        )

        assert response.status_code == 422


class TestCORSConfiguration:
    """Tests for CORS middleware configuration."""

    def test_cors_headers_for_allowed_origin(self, client):
        """Should include CORS headers for allowed origins."""
        response = client.options(
            "/",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )

        assert "access-control-allow-origin" in response.headers


class TestInputValidation:
    """Tests for input validation."""

    def test_search_empty_query_rejected(self, client):
        """Should reject empty search query."""
        response = client.get("/search_recipes?query=")
        assert response.status_code == 422

    def test_search_too_long_query_rejected(self, client):
        """Should reject search query over 200 characters."""
        long_query = "a" * 201
        response = client.get(f"/search_recipes?query={long_query}")
        assert response.status_code == 422

    def test_search_negative_page_rejected(self, client):
        """Should reject negative page number."""
        response = client.get("/search_recipes?query=pasta&page=-1")
        assert response.status_code == 422

    def test_search_page_over_100_rejected(self, client):
        """Should reject page number over 100."""
        response = client.get("/search_recipes?query=pasta&page=101")
        assert response.status_code == 422

    @patch("src.app.RecipeHistoryRepository")
    @patch("src.app.get_db")
    @patch("src.app.ganntify_recipe")
    def test_ganntify_error_returns_500(
        self, mock_ganntify, mock_get_db, mock_repo_class, client
    ):
        """Should return 500 when ganntify fails."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_repo = MagicMock()
        mock_repo.get_by_url.return_value = None
        mock_repo_class.return_value = mock_repo

        mock_ganntify.side_effect = Exception("Test error")

        response = client.post(
            "/ganntify_recipe_data",
            json={"recipe_url": "https://example.com/recipe"},
        )

        assert response.status_code == 500
        assert "Failed to process recipe" in response.json()["detail"]


class TestModels:
    """Tests for Pydantic models validation."""

    def test_recipe_url_validates_url(self, client):
        """Should validate that recipe_url is a valid URL."""
        response = client.post(
            "/ganntify_recipe_data",
            json={"recipe_url": "not-a-url"},
        )
        assert response.status_code == 422

    @patch("src.app.RecipeHistoryRepository")
    @patch("src.app.get_db")
    @patch("src.app.ganntify_recipe")
    def test_recipe_url_accepts_http(
        self, mock_ganntify, mock_get_db, mock_repo_class, client
    ):
        """Should accept HTTP URLs."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_repo = MagicMock()
        mock_repo.get_by_url.return_value = None
        mock_repo_class.return_value = mock_repo

        mock_ganntify.return_value = ([], "")

        response = client.post(
            "/ganntify_recipe_data",
            json={"recipe_url": "http://example.com/recipe"},
        )
        assert response.status_code == 200

    @patch("src.app.RecipeHistoryRepository")
    @patch("src.app.get_db")
    @patch("src.app.ganntify_recipe")
    def test_recipe_url_accepts_https(
        self, mock_ganntify, mock_get_db, mock_repo_class, client
    ):
        """Should accept HTTPS URLs."""
        mock_db = MagicMock()
        mock_get_db.return_value = iter([mock_db])

        mock_repo = MagicMock()
        mock_repo.get_by_url.return_value = None
        mock_repo_class.return_value = mock_repo

        mock_ganntify.return_value = ([], "")

        response = client.post(
            "/ganntify_recipe_data",
            json={"recipe_url": "https://example.com/recipe"},
        )
        assert response.status_code == 200
