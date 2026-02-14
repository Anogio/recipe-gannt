"""Tests for logic.py - core business logic."""

import datetime
from unittest.mock import MagicMock, patch

import pytest

from logic import (
    PlannedStep,
    RecipeGraph,
    Step,
    can_fetch_content,
    filter_accessible_urls,
    get_website_text,
    make_gannt,
    parse_recipe_graph,
    plan_steps,
    to_time,
    visit_recipe_graph,
)


class TestParseRecipeGraph:
    """Tests for parse_recipe_graph function."""

    def test_parse_valid_json(self, sample_recipe_graph_json):
        """Should parse valid JSON into RecipeGraph."""
        graph = parse_recipe_graph(sample_recipe_graph_json)

        assert isinstance(graph, RecipeGraph)
        assert len(graph.steps) == 7
        assert len(graph.dependencies) == 6

    def test_parse_step_properties(self, sample_recipe_graph_json):
        """Should correctly parse step properties."""
        graph = parse_recipe_graph(sample_recipe_graph_json)

        step1 = next(s for s in graph.steps if s.step_id == 1)
        assert step1.name == "Beat eggs with salt and parmesan"
        assert step1.duration == 3
        assert step1.ingredients == ["4 eggs", "parmesan", "salt"]

    def test_parse_null_duration(self, sample_recipe_graph_json):
        """Should handle null duration values."""
        graph = parse_recipe_graph(sample_recipe_graph_json)

        step5 = next(s for s in graph.steps if s.step_id == 5)
        assert step5.duration is None

    def test_parse_dependencies(self, sample_recipe_graph_json):
        """Should correctly parse dependencies."""
        graph = parse_recipe_graph(sample_recipe_graph_json)

        dep = graph.dependencies[0]
        assert dep.id_depended_step == 1  # "do"
        assert dep.id_dependent_step == 7  # "before"

    def test_parse_empty_ingredients(self, sample_recipe_graph_json):
        """Should handle empty ingredient lists."""
        graph = parse_recipe_graph(sample_recipe_graph_json)

        step5 = next(s for s in graph.steps if s.step_id == 5)
        assert step5.ingredients == []


class TestVisitRecipeGraph:
    """Tests for visit_recipe_graph function (topological sort)."""

    def test_linear_graph_order(self, sample_recipe_graph_linear_json):
        """Should return correct order for linear dependencies."""
        graph = parse_recipe_graph(sample_recipe_graph_linear_json)
        order = visit_recipe_graph(graph)

        assert order == [1, 2, 3]

    def test_parallel_graph_order(self, sample_recipe_graph_parallel_json):
        """Should handle parallel steps correctly."""
        graph = parse_recipe_graph(sample_recipe_graph_parallel_json)
        order = visit_recipe_graph(graph)

        # Steps 1 and 2 can be in any order, but must come before 3
        assert order.index(1) < order.index(3)
        assert order.index(2) < order.index(3)
        assert len(order) == 3

    def test_complex_graph_order(self, sample_recipe_graph_json):
        """Should handle complex dependency graph."""
        graph = parse_recipe_graph(sample_recipe_graph_json)
        order = visit_recipe_graph(graph)

        # Verify all steps are visited
        assert len(order) == 7

        # Verify dependency constraints
        assert order.index(2) < order.index(4)  # boil water before cook pasta
        assert order.index(3) < order.index(5)  # cook pancetta before reserve
        assert order.index(4) < order.index(6)  # cook pasta before drain
        assert order.index(5) < order.index(6)  # reserve before drain
        assert order.index(6) < order.index(7)  # drain before mix

    def test_no_dependencies(self):
        """Should handle graph with no dependencies."""
        json_str = '{"steps": [{"id": 1, "name": "A"}, {"id": 2, "name": "B"}], "dependencies": []}'
        graph = parse_recipe_graph(json_str)
        order = visit_recipe_graph(graph)

        assert len(order) == 2
        assert set(order) == {1, 2}


class TestPlanSteps:
    """Tests for plan_steps function."""

    def test_linear_planning(self, sample_recipe_graph_linear_json):
        """Should plan linear steps sequentially."""
        graph = parse_recipe_graph(sample_recipe_graph_linear_json)
        planned = plan_steps(graph)

        # Sort by step_id for consistent checking
        by_id = {p.step_id: p for p in planned}

        assert by_id[1].start_time == 0
        assert by_id[1].end_time == 5
        assert by_id[2].start_time == 5
        assert by_id[2].end_time == 8
        assert by_id[3].start_time == 8
        assert by_id[3].end_time == 10

    def test_parallel_planning(self, sample_recipe_graph_parallel_json):
        """Should plan parallel steps at the same time."""
        graph = parse_recipe_graph(sample_recipe_graph_parallel_json)
        planned = plan_steps(graph)

        by_id = {p.step_id: p for p in planned}

        # Parallel steps start at 0
        assert by_id[1].start_time == 0
        assert by_id[2].start_time == 0
        # Final step starts after longest parallel step
        assert by_id[3].start_time == 5  # max(5, 3)

    def test_planned_step_properties(self, sample_recipe_graph_json):
        """Should preserve step properties in planning."""
        graph = parse_recipe_graph(sample_recipe_graph_json)
        planned = plan_steps(graph)

        step1 = next(p for p in planned if p.step_id == 1)
        assert step1.name == "Beat eggs with salt and parmesan"
        assert step1.duration_minutes == 3
        assert step1.ingredients == ["4 eggs", "parmesan", "salt"]

    def test_null_duration_handling(self, sample_recipe_graph_json):
        """Should handle null duration as 0 for end time calculation."""
        graph = parse_recipe_graph(sample_recipe_graph_json)
        planned = plan_steps(graph)

        step5 = next(p for p in planned if p.step_id == 5)
        assert step5.duration_minutes is None
        assert step5.end_time == step5.start_time  # 0 duration

    def test_dependencies_preserved(self, sample_recipe_graph_json):
        """Should preserve dependencies in planned steps."""
        graph = parse_recipe_graph(sample_recipe_graph_json)
        planned = plan_steps(graph)

        step7 = next(p for p in planned if p.step_id == 7)
        assert 6 in step7.dependencies
        assert 1 in step7.dependencies


class TestToTime:
    """Tests for to_time helper function."""

    def test_zero_offset(self):
        """Should return base datetime for zero offset."""
        result = to_time(0)
        assert result == datetime.datetime(2000, 1, 1, 0, 0)

    def test_positive_offset(self):
        """Should add minutes correctly."""
        result = to_time(90)
        assert result == datetime.datetime(2000, 1, 1, 1, 30)

    def test_large_offset(self):
        """Should handle large offsets crossing days."""
        result = to_time(1500)  # 25 hours
        assert result == datetime.datetime(2000, 1, 2, 1, 0)


class TestMakeGannt:
    """Tests for make_gannt function."""

    def test_creates_figure(self, sample_recipe_graph_json):
        """Should create a plotly figure."""
        graph = parse_recipe_graph(sample_recipe_graph_json)
        planned = plan_steps(graph)
        fig = make_gannt(planned)

        assert fig is not None
        assert hasattr(fig, "to_image")

    def test_empty_steps(self):
        """Empty steps list raises KeyError (no columns in dataframe)."""
        with pytest.raises(KeyError):
            make_gannt([])


class TestCanFetchContent:
    """Tests for can_fetch_content function."""

    @patch("logic.requests.get")
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

    @patch("logic.requests.get")
    def test_non_200_status(self, mock_get):
        """Should return False for non-200 status."""
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response

        assert can_fetch_content("https://example.com/recipe") is False

    @patch("logic.requests.get")
    def test_short_content(self, mock_get):
        """Should return False for short content."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b"<html><body>Short</body></html>"
        mock_get.return_value = mock_response

        assert can_fetch_content("https://example.com/recipe") is False

    @patch("logic.requests.get")
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

    @patch("logic.requests.get")
    def test_no_body(self, mock_get):
        """Should return False if no body element."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.content = b"<html></html>"
        mock_get.return_value = mock_response

        assert can_fetch_content("https://example.com/recipe") is False

    @patch("logic.requests.get")
    def test_exception_handling(self, mock_get):
        """Should return False on exception."""
        mock_get.side_effect = Exception("Connection error")

        assert can_fetch_content("https://example.com/recipe") is False


class TestFilterAccessibleUrls:
    """Tests for filter_accessible_urls function."""

    @patch("logic.can_fetch_content")
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

    @patch("logic.can_fetch_content")
    def test_empty_list(self, mock_can_fetch):
        """Should handle empty list."""
        filtered = filter_accessible_urls([])
        assert filtered == []


class TestGetWebsiteText:
    """Tests for get_website_text function."""

    @patch("logic.requests.get")
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

    @patch("logic.requests.get")
    def test_collapses_newlines(self, mock_get):
        """Should collapse multiple newlines."""
        mock_response = MagicMock()
        mock_response.content = (
            b"<html><body><p>Line 1</p>\n\n\n\n<p>Line 2</p></body></html>"
        )
        mock_get.return_value = mock_response

        text = get_website_text("https://example.com/recipe")

        assert "\n\n\n" not in text


class TestPlannedStepDataclass:
    """Tests for PlannedStep dataclass properties."""

    def test_end_time_with_duration(self):
        """Should calculate end_time correctly with duration."""
        step = PlannedStep(
            name="Test",
            start_time=10,
            duration_minutes=5,
            step_id=1,
            dependencies=[],
            ingredients=[],
        )
        assert step.end_time == 15

    def test_end_time_without_duration(self):
        """Should handle None duration for end_time."""
        step = PlannedStep(
            name="Test",
            start_time=10,
            duration_minutes=None,
            step_id=1,
            dependencies=[],
            ingredients=[],
        )
        assert step.end_time == 10

    def test_start_date_property(self):
        """Should convert start_time to datetime."""
        step = PlannedStep(
            name="Test",
            start_time=60,
            duration_minutes=5,
            step_id=1,
            dependencies=[],
            ingredients=[],
        )
        assert step.start_date == datetime.datetime(2000, 1, 1, 1, 0)

    def test_end_date_property(self):
        """Should convert end_time to datetime."""
        step = PlannedStep(
            name="Test",
            start_time=60,
            duration_minutes=30,
            step_id=1,
            dependencies=[],
            ingredients=[],
        )
        assert step.end_date == datetime.datetime(2000, 1, 1, 1, 30)
