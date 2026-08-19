import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.business import Business

def get_business_or_404(business_id: uuid.UUID, db: Session) -> Business:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

from fastapi import APIRouter, Depends, HTTPException
from app.db import get_db
from app.models.invoice import InvoiceRecord
from app.models.customer import Customer
from app.schemas.invoice import InvoiceCreate, InvoiceRead

router = APIRouter(prefix="/businesses/{business_id}/invoices", tags=["invoices"])

@router.post("", response_model=InvoiceRead, status_code=201)
def create_invoice(business_id: uuid.UUID, payload: InvoiceCreate, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    customer = db.get(Customer, payload.customer_id)
    if not customer or customer.business_id != business_id:
        raise HTTPException(status_code=400, detail="Customer does not belong to this business")
    item = InvoiceRecord(**payload.model_dump(), business_id=business_id)
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.get("", response_model=list[InvoiceRead])
def list_invoices(business_id: uuid.UUID, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return db.query(InvoiceRecord).filter(
        InvoiceRecord.business_id == business_id
    ).order_by(InvoiceRecord.date.desc()).all()
