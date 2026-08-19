import uuid
from datetime import date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ExpenseBase(BaseModel):
    date: date
    category: str
    supplier: Optional[str] = None
    amount: Decimal
    note: Optional[str] = None


class ExpenseCreate(ExpenseBase):
    pass


class ExpenseRead(ExpenseBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: uuid.UUID
