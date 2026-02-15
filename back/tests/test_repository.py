"""Tests for repository.py - database operations."""

from unittest.mock import MagicMock

import pytest

from repository import RecipeHistoryRepository


@pytest.fixture
def mock_db():
    """Create a mock database session."""
    return MagicMock()


@pytest.fixture
def repo(mock_db):
    """Create a repository with a mock database session."""
    return RecipeHistoryRepository(mock_db)


class TestGetByUrl:
    """Tests for get_by_url method."""

    def test_returns_recipe_when_found(self, repo, mock_db):
        """Should return recipe when URL exists."""
        mock_recipe = MagicMock()
        mock_recipe.url = "https://example.com/recipe"
        mock_db.query.return_value.filter.return_value.first.return_value = mock_recipe

        result = repo.get_by_url("https://example.com/recipe")

        assert result == mock_recipe

    def test_returns_none_when_not_found(self, repo, mock_db):
        """Should return None when URL not found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = repo.get_by_url("https://example.com/nonexistent")

        assert result is None


class TestUpsert:
    """Tests for upsert method."""

    def test_inserts_new_recipe(self, repo, mock_db):
        """Should insert new recipe when URL not in database."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        steps = [{"step_id": "1", "step_name": "Test step"}]
        repo.upsert(
            url="https://example.com/new",
            title="New Recipe",
            snippet="A snippet",
            planned_steps=steps,
        )

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called()

    def test_updates_existing_recipe(self, repo, mock_db):
        """Should update existing recipe when URL exists."""
        mock_recipe = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_recipe

        steps = [{"step_id": "1", "step_name": "Updated step"}]
        repo.upsert(
            url="https://example.com/existing",
            title="Updated Recipe",
            snippet="Updated snippet",
            planned_steps=steps,
        )

        assert mock_recipe.title == "Updated Recipe"
        assert mock_recipe.snippet == "Updated snippet"
        assert mock_recipe.planned_steps == steps
        mock_db.commit.assert_called()
        # Should not call add for existing recipe
        mock_db.add.assert_not_called()


class TestTouch:
    """Tests for touch method."""

    def test_updates_timestamp_when_found(self, repo, mock_db):
        """Should update updated_at when recipe found."""
        mock_recipe = MagicMock()
        mock_db.query.return_value.filter.return_value.first.return_value = mock_recipe

        result = repo.touch("https://example.com/recipe")

        assert result is True
        mock_db.commit.assert_called()
        assert mock_recipe.updated_at is not None

    def test_returns_false_when_not_found(self, repo, mock_db):
        """Should return False when recipe not found."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = repo.touch("https://example.com/nonexistent")

        assert result is False


class TestGetPopular:
    """Tests for get_popular method."""

    def test_returns_recipes_ordered_by_updated_at(self, repo, mock_db):
        """Should return recipes ordered by updated_at descending."""
        mock_recipes = [MagicMock(), MagicMock()]
        mock_db.query.return_value.order_by.return_value.limit.return_value.all.return_value = (
            mock_recipes
        )

        result = repo.get_popular(limit=10)

        assert result == mock_recipes

    def test_respects_limit(self, repo, mock_db):
        """Should respect the limit parameter."""
        mock_db.query.return_value.order_by.return_value.limit.return_value.all.return_value = (
            []
        )

        repo.get_popular(limit=5)

        mock_db.query.return_value.order_by.return_value.limit.assert_called_once_with(
            5
        )

    def test_returns_empty_list_when_no_recipes(self, repo, mock_db):
        """Should return empty list when no recipes."""
        mock_db.query.return_value.order_by.return_value.limit.return_value.all.return_value = (
            []
        )

        result = repo.get_popular()

        assert result == []
