import threading
from collections import OrderedDict
from dataclasses import dataclass


@dataclass
class RecipeHistoryEntry:
    title: str
    url: str
    snippet: str


class RecipeHistory:
    """Thread-safe in-memory storage for recently processed recipes.

    Uses threading.Lock for compatibility with both sync and async contexts.
    """

    def __init__(self, max_size: int = 100):
        self._max_size = max_size
        self._entries: OrderedDict[str, RecipeHistoryEntry] = OrderedDict()
        self._lock = threading.Lock()

    def add(self, title: str, url: str, snippet: str = "") -> None:
        """Add or update a recipe in history. Most recent first."""
        with self._lock:
            # Remove if exists (to re-add at end)
            if url in self._entries:
                del self._entries[url]

            # Add new entry
            self._entries[url] = RecipeHistoryEntry(
                title=title, url=url, snippet=snippet
            )

            # Trim to max size (remove oldest)
            while len(self._entries) > self._max_size:
                self._entries.popitem(last=False)

    def get_all(self) -> list[RecipeHistoryEntry]:
        """Return all entries, most recent first."""
        with self._lock:
            return list(reversed(self._entries.values()))


recipe_history = RecipeHistory(max_size=100)
