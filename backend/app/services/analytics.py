from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.sale import SaleTransaction
from app.models.expense import ExpenseTransaction
from app.models.customer import Customer
from app.models.inventory import InventoryItem
from app.models.supplier import Supplier, SupplierPricePoint

def _d(x): return x if isinstance(x, date) else date.fromisoformat(str(x))
def days_ago(n): return date.today() - timedelta(days=n)
def within_last(d, n): return _d(d) >= days_ago(n-1)
def _sum(q, field): return float(sum((getattr(x, field) or 0) for x in q))

def period_over_period(db: Session, business_id, days=30):
    sales = db.query(SaleTransaction).filter(SaleTransaction.business_id == business_id).all()
    expenses = db.query(ExpenseTransaction).filter(ExpenseTransaction.business_id == business_id).all()
    cutoff_now = days_ago(days-1)
    cutoff_prev = days_ago(days*2-1)
    rev_now = sum(float(s.amount) for s in sales if _d(s.date) >= cutoff_now)
    rev_prev = sum(float(s.amount) for s in sales if cutoff_prev <= _d(s.date) < cutoff_now)
    exp_now = sum(float(e.amount) for e in expenses if _d(e.date) >= cutoff_now)
    exp_prev = sum(float(e.amount) for e in expenses if cutoff_prev <= _d(e.date) < cutoff_now)
    def pct(a,b): return 0 if b == 0 else ((a-b)/b)*100
    return {
        "revenueNow": rev_now, "revenuePrev": rev_prev, "revenueChangePct": pct(rev_now, rev_prev),
        "expenseNow": exp_now, "expensePrev": exp_prev, "expenseChangePct": pct(exp_now, exp_prev),
        "profitNow": rev_now-exp_now, "profitPrev": rev_prev-exp_prev,
    }

def sales_by_product(db, business_id, days=30):
    sales = db.query(SaleTransaction).filter(SaleTransaction.business_id == business_id).all()
    out = {}
    cutoff = days_ago(days-1)
    for s in sales:
        if _d(s.date) >= cutoff:
            v=out.setdefault(s.product, {"revenue":0.0,"qty":0})
            v["revenue"] += float(s.amount); v["qty"] += int(s.quantity)
    return [{"product": k, **v} for k,v in out.items()]

def product_growth(db, business_id, product, days=30):
    sales = db.query(SaleTransaction).filter(
        SaleTransaction.business_id == business_id, SaleTransaction.product == product
    ).all()
    now_cut=days_ago(days-1); prev_cut=days_ago(days*2-1)
    now=sum(float(s.amount) for s in sales if _d(s.date)>=now_cut)
    prev=sum(float(s.amount) for s in sales if prev_cut<=_d(s.date)<now_cut)
    return {"now":now,"prev":prev,"changePct":0 if prev==0 else ((now-prev)/prev)*100}

def expenses_by_category(db,business_id,days=30):
    expenses=db.query(ExpenseTransaction).filter(ExpenseTransaction.business_id==business_id).all()
    cutoff=days_ago(days-1); out={}
    for e in expenses:
        if _d(e.date)>=cutoff: out[e.category]=out.get(e.category,0)+float(e.amount)
    return [{"category":k,"amount":v} for k,v in out.items()]

def repeat_customer_rate(db,business_id):
    customers=db.query(Customer).filter(Customer.business_id==business_id).all()
    active=[c for c in customers if c.orders_count>0]
    if not active: return 0
    return round(sum(1 for c in active if c.orders_count>1)/len(active)*100)

def active_sales_days(db,business_id,days=30):
    """Distinct calendar days inside the window with at least one logged sale.
    Counts sale records rather than revenue, so a legitimately zero-value sale
    still marks the day as active."""
    sales=db.query(SaleTransaction).filter(SaleTransaction.business_id==business_id).all()
    cutoff=days_ago(days-1)
    return len({_d(s.date) for s in sales if _d(s.date)>=cutoff})

def inventory_days_remaining(item):
    v=float(item.daily_velocity or 0)
    if v<=0: return None
    return round(float(item.current_stock or 0)/v,2)

def supplier_price_change(db,business_id,supplier_id):
    supplier=db.get(Supplier,supplier_id)
    if not supplier or supplier.business_id!=business_id: return None
    pts=db.query(SupplierPricePoint).filter(SupplierPricePoint.supplier_id==supplier_id).order_by(SupplierPricePoint.date).all()
    if len(pts)<2: return None
    first,last=float(pts[0].unit_price),float(pts[-1].unit_price)
    return {"first":first,"last":last,"changePct":0 if first==0 else ((last-first)/first)*100}

def daily_series(db,business_id,days=30):
    sales=db.query(SaleTransaction).filter(SaleTransaction.business_id==business_id).all()
    expenses=db.query(ExpenseTransaction).filter(ExpenseTransaction.business_id==business_id).all()
    out=[]
    for i in range(days-1,-1,-1):
        d=days_ago(i)
        r=sum(float(s.amount) for s in sales if _d(s.date)==d)
        e=sum(float(x.amount) for x in expenses if _d(x.date)==d)
        out.append({"date":str(d),"revenue":r,"expenses":e,"profit":r-e})
    return out

def weekly_series(db,business_id,weeks=4):
    sales=db.query(SaleTransaction).filter(SaleTransaction.business_id==business_id).all()
    expenses=db.query(ExpenseTransaction).filter(ExpenseTransaction.business_id==business_id).all()
    out=[]
    for w in range(weeks-1,-1,-1):
        start,end=days_ago(w*7+6),days_ago(w*7)
        r=sum(float(s.amount) for s in sales if start<=_d(s.date)<=end)
        e=sum(float(x.amount) for x in expenses if start<=_d(x.date)<=end)
        out.append({"week":f"Wk {weeks-w}","revenue":r,"expenses":e,"profit":r-e})
    return out
