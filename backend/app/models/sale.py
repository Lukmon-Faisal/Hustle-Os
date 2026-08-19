import uuid
from sqlalchemy import Column, String, Integer, Numeric, Date, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.db import Base


class PaymentMethod(str, enum.Enum):
    transfer = "transfer"
    cash = "cash"
    pos = "pos"
    credit = "credit"


class SaleTransaction(Base):
    """Mirrors `SaleTransaction` in src/types/index.ts"""

    __tablename__ = "sales"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    product = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    payment_method = Column(Enum(PaymentMethod), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=True)

    business = relationship("Business", back_populates="sales")
