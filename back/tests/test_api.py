"""Tests for app.py - FastAPI endpoints."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app import app
from history import RecipeHistoryEntry


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


class TestRootEndpoint:
    """Tests for GET / endpoint."""

    def test_root_returns_hello_world(self, client):
        """Should return hello world message."""
        response = client.get("/")

        assert response.status_code == 200
        assert response.json() == {"message": "Hello World"}


class TestSearchRecipesEndpoint:
    """Tests for GET /search_recipes endpoint."""

    @patch("app.search_recipes")
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

    @patch("app.search_recipes")
    def test_search_with_pagination(self, mock_search, client):
        """Should pass page parameter to search."""
        mock_search.return_value = {"results": [], "has_more": True}

        response = client.get("/search_recipes?query=pasta&page=2")

        assert response.status_code == 200
        mock_search.assert_called_once_with("pasta", page=2)

    @patch("app.search_recipes")
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

    @patch("app.recipe_history")
    def test_returns_popular_recipes(self, mock_history, client):
        """Should return popular recipes from history."""
        mock_history.get_all = AsyncMock(
            return_value=[
                RecipeHistoryEntry(
                    title="Popular Recipe",
                    url="https://example.com/popular",
                    snippet="Very popular",
                )
            ]
        )

        response = client.get("/popular_recipes")

        assert response.status_code == 200
        data = response.json()
        assert len(data["recipes"]) == 1
        assert data["recipes"][0]["title"] == "Popular Recipe"

    @patch("app.recipe_history")
    def test_returns_empty_when_no_history(self, mock_history, client):
        """Should return empty list when no history."""
        mock_history.get_all = AsyncMock(return_value=[])

        response = client.get("/popular_recipes")

        assert response.status_code == 200
        assert response.json()["recipes"] == []


class TestGanntifyRecipeDataEndpoint:
    """Tests for POST /ganntify_recipe_data endpoint."""

    @patch("app.recipe_history")
    @patch("app.ganntify_recipe")
    def test_returns_planned_steps(self, mock_ganntify, mock_history, client):
        """Should return planned steps data."""
        # Create mock planned steps
        mock_step = MagicMock()
        mock_step.step_id = 1
        mock_step.name = "Boil water"
        mock_step.duration_minutes = 10
        mock_step.dependencies = [2, 3]
        mock_step.ingredients = ["water", "salt"]

        mock_ganntify.return_value = ([mock_step], MagicMock(), "Test Recipe")
        mock_history.add = AsyncMock()

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

    @patch("app.recipe_history")
    @patch("app.ganntify_recipe")
    def test_records_to_history(self, mock_ganntify, mock_history, client):
        """Should record recipe to history."""
        mock_ganntify.return_value = ([], MagicMock(), "Extracted Title")
        mock_history.add = AsyncMock()

        client.post(
            "/ganntify_recipe_data",
            json={
                "recipe_url": "https://example.com/recipe",
                "title": "Custom Title",
                "snippet": "Custom snippet",
            },
        )

        mock_history.add.assert_called_once_with(
            title="Custom Title",
            url="https://example.com/recipe",
            snippet="Custom snippet",
        )

    @patch("app.recipe_history")
    @patch("app.ganntify_recipe")
    def test_uses_extracted_title_as_fallback(self, mock_ganntify, mock_history, client):
        """Should use extracted title when none provided."""
        mock_ganntify.return_value = ([], MagicMock(), "Extracted Title")
        mock_history.add = AsyncMock()

        client.post(
            "/ganntify_recipe_data",
            json={"recipe_url": "https://example.com/recipe"},
        )

        mock_history.add.assert_called_once_with(
            title="Extracted Title",
            url="https://example.com/recipe",
            snippet="",
        )

    @patch("app.recipe_history")
    @patch("app.ganntify_recipe")
    def test_uses_default_title_when_no_title(self, mock_ganntify, mock_history, client):
        """Should use 'Recipe' as default when no title available."""
        mock_ganntify.return_value = ([], MagicMock(), "")
        mock_history.add = AsyncMock()

        client.post(
            "/ganntify_recipe_data",
            json={"recipe_url": "https://example.com/recipe"},
        )

        mock_history.add.assert_called_once_with(
            title="Recipe",
            url="https://example.com/recipe",
            snippet="",
        )

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


class TestGanntifyRecipeEndpoint:
    """Tests for POST /ganntify_recipe endpoint."""

    @patch("app.recipe_history")
    @patch("app.ganntify_recipe")
    def test_returns_png_image(self, mock_ganntify, mock_history, client):
        """Should return PNG image."""
        mock_figure = MagicMock()
        mock_figure.to_image.return_value = b"\x89PNG\r\n\x1a\n"  # PNG header
        mock_ganntify.return_value = ([], mock_figure, "Test Recipe")
        mock_history.add = AsyncMock()

        response = client.post(
            "/ganntify_recipe",
            json={"recipe_url": "https://example.com/recipe"},
        )

        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"
        assert response.content.startswith(b"\x89PNG")

    @patch("app.recipe_history")
    @patch("app.ganntify_recipe")
    def test_records_to_history(self, mock_ganntify, mock_history, client):
        """Should record recipe to history."""
        mock_figure = MagicMock()
        mock_figure.to_image.return_value = b"\x89PNG\r\n\x1a\n"
        mock_ganntify.return_value = ([], mock_figure, "Extracted")
        mock_history.add = AsyncMock()

        client.post(
            "/ganntify_recipe",
            json={
                "recipe_url": "https://example.com/recipe",
                "title": "My Recipe",
            },
        )

        mock_history.add.assert_called_once()


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


class TestModels:
    """Tests for Pydantic models validation."""

    def test_recipe_url_validates_url(self, client):
        """Should validate that recipe_url is a valid URL."""
        response = client.post(
            "/ganntify_recipe_data",
            json={"recipe_url": "not-a-url"},
        )
        assert response.status_code == 422

    def test_recipe_url_accepts_http(self, client):
        """Should accept HTTP URLs."""
        with patch("app.ganntify_recipe") as mock:
            mock.return_value = ([], MagicMock(), "")
            with patch("app.recipe_history") as mock_history:
                mock_history.add = AsyncMock()
                response = client.post(
                    "/ganntify_recipe_data",
                    json={"recipe_url": "http://example.com/recipe"},
                )
                assert response.status_code == 200

    def test_recipe_url_accepts_https(self, client):
        """Should accept HTTPS URLs."""
        with patch("app.ganntify_recipe") as mock:
            mock.return_value = ([], MagicMock(), "")
            with patch("app.recipe_history") as mock_history:
                mock_history.add = AsyncMock()
                response = client.post(
                    "/ganntify_recipe_data",
                    json={"recipe_url": "https://example.com/recipe"},
                )
                assert response.status_code == 200
