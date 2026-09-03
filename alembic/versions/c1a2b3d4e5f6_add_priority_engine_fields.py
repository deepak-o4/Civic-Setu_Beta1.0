"""add_priority_engine_fields

Revision ID: c1a2b3d4e5f6
Revises: b933bb56486b
Create Date: 2026-08-25 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, None] = 'b933bb56486b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### CivicSetu Priority Engine: explainable priority scoring fields ###
    with op.batch_alter_table('complaints', schema=None) as batch_op:
        batch_op.add_column(sa.Column('priority_score', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('priority_breakdown', sa.JSON(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### CivicSetu Priority Engine: explainable priority scoring fields ###
    with op.batch_alter_table('complaints', schema=None) as batch_op:
        batch_op.drop_column('priority_breakdown')
        batch_op.drop_column('priority_score')
    # ### end Alembic commands ###
