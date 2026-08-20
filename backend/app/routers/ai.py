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
from pydantic import BaseModel, Field
from app.db import get_db
from app.schemas.passport import BusinessPassportRead
from app.schemas.transaction import ParsedTransactionRead
from app.services import ai_service

router = APIRouter(prefix="/businesses/{business_id}", tags=["AI"])

class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)

class ParseTransactionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)

@router.get("/health")
def health(business_id: uuid.UUID, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return ai_service.health(db,business_id)

@router.get("/insights")
def insights(business_id: uuid.UUID, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return ai_service.insights(db,business_id)

@router.get("/anomalies")
def anomalies(business_id: uuid.UUID, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return ai_service.anomalies(db,business_id)

@router.get("/actions")
def actions(business_id: uuid.UUID, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return ai_service.actions(db,business_id)

@router.get("/passport", response_model=BusinessPassportRead)
def passport(business_id: uuid.UUID, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return ai_service.passport(db,business_id)

@router.post("/ask")
def ask(business_id: uuid.UUID, payload: AskRequest, db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return ai_service.answer(db,business_id,payload.question)

@router.post("/parse-transaction", response_model=ParsedTransactionRead)
def parse_transaction(business_id: uuid.UUID, payload: ParseTransactionRequest, db: Session = Depends(get_db)):
    """Extraction only — this writes nothing. The client pre-fills its quick-add
    form from the result and the vendor confirms with the existing Save button."""
    get_business_or_404(business_id, db)
    return ai_service.parse_transaction(payload.text)
