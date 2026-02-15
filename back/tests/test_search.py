"""Tests for recipe search functionality."""

from unittest.mock import MagicMock, patch

from src.services.search import search_recipes


class TestSearchRecipesBlacklist:
    """Tests for blacklist filtering in search_recipes."""

    @patch("src.services.search.filter_accessible_urls")
    @patch("src.services.search.DDGS")
    def test_filters_blacklisted_domains(self, mock_ddgs, mock_filter):
        """Should filter out blacklisted domains before accessibility check."""
        # Setup mock DuckDuckGo results
        mock_ddgs_instance = MagicMock()
        mock_ddgs.return_value.__enter__.return_value = mock_ddgs_instance
        mock_ddgs_instance.text.return_value = [
            {
                "title": "NYT Recipe",
                "href": "https://cooking.nytimes.com/recipe/1",
                "body": "A recipe",
            },
            {
                "title": "Good Recipe",
                "href": "https://allrecipes.com/recipe/1",
                "body": "Another recipe",
            },
            {
                "title": "ATK Recipe",
                "href": "https://americastestkitchen.com/recipe/1",
                "body": "ATK recipe",
            },
        ]
        mock_filter.return_value = [
            {
                "title": "Good Recipe",
                "url": "https://allrecipes.com/recipe/1",
                "snippet": "Another recipe",
            }
        ]

        search_recipes("test", page=0)

        # Verify filter_accessible_urls was called without blacklisted URLs
        call_args = mock_filter.call_args[0][0]
        urls = [r["url"] for r in call_args]
        assert "https://cooking.nytimes.com/recipe/1" not in urls
        assert "https://americastestkitchen.com/recipe/1" not in urls
        assert "https://allrecipes.com/recipe/1" in urls
