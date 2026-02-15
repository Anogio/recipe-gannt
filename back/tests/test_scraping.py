"""Tests for web scraping utilities."""

import time
from unittest.mock import MagicMock, patch

from src.services.scraping import (
    can_fetch_content,
    filter_accessible_urls,
    get_website_text,
    is_blacklisted_domain,
)


class TestCanFetchContent:
    """Tests for can_fetch_content function."""

    @patch("src.services.scraping.requests.get")
    def test_successful_fetch(self, mock_get):
        """Should return True for valid content."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        # Content must be at least 200 characters
        long_content = (
            "This is a valid recipe page with lots of content about cooking. " * 10
        )
        mock_response.content = f"<html><body>{long_content}</body></html>".encode()
        mock_get.return_value = mock_response

        assert can_fetch_content("https://example.com/recipe") is True

    @patch("src.services.scraping.requests.get")
    def test_non_200_status(self, mock_get):
        """Should return False for non-200 status."""
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response

        assert can_fetch_content("https://example.com/recipe") is False

    @patch("src.services.scraping.requests.get")
    def test_short_content(self, mock_get):
        """Should return False for short content."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b"<html><body>Short</body></html>"
        mock_get.return_value = mock_response

        assert can_fetch_content("https://example.com/recipe") is False

    @patch("src.services.scraping.requests.get")
    def test_javascript_required(self, mock_get):
        """Should return False if JavaScript is required."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = (
            b"<html><body>Please enable JavaScript to view this page. "
            + b"x" * 200
            + b"</body></html>"
        )
        mock_get.return_value = mock_response

        assert can_fetch_content("https://example.com/recipe") is False

    @patch("src.services.scraping.requests.get")
    def test_no_body(self, mock_get):
        """Should return False if no body element."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b"<html></html>"
        mock_get.return_value = mock_response

        assert can_fetch_content("https://example.com/recipe") is False

    @patch("src.services.scraping.requests.get")
    def test_exception_handling(self, mock_get):
        """Should return False on exception."""
        mock_get.side_effect = Exception("Connection error")

        assert can_fetch_content("https://example.com/recipe") is False


class TestFilterAccessibleUrls:
    """Tests for filter_accessible_urls function."""

    @patch("src.services.scraping.can_fetch_content")
    def test_filters_inaccessible(self, mock_can_fetch):
        """Should filter out inaccessible URLs."""

        # Use a function to return consistent results regardless of call order
        def check_url(url):
            return url != "https://b.com"

        mock_can_fetch.side_effect = check_url

        results = [
            {"url": "https://a.com", "title": "A"},
            {"url": "https://b.com", "title": "B"},
            {"url": "https://c.com", "title": "C"},
        ]

        filtered = filter_accessible_urls(results)

        assert len(filtered) == 2
        urls = [r["url"] for r in filtered]
        assert "https://a.com" in urls
        assert "https://c.com" in urls
        assert "https://b.com" not in urls

    @patch("src.services.scraping.can_fetch_content")
    def test_empty_list(self, mock_can_fetch):
        """Should handle empty list."""
        filtered = filter_accessible_urls([])
        assert filtered == []

    @patch("src.services.scraping.can_fetch_content")
    def test_preserves_original_order(self, mock_can_fetch):
        """Should preserve search ranking despite concurrent fetch checks."""

        def check_url(url):
            if url == "https://a.com":
                time.sleep(0.02)
            return True

        mock_can_fetch.side_effect = check_url

        results = [
            {"url": "https://a.com", "title": "A"},
            {"url": "https://b.com", "title": "B"},
            {"url": "https://c.com", "title": "C"},
        ]

        filtered = filter_accessible_urls(results)

        assert [r["url"] for r in filtered] == [
            "https://a.com",
            "https://b.com",
            "https://c.com",
        ]


class TestGetWebsiteText:
    """Tests for get_website_text function."""

    @patch("src.services.scraping.requests.get")
    def test_extracts_text(self, mock_get):
        """Should extract body text from HTML."""
        mock_response = MagicMock()
        mock_response.content = (
            b"<html><body><p>Recipe content</p><p>More content</p></body></html>"
        )
        mock_get.return_value = mock_response

        text = get_website_text("https://example.com/recipe")

        assert "Recipe content" in text
        assert "More content" in text

    @patch("src.services.scraping.requests.get")
    def test_collapses_newlines(self, mock_get):
        """Should collapse multiple newlines."""
        mock_response = MagicMock()
        mock_response.content = (
            b"<html><body><p>Line 1</p>\n\n\n\n<p>Line 2</p></body></html>"
        )
        mock_get.return_value = mock_response

        text = get_website_text("https://example.com/recipe")

        assert "\n\n\n" not in text


class TestIsBlacklistedDomain:
    """Tests for is_blacklisted_domain function."""

    def test_exact_match(self):
        """Should detect exact domain match."""
        assert is_blacklisted_domain("https://cooking.nytimes.com/recipe/123") is True

    def test_subdomain_match(self):
        """Should detect subdomain of blacklisted domain."""
        assert (
            is_blacklisted_domain("https://www.americastestkitchen.com/recipe") is True
        )

    def test_non_blacklisted(self):
        """Should allow non-blacklisted domains."""
        assert is_blacklisted_domain("https://allrecipes.com/recipe/123") is False

    def test_partial_match_not_blocked(self):
        """Should not block domains that contain but don't match blacklisted."""
        # "nytimes.com" is not blacklisted, only "cooking.nytimes.com"
        assert is_blacklisted_domain("https://nytimes.com/article") is False

    def test_invalid_url(self):
        """Should handle invalid URLs gracefully."""
        assert is_blacklisted_domain("not-a-url") is False
