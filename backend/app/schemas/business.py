import uuid
from pydantic import BaseModel, ConfigDict


class BusinessBase(BaseModel):
    name: str
    type: str
    location: str
    years_operating: int = 0
    main_products: list[str] = []


class BusinessCreate(BusinessBase):
    pass


class BusinessRead(BusinessBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
