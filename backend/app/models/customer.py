import uuid
from sqlalchemy import Column, String, Integer, Numeric, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class Customer(Base):
    """Mirrors `Customer` in src/types/index.ts"""

    __tablename__ = "customers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    first_seen = Column(Date, nullable=False)
    orders_count = Column(Integer, nullable=False, default=0)
    total_spend = Column(Numeric(12, 2), nullable=False, default=0)
    last_order_date = Column(Date, nullable=True)

    business = relationship("Business", back_populates="customers")
