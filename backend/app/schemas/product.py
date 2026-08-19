import uuid
from pydantic import BaseModel, ConfigDict


class ProductBase(BaseModel):
    name: str
    unit: str


class ProductCreate(ProductBase):
    pass


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    business_id: uuid.UUID
