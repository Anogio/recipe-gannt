"""create_recipe_history

Revision ID: a1b2c3d4e5f6
Revises: dfb5cadcd953
Create Date: 2026-02-15 14:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | Sequence[str] | None = "dfb5cadcd953"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Create recipe_history table."""
    op.create_table(
        "recipe_history",
        sa.Column("url", sa.String(2048), primary_key=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("snippet", sa.Text(), server_default="", nullable=False),
        sa.Column("planned_steps", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )
    # Create index for popular recipes query (most recently used first)
    op.create_index(
        "ix_recipe_history_updated_at",
        "recipe_history",
        [sa.text("updated_at DESC")],
    )


def downgrade() -> None:
    """Drop recipe_history table."""
    op.drop_index("ix_recipe_history_updated_at", table_name="recipe_history")
    op.drop_table("recipe_history")
