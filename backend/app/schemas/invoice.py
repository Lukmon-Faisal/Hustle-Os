import uuid
from datetime import date
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

from app.models.invoice import InvoiceStatus


class InvoiceBase(BaseModel):
    date: date
    customer_id: uuid.UUID
    amount: Decimal
    status: InvoiceStatus = InvoiceStatus.pending


class InvoiceCreate(InvoiceBase):
    pass


class InvoiceRead(InvoiceBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: uuid.UUID
