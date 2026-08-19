import uuid
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.business import Business

def get_business_or_404(business_id: uuid.UUID, db: Session) -> Business:
    business = db.get(Business, business_id)
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business

from fastapi import APIRouter, Depends, Query
from app.db import get_db
from app.services import analytics

router = APIRouter(prefix="/businesses/{business_id}/analytics", tags=["analytics"])

@router.get("/summary")
def summary(business_id: uuid.UUID, days: int = Query(30, ge=7, le=365), db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    p=analytics.period_over_period(db,business_id,days)
    return {
        "periodDays": days,
        **p,
        "salesByProduct": analytics.sales_by_product(db,business_id,days),
        "expensesByCategory": analytics.expenses_by_category(db,business_id,days),
        "repeatCustomerRate": analytics.repeat_customer_rate(db,business_id),
    }

@router.get("/daily")
def daily(business_id: uuid.UUID, days: int = Query(30, ge=7, le=90), db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return analytics.daily_series(db,business_id,days)

@router.get("/weekly")
def weekly(business_id: uuid.UUID, weeks: int = Query(4, ge=1, le=52), db: Session = Depends(get_db)):
    get_business_or_404(business_id, db)
    return analytics.weekly_series(db,business_id,weeks)
