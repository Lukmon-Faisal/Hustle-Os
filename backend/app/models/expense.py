import uuid
from sqlalchemy import Column, String, Numeric, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class ExpenseTransaction(Base):
    """Mirrors `ExpenseTransaction` in src/types/index.ts"""

    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    category = Column(String, nullable=False)
    supplier = Column(String, nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    note = Column(String, nullable=True)

    business = relationship("Business", back_populates="expenses")
