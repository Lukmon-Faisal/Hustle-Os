import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.business import Business

def get_business_or_404(business_id: uuid.UUID, db: Session) -> Business:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

from fastapi import APIRouter, Depends
from app.db import get_db
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerRead

router = APIRouter(prefix="/businesses/{business_id}/customers", tags=["customers"])

@router.post("", response_model=CustomerRead, status_code=201)
def create_customer(business_id: uuid.UUID, payload: CustomerCreate, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    item = Customer(**payload.model_dump(), business_id=business_id)
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.get("", response_model=list[CustomerRead])
def list_customers(business_id: uuid.UUID, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return db.query(Customer).filter(Customer.business_id == business_id).order_by(Customer.name).all()
