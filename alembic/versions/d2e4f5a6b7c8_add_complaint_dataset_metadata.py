"""add complaint dataset metadata

Revision ID: d2e4f5a6b7c8
Revises: c1a2b3d4e5f6
"""
from alembic import op
import sqlalchemy as sa

revision = 'd2e4f5a6b7c8'
down_revision = 'c1a2b3d4e5f6'
branch_labels = None
depends_on = None

def upgrade():
    record_type_enum = sa.Enum('LIVE','HISTORICAL_CLOSED','HISTORICAL_ACTIVE_SNAPSHOT', name='complaintrecordtype')
    record_type_enum.create(op.get_bind(), checkfirst=True)
    with op.batch_alter_table('complaints') as batch_op:
        batch_op.add_column(sa.Column('record_type', record_type_enum, nullable=False, server_default='LIVE'))
        batch_op.add_column(sa.Column('data_source', sa.String(length=100), nullable=False, server_default='CIVICSETU_LIVE'))
        batch_op.create_index('ix_complaints_record_type', ['record_type'])
        batch_op.create_index('ix_complaints_data_source', ['data_source'])

def downgrade():
    with op.batch_alter_table('complaints') as batch_op:
        batch_op.drop_index('ix_complaints_data_source')
        batch_op.drop_index('ix_complaints_record_type')
        batch_op.drop_column('data_source')
        batch_op.drop_column('record_type')
    sa.Enum(name='complaintrecordtype').drop(op.get_bind(), checkfirst=True)
