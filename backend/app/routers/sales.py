import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.business import Business
from app.models.sale import SaleTransaction
from app.schemas.sale import SaleCreate, SaleRead

router = APIRouter(prefix="/businesses/{business_id}/sales", tags=["sales"])


def _get_business_or_404(business_id: uuid.UUID, db: Session) -> Business:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business


@router.post("", response_model=SaleRead, status_code=201)
def create_sale(business_id: uuid.UUID, payload: SaleCreate, db: Session = Depends(get_db)):
    _get_business_or_404(business_id, db)
    sale = SaleTransaction(**payload.model_dump(), business_id=business_id)
    db.add(sale)
    db.commit()
    db.refresh(sale)
    return sale


@router.get("", response_model=list[SaleRead])
def list_sales(business_id: uuid.UUID, db: Session = Depends(get_db)):
    _get_business_or_404(business_id, db)
    return (
        db.query(SaleTransaction)
        .filter(SaleTransaction.business_id == business_id)
        .order_by(SaleTransaction.date.desc())
        .all()
    )
