import re

from app.services.analytics import (
    period_over_period, sales_by_product, product_growth,
    repeat_customer_rate, inventory_days_remaining, supplier_price_change
)
from app.models.inventory import InventoryItem
from app.models.supplier import Supplier

def money(n): return f"₦{n:,.0f}"
def clamp(n): return max(5,min(98,round(n)))
def _slug(s): return re.sub(r"[^a-z0-9]+","-",str(s).lower()).strip("-") or "item"

# Thresholds live here rather than inline so the rules stay readable and the
# LLM narration layer (phase 3) can quote the same numbers it triggered on.
LOW_STOCK_ANOMALY_DAYS = 3
LOW_STOCK_ACTION_DAYS = 5
SUPPLIER_JUMP_PCT = 10
SUPPLIER_INSIGHT_PCT = 5
PRODUCT_GROWTH_PCT = 5
MAX_GROWTH_INSIGHTS = 2
MAX_SUPPLIER_INSIGHTS = 2

def _items(db,bid): return db.query(InventoryItem).filter(InventoryItem.business_id==bid).all()
def _suppliers(db,bid): return db.query(Supplier).filter(Supplier.business_id==bid).all()

def _stock_cover(db,bid):
    """(item, days_of_cover) for every inventory item we can measure, scarcest
    first. Items with no recorded velocity are skipped — zero velocity carries
    no signal about whether the item is running out."""
    out=[]
    for it in _items(db,bid):
        d=inventory_days_remaining(it)
        if d is not None: out.append((it,d))
    return sorted(out,key=lambda x:x[1])

def _price_rises(db,bid):
    """(supplier, change) for suppliers whose unit price went up, steepest
    first. Derived from whichever suppliers the business actually has."""
    out=[]
    for s in _suppliers(db,bid):
        ch=supplier_price_change(db,bid,s.id)
        if ch and ch["changePct"]>0: out.append((s,ch))
    return sorted(out,key=lambda x:x[1]["changePct"],reverse=True)

def _growing_products(db,bid,days=30):
    """(product, growth) for products growing faster than PRODUCT_GROWTH_PCT,
    fastest first. Products come from real sales, not a fixed list."""
    out=[]
    for row in sales_by_product(db,bid,days):
        g=product_growth(db,bid,row["product"],days)
        if g["now"]>0 and g["changePct"]>PRODUCT_GROWTH_PCT: out.append((row["product"],g))
    return sorted(out,key=lambda x:x[1]["changePct"],reverse=True)

def health(db,bid):
    p=period_over_period(db,bid,30); rr=repeat_customer_rate(db,bid)
    cover=_stock_cover(db,bid)
    # Averaged across every measurable item. Individual at-risk items are not
    # lost to the average — anomalies() and actions() surface them by name.
    inv_score=70 if not cover else round(sum(clamp(60+(d-2)*8) for _,d in cover)/len(cover))
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
    tops=sorted(sales_by_product(db,bid,30),key=lambda x:x["revenue"],reverse=True)

    if tops:
        t=tops[0]
        out.append({"id":"top-product","kind":"fact","title":f"{t['product']} is your top earner this month","titlePidgin":f"{t['product']} na your number one product this month","detail":f"It brought in {money(t['revenue'])} across {t['qty']} units sold.","detailPidgin":f"E bring {money(t['revenue'])} from {t['qty']} units wey sell.","severity":"neutral"})

    for i,(name,g) in enumerate(_growing_products(db,bid)[:MAX_GROWTH_INSIGHTS]):
        out.append({"id":f"growth-{i}-{_slug(name)}","kind":"fact","title":f"{name} sales are up {round(g['changePct'])}% this month","titlePidgin":f"{name} sales don increase {round(g['changePct'])}%","detail":f"{name} brought in {money(g['now'])} in the last 30 days, up from {money(g['prev'])}.","detailPidgin":f"{name} bring {money(g['now'])} for the last 30 days, e pass the {money(g['prev'])} of before.","severity":"positive"})

    rr=repeat_customer_rate(db,bid)
    if rr>0: out.append({"id":"repeat-customers","kind":"fact","title":f"{rr}% of your customers came back this period","titlePidgin":f"{rr}% of your customers come back","detail":"Repeat customers are a strong share of your order volume.","detailPidgin":"Repeat customers dey drive plenty of your orders.","severity":"positive"})

    for i,(s,ch) in enumerate([x for x in _price_rises(db,bid) if x[1]["changePct"]>=SUPPLIER_INSIGHT_PCT][:MAX_SUPPLIER_INSIGHTS]):
        out.append({"id":f"supplier-{i}-{_slug(s.name)}","kind":"fact","title":f"Your {s.category} cost from {s.name} rose {round(ch['changePct'])}%","titlePidgin":f"{s.name} price for {s.category} don increase {round(ch['changePct'])}%","detail":f"{s.name}'s unit price moved from {money(ch['first'])} to {money(ch['last'])}.","detailPidgin":f"{s.name} price change from {money(ch['first'])} to {money(ch['last'])}.","severity":"warning"})

    if p["expenseChangePct"]>p["revenueChangePct"]:
        out.append({"id":"expenses-outpacing","kind":"inference","title":"Expenses are growing faster than revenue","titlePidgin":"Expenses dey rise pass the money wey dey enter","detail":f"Revenue moved {round(p['revenueChangePct'])}% while expenses moved {round(p['expenseChangePct'])}%.","detailPidgin":"Money wey enter change, but expenses dey rise faster.","severity":"warning"})

    return out

def anomalies(db,bid):
    out=[]
    for i,(it,d) in enumerate(_stock_cover(db,bid)):
        if d<=LOW_STOCK_ANOMALY_DAYS:
            out.append({"id":f"anomaly-stock-{i}-{_slug(it.name)}","kind":"inference","title":f"{it.name} stock is running low","titlePidgin":f"{it.name} stock dey finish","detail":f"At the current selling pace, {it.name.lower()} may run out in about {d} day(s).","detailPidgin":f"If the pace continue, {it.name.lower()} fit finish for about {d} day(s).","severity":"critical"})

    for i,(s,ch) in enumerate(_price_rises(db,bid)):
        if ch["changePct"]>=SUPPLIER_JUMP_PCT:
            out.append({"id":f"anomaly-price-{i}-{_slug(s.name)}","kind":"inference","title":f"Unusual price jump from {s.name}","titlePidgin":f"Something dey wrong with {s.name} price","detail":f"{s.name}'s price rose {round(ch['changePct'])}% — sharper than a typical monthly change.","detailPidgin":f"{s.name} price rise {round(ch['changePct'])}% — e pass normal monthly change.","severity":"critical"})

    return out

def actions(db,bid):
    out=[]
    for i,(s,ch) in enumerate(_price_rises(db,bid)):
        if ch["changePct"]>=SUPPLIER_JUMP_PCT:
            out.append({"id":f"action-supplier-{i}-{_slug(s.name)}","priority":"high","title":f"{s.name}'s price has increased","titlePidgin":f"{s.name} price don increase","why":f"{s.category} cost rose {round(ch['changePct'])}%, squeezing your margin.","whyPidgin":f"{s.category} cost rise {round(ch['changePct'])}%, e dey chop your profit.","impact":f"Protects your margin on anything you sell using {s.category}.","impactPidgin":f"E go protect your profit for anything wey use {s.category}.","nextStep":f"Compare prices with at least one alternative {s.category} supplier this week.","nextStepPidgin":f"Compare price with one next {s.category} supplier this week."})

    for i,(it,d) in enumerate(_stock_cover(db,bid)):
        if d<=LOW_STOCK_ACTION_DAYS:
            out.append({"id":f"action-restock-{i}-{_slug(it.name)}","priority":"medium","title":f"{it.name} stock is low","titlePidgin":f"{it.name} stock low","why":f"Only about {d} day(s) of {it.name.lower()} remain at the current sales pace.","whyPidgin":f"Na about {d} day(s) of {it.name.lower()} remain.","impact":f"Avoids turning away {it.name.lower()} orders during a busy week.","impactPidgin":f"E go stop you from turn away {it.name.lower()} customers.","nextStep":f"Plan a {it.name.lower()} restock before the weekend rush.","nextStepPidgin":f"Plan {it.name.lower()} restock before weekend rush reach."})

    for i,(name,g) in enumerate(_growing_products(db,bid)[:MAX_GROWTH_INSIGHTS]):
        out.append({"id":f"action-grow-{i}-{_slug(name)}","priority":"opportunity","title":f"{name} sales are increasing","titlePidgin":f"{name} sales dey increase","why":f"{name} revenue is up {round(g['changePct'])}% — customers are buying more.","whyPidgin":f"{name} money increase {round(g['changePct'])}% — customers dey buy more.","impact":"A small stock increase could capture more of this demand.","impactPidgin":"If you increase stock small, you fit sell more.","nextStep":f"Consider increasing {name.lower()} stock by 15-20% next order.","nextStepPidgin":f"Try increase {name.lower()} stock small, like 15-20% for next order."})

    return out

def passport(db,bid):
    from app.models.business import Business
    b=db.get(Business,bid); p30=period_over_period(db,bid,30); p90=period_over_period(db,bid,90)
    rr=repeat_customer_rate(db,bid)
    sales_count=len(b.sales)
    cover=_stock_cover(db,bid)
    # Share of stock lines about to run out, rather than average cover:
    # averaging lets one well-stocked item hide an item that runs out tomorrow,
    # and this rating is meant as evidence about how the business is really run.
    at_risk=sum(1 for _,d in cover if d<=LOW_STOCK_ACTION_DAYS)
    if not cover: inv_eff="Good"
    elif at_risk==0: inv_eff="Excellent"
    elif at_risk/len(cover)<=0.5: inv_eff="Good"
    else: inv_eff="Needs work"
    return {
      "businessName":b.name,"operatingHistoryMonths":b.years_operating*12,
      "verifiedActivityMonths":min(b.years_operating*12,14),
      "revenueConsistency":"Strong" if p90["revenueChangePct"]>=10 else ("Moderate" if p90["revenueChangePct"]>=0 else "Weak"),
      "transactionConsistency":"Strong" if sales_count>800 else ("Moderate" if sales_count>300 else "Weak"),
      "customerRetentionPct":rr,
      "expenseStability":"Strong" if abs(p30["expenseChangePct"]-p30["revenueChangePct"])<5 else ("Moderate" if abs(p30["expenseChangePct"]-p30["revenueChangePct"])<20 else "Weak"),
      "inventoryEfficiency":inv_eff,
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
