import uuid
from pydantic import BaseModel, ConfigDict


class BusinessBase(BaseModel):
    name: str
    type: str
    location: str
    years_operating: int = 0
    main_products: list[str] = []
    # E.164, no "whatsapp:" prefix — e.g. "+2348012345678". Set this to route
    # inbound WhatsApp messages from that number to this business.
    phone_number: str | None = None


class BusinessCreate(BusinessBase):
    pass


class BusinessRead(BusinessBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
