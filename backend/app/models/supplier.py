import uuid
from sqlalchemy import Column, String, Numeric, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class Supplier(Base):
    """Mirrors `Supplier` in src/types/index.ts (priceHistory is its own table
    here rather than a JSON blob, so analytics like supplierPriceChange can
    query it directly)."""

    __tablename__ = "suppliers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)

    business = relationship("Business", back_populates="suppliers")
    price_history = relationship(
        "SupplierPricePoint", back_populates="supplier", cascade="all, delete-orphan"
    )


class SupplierPricePoint(Base):
    """Mirrors one entry of `Supplier.priceHistory` in src/types/index.ts"""

    __tablename__ = "supplier_price_points"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    supplier_id = Column(UUID(as_uuid=True), ForeignKey("suppliers.id"), nullable=False, index=True)
    date = Column(Date, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)

    supplier = relationship("Supplier", back_populates="price_history")
