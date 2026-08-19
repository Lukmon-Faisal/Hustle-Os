import uuid
from sqlalchemy import Column, String, Integer, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.db import Base


class Business(Base):
    """Mirrors the `Business` interface in src/types/index.ts"""

    __tablename__ = "businesses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)
    location = Column(String, nullable=False)
    years_operating = Column(Integer, nullable=False, default=0)
    main_products = Column(ARRAY(String), nullable=False, default=list)

    sales = relationship("SaleTransaction", back_populates="business", cascade="all, delete-orphan")
    expenses = relationship("ExpenseTransaction", back_populates="business", cascade="all, delete-orphan")
    invoices = relationship("InvoiceRecord", back_populates="business", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    inventory = relationship("InventoryItem", back_populates="business", cascade="all, delete-orphan")
    customers = relationship("Customer", back_populates="business", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="business", cascade="all, delete-orphan")
