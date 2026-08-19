from app.services.analytics import (
    period_over_period, sales_by_product, product_growth, expenses_by_category,
    repeat_customer_rate, inventory_days_remaining, supplier_price_change
)
from app.models.inventory import InventoryItem
from app.models.supplier import Supplier

def money(n): return f"₦{n:,.0f}"
def clamp(n): return max(5,min(98,round(n)))

def _items(db,bid): return db.query(InventoryItem).filter(InventoryItem.business_id==bid).all()

def health(db,bid):
    p=period_over_period(db,bid,30); rr=repeat_customer_rate(db,bid)
    inv=next((x for x in _items(db,bid) if x.name.lower()=="chicken"),None)
    inv_score=70 if not inv else clamp(60+(inventory_days_remaining(inv) or 0-2)*8)
    comps=[
      {"key":"revenue","label":"Revenue consistency","labelPidgin":"Money wey enter, e steady?","score":clamp(60+p["revenueChangePct"])},
      {"key":"expense","label":"Expense control","labelPidgin":"Expense control","score":clamp(75-max(0,p["expenseChangePct"]-p["revenueChangePct"])*1.4)},
      {"key":"retention","label":"Customer retention","labelPidgin":"Customer wey dey return","score":clamp(rr+10)},
      {"key":"inventory","label":"Inventory health","labelPidgin":"Stock health","score":inv_score},
      {"key":"cashflow","label":"Cash-flow health","labelPidgin":"Cash-flow health","score":clamp(55+(min(30,p["profitNow"]/max(1,p["revenueNow"])*150) if p["profitNow"]>0 else -20))},
    ]
    overall=round(sum(x["score"] for x in comps)/len(comps))
    if overall>=75: s="Your business is healthy overall, but expenses need attention."; sp="Your business dey healthy, but expenses need attention."
    elif overall>=55: s="Your business is steady, with a few areas that need attention."; sp="Your business dey managed, but some areas need attention."
    else: s="Your business needs attention in more than one area right now."; sp="Your business need attention for more than one area now."
    return {"overall":overall,"components":comps,"summary":s,"summaryPidgin":sp}

def insights(db,bid):
    out=[]; p=period_over_period(db,bid,30)
    for product in ["Chicken","Drinks"]:
        g=product_growth(db,bid,product,30)
        if g["now"]>0 and (product=="Chicken" or g["changePct"]>5):
            out.append({"id":f"{product.lower()}-growth","kind":"fact","title":f"{product} sales are up {round(g['changePct'])}% this month","titlePidgin":f"{product} sales don increase {round(g['changePct'])}%","detail":f"{product} brought in {money(g['now'])} in the last 30 days.","detailPidgin":f"{product} bring {money(g['now'])} for the last 30 days.","severity":"positive"})
    rr=repeat_customer_rate(db,bid)
    if rr>0: out.append({"id":"repeat-customers","kind":"fact","title":f"{rr}% of your customers came back this period","titlePidgin":f"{rr}% of your customers come back","detail":"Repeat customers are a strong share of your order volume.","detailPidgin":"Repeat customers dey drive plenty of your orders.","severity":"positive"})
    if p["expenseChangePct"]>p["revenueChangePct"]:
        out.append({"id":"expenses-outpacing","kind":"inference","title":"Expenses are growing faster than revenue","titlePidgin":"Expenses dey rise pass the money wey dey enter","detail":f"Revenue moved {round(p['revenueChangePct'])}% while expenses moved {round(p['expenseChangePct'])}%.","detailPidgin":"Money wey enter change, but expenses dey rise faster.","severity":"warning"})
    tops=sorted(sales_by_product(db,bid,30),key=lambda x:x["revenue"],reverse=True)
    if tops:
        t=tops[0]; out.append({"id":"top-product","kind":"fact","title":f"{t['product']} is your top earner this month","titlePidgin":f"{t['product']} na your number one product this month","detail":f"It brought in {money(t['revenue'])} across {t['qty']} units sold.","detailPidgin":f"E bring {money(t['revenue'])} from {t['qty']} units wey sell.","severity":"neutral"})
    return out

def anomalies(db,bid):
    out=[]
    inv=next((x for x in _items(db,bid) if x.name.lower()=="chicken"),None)
    if inv:
        d=inventory_days_remaining(inv)
        if d is not None and d<=3: out.append({"id":"anomaly-chicken-stock","kind":"inference","title":"Chicken stock is running low","titlePidgin":"Chicken stock dey finish","detail":f"At the current selling pace, chicken may run out in about {d} day(s).","detailPidgin":f"If the pace continue, chicken fit finish for about {d} day(s).","severity":"critical"})
    return out

def actions(db,bid):
    out=[]
    inv=next((x for x in _items(db,bid) if x.name.lower()=="chicken"),None)
    if inv:
        d=inventory_days_remaining(inv)
        if d is not None and d<=5: out.append({"id":"action-restock","priority":"medium","title":"Chicken stock is low","titlePidgin":"Chicken stock low","why":f"Only about {d} day(s) of chicken stock remain at the current sales pace.","whyPidgin":f"Na about {d} day(s) of chicken stock remain.","impact":"Avoids turning away chicken orders during a busy week.","impactPidgin":"E go stop you from turn away chicken customers.","nextStep":"Plan a restock before the weekend rush.","nextStepPidgin":"Plan restock before weekend rush reach."})
    g=product_growth(db,bid,"Drinks",30)
    if g["changePct"]>8: out.append({"id":"action-drinks-opportunity","priority":"opportunity","title":"Drinks sales are increasing","titlePidgin":"Drinks sales dey increase","why":f"Drinks revenue is up {round(g['changePct'])}%.","whyPidgin":f"Drinks money increase {round(g['changePct'])}%.","impact":"A small stock increase could capture more of this demand.","impactPidgin":"If you increase stock small, you fit sell more.","nextStep":"Consider increasing drinks stock by 15-20% next order.","nextStepPidgin":"Try increase drinks stock small for next order."})
    return out

def passport(db,bid):
    from app.models.business import Business
    b=db.get(Business,bid); p30=period_over_period(db,bid,30); p90=period_over_period(db,bid,90)
    rr=repeat_customer_rate(db,bid)
    sales_count=len(b.sales)
    inv=next((x for x in _items(db,bid) if x.name.lower()=="chicken"),None)
    days=inventory_days_remaining(inv) if inv else None
    return {
      "businessName":b.name,"operatingHistoryMonths":b.years_operating*12,
      "verifiedActivityMonths":min(b.years_operating*12,14),
      "revenueConsistency":"Strong" if p90["revenueChangePct"]>=10 else ("Moderate" if p90["revenueChangePct"]>=0 else "Weak"),
      "transactionConsistency":"Strong" if sales_count>800 else ("Moderate" if sales_count>300 else "Weak"),
      "customerRetentionPct":rr,
      "expenseStability":"Strong" if abs(p30["expenseChangePct"]-p30["revenueChangePct"])<5 else ("Moderate" if abs(p30["expenseChangePct"]-p30["revenueChangePct"])<20 else "Weak"),
      "inventoryEfficiency":"Excellent" if days is not None and days>5 else "Good",
      "cashFlowHealth":"Strong" if p30["profitNow"]>p30["profitPrev"] else ("Moderate" if p30["profitNow"]>0 else "Weak"),
      "signals":[
        {"label":"Business activity verified","verified":sales_count>0},
        {"label":"Transaction history available","verified":sales_count>0},
        {"label":"Revenue pattern available","verified":sales_count>20},
        {"label":"Customer activity available","verified":len(b.customers)>0},
        {"label":"Invoice/payment history available","verified":len(b.invoices)>0},
      ]
    }

def answer(db,bid,question):
    q=question.lower(); p=period_over_period(db,bid,30); rr=repeat_customer_rate(db,bid)
    tops=sorted(sales_by_product(db,bid,30),key=lambda x:x["revenue"],reverse=True)
    if q.find("profit")>=0 and any(x in q for x in ["reduce","why","drop","fall"]):
        if p["profitNow"]>=p["profitPrev"]: return {"en":f"Good news — your profit actually grew, from {money(p['profitPrev'])} to {money(p['profitNow'])} over the last 30 days.","pcm":f"Good news — your profit grow, from {money(p['profitPrev'])} to {money(p['profitNow'])} for the last 30 days."}
        return {"en":f"Your sales moved {round(p['revenueChangePct'])}%, but expenses moved {round(p['expenseChangePct'])}% over the same period. Review supplier costs and pricing.","pcm":f"Your sales change {round(p['revenueChangePct'])}%, but expenses change {round(p['expenseChangePct'])}%. Check supplier cost and pricing."}
    if any(x in q for x in ["top product","sell the most","best sell","sell pass"]):
        if not tops: return {"en":"I don't have enough sales data to answer that yet.","pcm":"I no get enough information to answer that yet."}
        t=tops[0]; return {"en":f"{t['product']} is selling the most, bringing in {money(t['revenue'])} from {t['qty']} units in the last 30 days.","pcm":f"{t['product']} dey sell pass, e bring {money(t['revenue'])} from {t['qty']} units for the last 30 days."}
    if "customer" in q and any(x in q for x in ["return","repeat","retention"]):
        return {"en":f"{rr}% of your customers returned within this period.","pcm":f"{rr}% of your customers come back for this period."}
    if "sales" in q and any(x in q for x in ["drop","fall"]):
        return {"en":f"Your sales {'increased' if p['revenueChangePct']>=0 else 'fell'} {abs(round(p['revenueChangePct']))}% over the last 30 days.","pcm":f"Your sales {'increase' if p['revenueChangePct']>=0 else 'reduce'} {abs(round(p['revenueChangePct']))}% for the last 30 days."}
    return {"en":"I don't have enough information to answer that yet. Try asking about profit, top-selling products, expenses, or customer retention.","pcm":"I no get enough information to answer that yet. Try ask about profit, wetin dey sell pass, expenses, or customer retention."}
