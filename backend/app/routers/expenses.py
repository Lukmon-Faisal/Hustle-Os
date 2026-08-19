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
from app.models.expense import ExpenseTransaction
from app.schemas.expense import ExpenseCreate, ExpenseRead

router = APIRouter(prefix="/businesses/{business_id}/expenses", tags=["expenses"])

@router.post("", response_model=ExpenseRead, status_code=201)
def create_expense(business_id: uuid.UUID, payload: ExpenseCreate, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    item = ExpenseTransaction(**payload.model_dump(), business_id=business_id)
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.get("", response_model=list[ExpenseRead])
def list_expenses(business_id: uuid.UUID, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return db.query(ExpenseTransaction).filter(
        ExpenseTransaction.business_id == business_id
    ).order_by(ExpenseTransaction.date.desc()).all()
