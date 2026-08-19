import uuid
from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict

from app.models.sale import PaymentMethod


class SaleBase(BaseModel):
    date: date
    product: str
    quantity: int
    amount: Decimal
    payment_method: PaymentMethod
    customer_id: Optional[uuid.UUID] = None


class SaleCreate(SaleBase):
    pass


class SaleRead(SaleBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: uuid.UUID
