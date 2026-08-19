import uuid
from sqlalchemy import Column, String, Numeric, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class InventoryItem(Base):
    """Mirrors `InventoryItem` in src/types/index.ts"""

    __tablename__ = "inventory_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id = Column(UUID(as_uuid=True), ForeignKey("businesses.id"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    name = Column(String, nullable=False)
    current_stock = Column(Numeric(12, 2), nullable=False, default=0)
    unit = Column(String, nullable=False)
    daily_velocity = Column(Numeric(12, 2), nullable=False, default=0)  # units sold/day, recent avg
    reorder_threshold = Column(Numeric(12, 2), nullable=False, default=0)

    business = relationship("Business", back_populates="inventory")
