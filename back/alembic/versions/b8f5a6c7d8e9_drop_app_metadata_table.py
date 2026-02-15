"""drop_app_metadata_table

Revision ID: b8f5a6c7d8e9
Revises: a1b2c3d4e5f6
Create Date: 2026-02-15 16:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b8f5a6c7d8e9"
down_revision: str | Sequence[str] | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Drop obsolete bootstrap metadata table."""
    op.execute(sa.text("DROP TABLE IF EXISTS app_metadata"))


def downgrade() -> None:
    """Recreate app_metadata table for backward compatibility."""
    op.create_table(
        "app_metadata",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(255), unique=True, nullable=False),
        sa.Column("value", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
    )
