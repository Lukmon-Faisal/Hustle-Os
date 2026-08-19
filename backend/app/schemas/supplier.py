import uuid
from datetime import date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict


class SupplierPricePointBase(BaseModel):
    date: date
    unit_price: Decimal


class SupplierPricePointCreate(SupplierPricePointBase):
    pass


class SupplierPricePointRead(SupplierPricePointBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    supplier_id: uuid.UUID


class SupplierBase(BaseModel):
    name: str
    category: str


class SupplierCreate(SupplierBase):
    pass


class SupplierRead(SupplierBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: uuid.UUID
    price_history: list[SupplierPricePointRead] = []
