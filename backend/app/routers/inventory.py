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
from app.models.inventory import InventoryItem
from app.models.product import Product
from app.schemas.inventory import InventoryItemCreate, InventoryItemRead

router = APIRouter(prefix="/businesses/{business_id}/inventory", tags=["inventory"])

@router.post("", response_model=InventoryItemRead, status_code=201)
def create_inventory_item(business_id: uuid.UUID, payload: InventoryItemCreate, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    product = db.get(Product, payload.product_id)
    if not product or product.business_id != business_id:
        raise HTTPException(status_code=400, detail="Product does not belong to this business")
    item = InventoryItem(**payload.model_dump(), business_id=business_id)
    db.add(item); db.commit(); db.refresh(item)
    return item

@router.get("", response_model=list[InventoryItemRead])
def list_inventory(business_id: uuid.UUID, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return db.query(InventoryItem).filter(
        InventoryItem.business_id == business_id
    ).order_by(InventoryItem.name).all()
