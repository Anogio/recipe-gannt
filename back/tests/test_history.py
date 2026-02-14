"""Tests for history.py - recipe history storage."""

import pytest

from history import RecipeHistory, RecipeHistoryEntry


@pytest.fixture
def history():
    """Create a fresh RecipeHistory for each test."""
    return RecipeHistory(max_size=5)


class TestRecipeHistoryEntry:
    """Tests for RecipeHistoryEntry dataclass."""

    def test_creation(self):
        """Should create entry with all fields."""
        entry = RecipeHistoryEntry(
            title="Pasta Carbonara",
            url="https://example.com/pasta",
            snippet="Delicious Italian pasta",
        )
        assert entry.title == "Pasta Carbonara"
        assert entry.url == "https://example.com/pasta"
        assert entry.snippet == "Delicious Italian pasta"


class TestRecipeHistoryAdd:
    """Tests for RecipeHistory.add method."""

    @pytest.mark.asyncio
    async def test_add_single_entry(self, history):
        """Should add a single entry."""
        await history.add(title="Recipe 1", url="https://example.com/1", snippet="Test")

        entries = await history.get_all()
        assert len(entries) == 1
        assert entries[0].title == "Recipe 1"

    @pytest.mark.asyncio
    async def test_add_multiple_entries(self, history):
        """Should add multiple entries."""
        await history.add(title="Recipe 1", url="https://example.com/1")
        await history.add(title="Recipe 2", url="https://example.com/2")
        await history.add(title="Recipe 3", url="https://example.com/3")

        entries = await history.get_all()
        assert len(entries) == 3

    @pytest.mark.asyncio
    async def test_most_recent_first(self, history):
        """Should return most recent entries first."""
        await history.add(title="First", url="https://example.com/1")
        await history.add(title="Second", url="https://example.com/2")
        await history.add(title="Third", url="https://example.com/3")

        entries = await history.get_all()
        assert entries[0].title == "Third"
        assert entries[1].title == "Second"
        assert entries[2].title == "First"

    @pytest.mark.asyncio
    async def test_update_existing_moves_to_top(self, history):
        """Should move existing entry to top when re-added."""
        await history.add(title="Recipe A", url="https://example.com/a")
        await history.add(title="Recipe B", url="https://example.com/b")
        await history.add(title="Recipe C", url="https://example.com/c")

        # Re-add Recipe A
        await history.add(title="Recipe A Updated", url="https://example.com/a")

        entries = await history.get_all()
        assert len(entries) == 3
        assert entries[0].title == "Recipe A Updated"
        assert entries[0].url == "https://example.com/a"

    @pytest.mark.asyncio
    async def test_max_size_enforced(self, history):
        """Should enforce max size limit."""
        for i in range(10):
            await history.add(title=f"Recipe {i}", url=f"https://example.com/{i}")

        entries = await history.get_all()
        assert len(entries) == 5  # max_size is 5

    @pytest.mark.asyncio
    async def test_oldest_removed_when_full(self, history):
        """Should remove oldest entries when max size exceeded."""
        for i in range(7):
            await history.add(title=f"Recipe {i}", url=f"https://example.com/{i}")

        entries = await history.get_all()
        urls = [e.url for e in entries]

        # Oldest entries (0, 1) should be removed
        assert "https://example.com/0" not in urls
        assert "https://example.com/1" not in urls
        # Newest entries should remain
        assert "https://example.com/6" in urls
        assert "https://example.com/5" in urls

    @pytest.mark.asyncio
    async def test_empty_snippet_default(self, history):
        """Should handle empty snippet."""
        await history.add(title="Recipe", url="https://example.com/r", snippet="")

        entries = await history.get_all()
        assert entries[0].snippet == ""


class TestRecipeHistoryGetAll:
    """Tests for RecipeHistory.get_all method."""

    @pytest.mark.asyncio
    async def test_empty_history(self, history):
        """Should return empty list for empty history."""
        entries = await history.get_all()
        assert entries == []

    @pytest.mark.asyncio
    async def test_returns_copy(self, history):
        """Should return a copy, not the internal structure."""
        await history.add(title="Recipe", url="https://example.com/r")

        entries1 = await history.get_all()
        entries2 = await history.get_all()

        assert entries1 is not entries2


class TestRecipeHistoryInit:
    """Tests for RecipeHistory initialization."""

    def test_default_max_size(self):
        """Should use default max size."""
        history = RecipeHistory()
        assert history._max_size == 100

    def test_custom_max_size(self):
        """Should accept custom max size."""
        history = RecipeHistory(max_size=50)
        assert history._max_size == 50

    @pytest.mark.asyncio
    async def test_starts_empty(self):
        """Should start with empty entries."""
        history = RecipeHistory()
        entries = await history.get_all()
        assert entries == []
