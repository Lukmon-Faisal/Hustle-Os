import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.business import Business
from app.schemas.business import BusinessCreate, BusinessRead

router = APIRouter(prefix="/businesses", tags=["businesses"])


@router.post("", response_model=BusinessRead, status_code=201)
def create_business(payload: BusinessCreate, db: Session = Depends(get_db)):
    business = Business(**payload.model_dump())
    db.add(business)
    db.commit()
    db.refresh(business)
    return business


@router.get("", response_model=list[BusinessRead])
def list_businesses(db: Session = Depends(get_db)):
    return db.query(Business).all()


@router.get("/{business_id}", response_model=BusinessRead)
def get_business(business_id: uuid.UUID, db: Session = Depends(get_db)):
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business
