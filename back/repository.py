"""Repository for database operations."""

import logging
from datetime import UTC, datetime

from sqlalchemy import desc
from sqlalchemy.orm import Session

from models import RecipeHistory

logger = logging.getLogger(__name__)


class RecipeHistoryRepository:
    """Repository for recipe history operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_url(self, url: str) -> RecipeHistory | None:
        """Fetch a cached recipe by URL."""
        return self.db.query(RecipeHistory).filter(RecipeHistory.url == url).first()

    def upsert(
        self, url: str, title: str, snippet: str, planned_steps: list[dict]
    ) -> RecipeHistory:
        """Insert or update a recipe in the history."""
        existing = self.get_by_url(url)

        if existing:
            existing.title = title
            existing.snippet = snippet
            existing.planned_steps = planned_steps
            existing.updated_at = datetime.now(UTC)
            self.db.commit()
            self.db.refresh(existing)
            logger.info(f"Updated cached recipe: {url}")
            return existing

        recipe = RecipeHistory(
            url=url,
            title=title,
            snippet=snippet,
            planned_steps=planned_steps,
        )
        self.db.add(recipe)
        self.db.commit()
        self.db.refresh(recipe)
        logger.info(f"Cached new recipe: {url}")
        return recipe

    def touch(self, url: str) -> bool:
        """Update the updated_at timestamp to move recipe to top of popular list."""
        recipe = self.get_by_url(url)
        if recipe:
            recipe.updated_at = datetime.now(UTC)
            self.db.commit()
            logger.info(f"Touched recipe (cache hit): {url}")
            return True
        return False

    def get_popular(self, limit: int = 10) -> list[RecipeHistory]:
        """Get the most recently accessed recipes."""
        return (
            self.db.query(RecipeHistory)
            .order_by(desc(RecipeHistory.updated_at))
            .limit(limit)
            .all()
        )
