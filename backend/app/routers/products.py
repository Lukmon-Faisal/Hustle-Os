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
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductRead

router = APIRouter(prefix="/businesses/{business_id}/products", tags=["products"])

@router.post("", response_model=ProductRead, status_code=201)
def create_product(business_id: uuid.UUID, payload: ProductCreate, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    item = Product(**payload.model_dump(), business_id=business_id)
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.get("", response_model=list[ProductRead])
def list_products(business_id: uuid.UUID, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return db.query(Product).filter(Product.business_id == business_id).order_by(Product.name).all()
