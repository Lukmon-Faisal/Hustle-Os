import uuid
import enum
from sqlalchemy import Column, Numeric, Date, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class InvoiceStatus(str, enum.Enum):
    paid = "paid"
    pending = "pending"
    overdue = "overdue"


class InvoiceRecord(Base):
    """Mirrors `InvoiceRecord` in src/types/index.ts"""

    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    status = Column(Enum(InvoiceStatus), nullable=False, default=InvoiceStatus.pending)

    business = relationship("Business", back_populates="invoices")
