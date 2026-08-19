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
from app.models.supplier import Supplier, SupplierPricePoint
from app.schemas.supplier import (
    SupplierCreate, SupplierRead, SupplierPricePointCreate, SupplierPricePointRead
)

router = APIRouter(prefix="/businesses/{business_id}/suppliers", tags=["suppliers"])

@router.post("", response_model=SupplierRead, status_code=201)
def create_supplier(business_id: uuid.UUID, payload: SupplierCreate, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    item = Supplier(**payload.model_dump(), business_id=business_id)
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.get("", response_model=list[SupplierRead])
def list_suppliers(business_id: uuid.UUID, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return db.query(Supplier).filter(Supplier.business_id == business_id).order_by(Supplier.name).all()

@router.post("/{supplier_id}/prices", response_model=SupplierPricePointRead, status_code=201)
def add_price_point(
    business_id: uuid.UUID, supplier_id: uuid.UUID,
    payload: SupplierPricePointCreate, db: Session = Depends(get_db)
):
    get_business_or_404(business_id, db)
    supplier = db.get(Supplier, supplier_id)
    if not supplier or supplier.business_id != business_id:
        raise HTTPException(status_code=404, detail="Supplier not found")
    point = SupplierPricePoint(**payload.model_dump(), supplier_id=supplier_id)
    db.add(point); db.commit(); db.refresh(point)
    return point

@router.get("/{supplier_id}/prices", response_model=list[SupplierPricePointRead])
def list_price_points(
    business_id: uuid.UUID, supplier_id: uuid.UUID, db: Session = Depends(get_db)
):
    get_business_or_404(business_id, db)
    supplier = db.get(Supplier, supplier_id)
    if not supplier or supplier.business_id != business_id:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return db.query(SupplierPricePoint).filter(
        SupplierPricePoint.supplier_id == supplier_id
    ).order_by(SupplierPricePoint.date).all()
