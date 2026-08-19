import uuid
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class InventoryItemBase(BaseModel):
    product_id: uuid.UUID
    name: str
    current_stock: Decimal
    unit: str
    daily_velocity: Decimal
    reorder_threshold: Decimal


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryItemRead(InventoryItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: uuid.UUID
