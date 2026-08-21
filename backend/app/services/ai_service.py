import json
import logging
import os
import re
from datetime import datetime, timezone

import anthropic
from fastapi import HTTPException

from app.services.analytics import (
    period_over_period, sales_by_product, product_growth, expenses_by_category,
    repeat_customer_rate, inventory_days_remaining, supplier_price_change,
    daily_series, active_sales_days
)
from app.models.inventory import InventoryItem
from app.models.product import Product
from app.models.supplier import Supplier

log = logging.getLogger(__name__)

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

# --- passport / lending contract -------------------------------------------
# Deliberately explicit: an underwriter has to be able to read the policy off
# the code, and a tier that moves because a constant was buried inline is not
# an explainable credit decision.
PASSPORT_WINDOW_DAYS = 30
CREDIT_LIMIT_RATIO = 0.30      # conservative share of 30-day gross revenue
EXPENSE_CV_HIGH = 0.35         # coefficient of variation at or under this = "High"
EXPENSE_CV_MEDIUM = 0.75       # ...and at or under this = "Medium"
MIN_EXPENSE_DAYS_FOR_CV = 3    # below this, variance is not meaningful

# --- /ask LLM configuration ------------------------------------------------
# claude-3-5-haiku-20241022 was retired 2026-02-19; claude-haiku-4-5 is the
# current fastest/cheapest tier and the direct replacement for that tier.
ASK_MODEL = "claude-haiku-4-5"
ASK_MAX_TOKENS = 2048

ASK_SYSTEM = (
    "You are Hustle OS, a brilliant AI business analyst for Nigerian informal vendors. "
    "Speak in clear, warm Nigerian Pidgin. Base your answers strictly on the provided "
    "JSON financial data. Do not invent or hallucinate financial figures. You must "
    "return ONLY raw JSON, with no markdown formatting, no backticks, and no preamble."
)

# Passed as output_config.format, which constrains decoding to this schema — the
# three keys are guaranteed present rather than merely requested in the prompt.
ASK_SCHEMA = {
    "type": "object",
    "properties": {
        "fact": {"type": "string", "description": "What the data says."},
        "inference": {"type": "string", "description": "What it means."},
        "recommendation": {"type": "string", "description": "What to do next."},
    },
    "required": ["fact", "inference", "recommendation"],
    "additionalProperties": False,
}

# --- /insights narration configuration -------------------------------------
NARRATE_MODEL = ASK_MODEL          # same fast tier; both paths are latency-sensitive
NARRATE_MAX_TOKENS = 4096

# Only the prose is the model's job. `id`, `kind` and `severity` stay
# deterministic: InsightCard.tsx does KIND_LABEL[insight.kind][lang], so a kind
# outside the frontend's union is `undefined[lang]` — a TypeError that takes the
# whole Dashboard render down. Severity drives a CSS class and id is a React
# key, so those are not the model's to guess either.
NARRATION_KEYS = ("title", "titlePidgin", "detail", "detailPidgin")

NARRATE_SYSTEM = (
    "You are Hustle OS, an AI business analyst for Nigerian informal vendors. Your job is "
    "to narrate financial data into warm, natural Nigerian Pidgin. Do not hallucinate "
    "numbers. You must return ONLY a raw JSON array of objects, with no markdown "
    "formatting, no backticks, and no preamble. The JSON keys MUST exactly match this "
    'structure for each item: {"id": string, "title": string, "titlePidgin": string, '
    '"detail": string, "detailPidgin": string}. '
    "Return the array under the key \"insights\". Echo each trigger's id back exactly as "
    "given so each narration can be matched to its trigger. `title` and `detail` are "
    "English; `titlePidgin` and `detailPidgin` are Nigerian Pidgin — not translations of "
    "each other word for word, but the same point said naturally in each. Keep titles "
    "under 12 words and details to one or two sentences. Use only figures that appear in "
    "that trigger's `facts`, and let its `tone` set how urgent you sound."
)

NARRATE_SCHEMA = {
    "type": "object",
    "properties": {
        "insights": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "title": {"type": "string"},
                    "titlePidgin": {"type": "string"},
                    "detail": {"type": "string"},
                    "detailPidgin": {"type": "string"},
                },
                "required": ["id", "title", "titlePidgin", "detail", "detailPidgin"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["insights"],
    "additionalProperties": False,
}

# --- /parse-transaction configuration --------------------------------------
PARSE_MAX_TOKENS = 512
# How far back to mine sale history for names the vendor already uses, and how
# many to send. The cap keeps the prompt bounded for a business with a long tail
# of one-off products.
PRODUCT_HISTORY_DAYS = 90
MAX_KNOWN_PRODUCTS = 60

PARSE_SYSTEM = (
    "You are an entity extraction engine for a Nigerian business app. The user will "
    "provide a natural language string, often in Nigerian Pidgin, describing a business "
    "transaction. Extract the data and return ONLY raw JSON matching this schema exactly: "
    "{ 'type': 'sale' or 'expense', 'item_name': string, 'amount': number, "
    "'quantity': number (default to 1) }. Do not include markdown or backticks."
    "\n\n"
    "NAMING THE ITEM. item_name is always a clean standard name: Title Case, singular, "
    "no quantity, no unit, no verb, no serving word. Containers and servings are never "
    "part of the name — 'I buy 3 bag of cement' gives 'Cement', 'two plates of moin moin' "
    "gives 'Moin Moin'. "
    "This holds whether or not a list of KNOWN ITEMS is supplied, because the first "
    "transaction a new business records becomes the spelling everything later matches to."
    "\n\n"
    "When the message DOES list KNOWN ITEMS and the phrase plainly refers to one of them, "
    "that overrides the rule above: copy the known item EXACTLY — character for character, "
    "same spelling and capitalisation. Do not re-spell it, re-case it, pluralise it, or "
    "bolt units onto it. 'plate of jollof', '3 plates jollof rice' and 'jollof' all refer "
    "to the known item 'Jollof Rice'; 'two bags of rice' refers to the known item 'Rice'. "
    "Invent a new name only when the phrase clearly refers to something absent from the list."
)

PARSE_SCHEMA = {
    "type": "object",
    "properties": {
        "type": {"type": "string", "enum": ["sale", "expense"]},
        "item_name": {"type": "string"},
        "amount": {"type": "number"},
        "quantity": {"type": "number"},
    },
    "required": ["type", "item_name", "amount", "quantity"],
    "additionalProperties": False,
}

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

def _insight_triggers(db,bid):
    """The deterministic half of insights(): every trigger the math fires, with
    the raw figures behind it and ready-made prose.

    `kind`/`severity` are decided here, never by the model. `facts` is the only
    thing the narrator may quote numbers from. `fallback` is the Phase-1 wording,
    used verbatim whenever narration is unavailable — so the Dashboard degrades
    to plainer English rather than to nothing."""
    out=[]; p=period_over_period(db,bid,30)
    tops=sorted(sales_by_product(db,bid,30),key=lambda x:x["revenue"],reverse=True)

    if tops:
        t=tops[0]
        out.append({
          "id":"top-product","kind":"fact","severity":"neutral","topic":"top_selling_product",
          "facts":{"product":t["product"],"revenue_ngn":round(t["revenue"],2),"units_sold":t["qty"],"period_days":30},
          "fallback":{
            "title":f"{t['product']} is your top earner this month",
            "titlePidgin":f"{t['product']} na your number one product this month",
            "detail":f"It brought in {money(t['revenue'])} across {t['qty']} units sold.",
            "detailPidgin":f"E bring {money(t['revenue'])} from {t['qty']} units wey sell.",
          },
        })

    for i,(name,g) in enumerate(_growing_products(db,bid)[:MAX_GROWTH_INSIGHTS]):
        out.append({
          "id":f"growth-{i}-{_slug(name)}","kind":"fact","severity":"positive","topic":"product_growing",
          "facts":{"product":name,"revenue_now_ngn":round(g["now"],2),"revenue_previous_ngn":round(g["prev"],2),"change_pct":round(g["changePct"],1),"period_days":30},
          "fallback":{
            "title":f"{name} sales are up {round(g['changePct'])}% this month",
            "titlePidgin":f"{name} sales don increase {round(g['changePct'])}%",
            "detail":f"{name} brought in {money(g['now'])} in the last 30 days, up from {money(g['prev'])}.",
            "detailPidgin":f"{name} bring {money(g['now'])} for the last 30 days, e pass the {money(g['prev'])} of before.",
          },
        })

    rr=repeat_customer_rate(db,bid)
    if rr>0:
        out.append({
          "id":"repeat-customers","kind":"fact","severity":"positive","topic":"repeat_customers",
          "facts":{"repeat_customer_rate_pct":rr,"period_days":30},
          "fallback":{
            "title":f"{rr}% of your customers came back this period",
            "titlePidgin":f"{rr}% of your customers come back",
            "detail":"Repeat customers are a strong share of your order volume.",
            "detailPidgin":"Repeat customers dey drive plenty of your orders.",
          },
        })

    for i,(s,ch) in enumerate([x for x in _price_rises(db,bid) if x[1]["changePct"]>=SUPPLIER_INSIGHT_PCT][:MAX_SUPPLIER_INSIGHTS]):
        out.append({
          "id":f"supplier-{i}-{_slug(s.name)}","kind":"fact","severity":"warning","topic":"supplier_price_rise",
          "facts":{"supplier":s.name,"category":s.category,"first_price_ngn":ch["first"],"last_price_ngn":ch["last"],"change_pct":round(ch["changePct"],1)},
          "fallback":{
            "title":f"Your {s.category} cost from {s.name} rose {round(ch['changePct'])}%",
            "titlePidgin":f"{s.name} price for {s.category} don increase {round(ch['changePct'])}%",
            "detail":f"{s.name}'s unit price moved from {money(ch['first'])} to {money(ch['last'])}.",
            "detailPidgin":f"{s.name} price change from {money(ch['first'])} to {money(ch['last'])}.",
          },
        })

    if p["revenueChangePct"]<0:
        drop=abs(round(p["revenueChangePct"]))
        out.append({
          "id":"revenue-drop","kind":"inference","severity":"warning","topic":"revenue_declined",
          "facts":{"revenue_now_ngn":round(p["revenueNow"],2),"revenue_previous_ngn":round(p["revenuePrev"],2),"change_pct":round(p["revenueChangePct"],1),"period_days":30},
          "fallback":{
            "title":f"Revenue fell {drop}% compared with the previous 30 days",
            "titlePidgin":f"Money wey enter reduce {drop}% pass the last 30 days",
            "detail":f"Sales brought in {money(p['revenueNow'])}, down from {money(p['revenuePrev'])}.",
            "detailPidgin":f"Sales bring {money(p['revenueNow'])}, e reduce from {money(p['revenuePrev'])}.",
          },
        })

    if p["expenseChangePct"]>p["revenueChangePct"]:
        out.append({
          "id":"expenses-outpacing","kind":"inference","severity":"warning","topic":"expenses_outpacing_revenue",
          "facts":{"revenue_change_pct":round(p["revenueChangePct"],1),"expense_change_pct":round(p["expenseChangePct"],1),"period_days":30},
          "fallback":{
            "title":"Expenses are growing faster than revenue",
            "titlePidgin":"Expenses dey rise pass the money wey dey enter",
            "detail":f"Revenue moved {round(p['revenueChangePct'])}% while expenses moved {round(p['expenseChangePct'])}%.",
            "detailPidgin":"Money wey enter change, but expenses dey rise faster.",
          },
        })

    return out

def _narrate(triggers):
    """Narrate every trigger in ONE batch call.

    Returns {trigger_id: {narration keys}}. Any failure — missing key, network,
    rate limit, malformed JSON — returns {} so insights() falls back to the
    deterministic prose. The except is deliberately broad: unlike /ask, which is
    user-initiated and should surface its error, this runs on every Dashboard
    load and must never be the reason the page fails to render."""
    api_key=os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        log.warning("ANTHROPIC_API_KEY is not set — serving deterministic insight text.")
        return {}

    payload=[{"id":t["id"],"topic":t["topic"],"tone":t["severity"],"facts":t["facts"]} for t in triggers]
    try:
        client=anthropic.Anthropic(api_key=api_key)
        resp=client.messages.create(
            model=NARRATE_MODEL,
            max_tokens=NARRATE_MAX_TOKENS,
            system=NARRATE_SYSTEM,
            messages=[{"role":"user","content":(
                f"Narrate these {len(payload)} triggers — exactly one object per trigger, "
                "keeping each trigger's id:\n\n"
                f"{json.dumps(payload,ensure_ascii=False,indent=2)}"
            )}],
            output_config={"format":{"type":"json_schema","schema":NARRATE_SCHEMA}},
        )
        data=json.loads(_strip_fence(next((b.text for b in resp.content if b.type=="text"),"")))
        rows=data.get("insights") if isinstance(data,dict) else data
        narrated={}
        for r in rows or []:
            rid=str(r.get("id") or "")
            if rid:
                narrated[rid]={k:str(r.get(k) or "").strip() for k in NARRATION_KEYS}
        missing=[t["id"] for t in triggers if t["id"] not in narrated]
        if missing:
            log.warning("Narration missing for %s — using deterministic text for those.", missing)
        return narrated
    except Exception:
        log.exception("Insight narration failed — falling back to deterministic text.")
        return {}

def insights(db,bid):
    triggers=_insight_triggers(db,bid)
    if not triggers:
        return []

    narrated=_narrate(triggers)
    out=[]
    for t in triggers:
        n=narrated.get(t["id"]) or {}
        fb=t["fallback"]
        # Key order mirrors the Insight interface in src/types/index.ts. Prose
        # comes from the model when present, deterministic text otherwise; the
        # enums and the id always come from the trigger.
        out.append({
          "id":t["id"],
          "kind":t["kind"],
          "title":n.get("title") or fb["title"],
          "titlePidgin":n.get("titlePidgin") or fb["titlePidgin"],
          "detail":n.get("detail") or fb["detail"],
          "detailPidgin":n.get("detailPidgin") or fb["detailPidgin"],
          "severity":t["severity"],
        })
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

def _expense_stability_index(db,bid,days=PASSPORT_WINDOW_DAYS):
    """Volatility of daily expense totals, as an explainable three-way index.

    Uses the coefficient of variation across the days that actually recorded
    expenses. Vendors buy in bursts — a weekly restock means most days are
    legitimately zero — so treating empty days as data would mark nearly every
    honest business unstable. Below MIN_EXPENSE_DAYS_FOR_CV there is not enough
    signal to speak to variance, so fall back to how far expense growth has
    diverged from revenue growth over the same window."""
    vals=[r["expenses"] for r in daily_series(db,bid,days) if r["expenses"]>0]
    if len(vals)>=MIN_EXPENSE_DAYS_FOR_CV:
        mean=sum(vals)/len(vals)
        if mean>0:
            cv=(sum((v-mean)**2 for v in vals)/len(vals))**0.5/mean
            if cv<=EXPENSE_CV_HIGH: return "High"
            if cv<=EXPENSE_CV_MEDIUM: return "Medium"
            return "Low"
    p=period_over_period(db,bid,days)
    gap=abs(p["expenseChangePct"]-p["revenueChangePct"])
    if gap<5: return "High"
    if gap<20: return "Medium"
    return "Low"

def _inventory_health_status(db,bid):
    """Phase-1 share-at-risk rule, mapped onto the lending contract's wording.

    Averaging cover would let one well-stocked line hide a line that runs out
    tomorrow, so this counts the share of lines inside the reorder window. With
    no measurable inventory there is nothing to verify in either direction —
    reporting 'Excellent' off the back of no data would overstate the business
    to an underwriter, so unverifiable lands in the middle."""
    cover=_stock_cover(db,bid)
    if not cover: return "Needs Work"
    at_risk=sum(1 for _,d in cover if d<=LOW_STOCK_ACTION_DAYS)
    if at_risk==0: return "Excellent"
    if at_risk/len(cover)<=0.5: return "Needs Work"
    return "Critical"

def passport(db,bid):
    """Deterministic credit passport. Same rows in, same payload out — the only
    field that moves between identical calls is last_calculated_at."""
    revenue=round(period_over_period(db,bid,PASSPORT_WINDOW_DAYS)["revenueNow"],2)
    active_days=active_sales_days(db,bid,PASSPORT_WINDOW_DAYS)
    score=round(active_days/PASSPORT_WINDOW_DAYS*100)

    if score>80 and revenue>0: tier="A"
    elif score>50: tier="B"
    elif score>20: tier="C"
    else: tier="D"

    return {
      "credit_risk_tier":tier,
      "recommended_credit_limit_ngn":round(revenue*CREDIT_LIMIT_RATIO,2),
      "thirty_day_gross_revenue":revenue,
      "transaction_consistency_score":score,
      "expense_stability_index":_expense_stability_index(db,bid),
      "inventory_health_status":_inventory_health_status(db,bid),
      # Fixed true pending a real KYC integration — see schemas/passport.py.
      "kyc_data_verifiability":True,
      "last_calculated_at":datetime.now(timezone.utc).isoformat(),
    }

def ask_context(db,bid,days=30):
    """The grounded facts handed to the model, built from existing helpers.

    Every figure here is read out of the database. The system prompt tells the
    model to reason only over this JSON and invent nothing, so anything not in
    here is something the model cannot legitimately talk about."""
    p=period_over_period(db,bid,days)
    products=sorted(sales_by_product(db,bid,days),key=lambda x:x["revenue"],reverse=True)
    expenses=sorted(expenses_by_category(db,bid,days),key=lambda x:x["amount"],reverse=True)
    return {
      "currency":"NGN",
      "period_days":days,
      "revenue":{"now":round(p["revenueNow"],2),"previous":round(p["revenuePrev"],2),"change_pct":round(p["revenueChangePct"],1)},
      "expenses":{"now":round(p["expenseNow"],2),"previous":round(p["expensePrev"],2),"change_pct":round(p["expenseChangePct"],1)},
      "profit":{"now":round(p["profitNow"],2),"previous":round(p["profitPrev"],2)},
      "top_products":[{"product":r["product"],"revenue":round(r["revenue"],2),"units_sold":r["qty"]} for r in products[:5]],
      "top_expense_categories":[{"category":r["category"],"amount":round(r["amount"],2)} for r in expenses[:5]],
      "inventory":[{"item":it.name,"stock":float(it.current_stock or 0),"unit":it.unit,"days_of_cover":d} for it,d in _stock_cover(db,bid)[:10]],
      "repeat_customer_rate_pct":repeat_customer_rate(db,bid),
      "supplier_price_changes":[{"supplier":s.name,"category":s.category,"first_price":ch["first"],"last_price":ch["last"],"change_pct":round(ch["changePct"],1)} for s,ch in _price_rises(db,bid)[:5]],
    }

def _strip_fence(t):
    """output_config.format already guarantees raw JSON, so this is belt-and-braces:
    if a future model or config change ever wraps the object in a ```json fence,
    strip it rather than turning a cosmetic slip into a failed request."""
    t=(t or "").strip()
    if t.startswith("```"):
        t=re.sub(r"^```[a-zA-Z]*\s*","",t)
        t=re.sub(r"\s*```$","",t)
    return t.strip()

def _llm_json(system,user_content,schema,max_tokens,purpose):
    """One Claude call constrained to `schema`, returning parsed JSON.

    Shared by the user-initiated endpoints (/ask, /parse-transaction). These
    surface failures as HTTP status codes rather than degrading quietly: someone
    is waiting on this specific answer and can act on the message. Insight
    narration takes the opposite approach — see _narrate."""
    api_key=os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY is not configured on the server.")

    client=anthropic.Anthropic(api_key=api_key)
    try:
        resp=client.messages.create(
            model=ASK_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role":"user","content":user_content}],
            output_config={"format":{"type":"json_schema","schema":schema}},
        )
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY was rejected by the Claude API.")
    except anthropic.NotFoundError:
        raise HTTPException(status_code=500, detail=f"Model {ASK_MODEL} is not available to this API key.")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="The AI analyst is busy right now. Please try again in a moment.")
    except anthropic.APIStatusError as e:
        raise HTTPException(status_code=502, detail=f"Claude API returned an error (HTTP {e.status_code}).")
    except anthropic.APIConnectionError:
        raise HTTPException(status_code=502, detail="Could not reach the Claude API. Check the server's network access.")

    text=next((b.text for b in resp.content if b.type=="text"),"")
    try:
        return json.loads(_strip_fence(text))
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail=f"The AI returned a response that was not valid JSON ({purpose}).")

def answer(db,bid,question):
    context=ask_context(db,bid)
    prompt=(
        "Here is this vendor's financial data for the last 30 days as JSON:\n\n"
        f"{json.dumps(context,ensure_ascii=False,indent=2)}\n\n"
        f"The vendor asks: {question}\n\n"
        "Answer using only the figures above. If the data cannot answer the question, "
        "say so plainly in the 'fact' field instead of guessing."
    )
    data=_llm_json(ASK_SYSTEM,prompt,ASK_SCHEMA,ASK_MAX_TOKENS,"chat answer")

    fact=str(data.get("fact") or "").strip()
    inference=str(data.get("inference") or "").strip()
    recommendation=str(data.get("recommendation") or "").strip()

    # `en`/`pcm` keep the chat contract the frontend already speaks (AiAnswer in
    # src/services/api.ts, rendered by AIAnalyst). The three schema keys ride
    # along so the UI can split fact/inference/recommendation into its own
    # sections later without another backend change. Both language fields carry
    # the same Pidgin text — the system prompt asks for Pidgin only.
    prose=" ".join(x for x in (fact,inference,recommendation) if x)
    return {
      "en":prose,
      "pcm":prose,
      "fact":fact,
      "inference":inference,
      "recommendation":recommendation,
    }

def known_product_names(db,bid,days=PRODUCT_HISTORY_DAYS):
    """Names this business already uses, for the parser to snap a phrase onto.

    Three sources, because a vendor's vocabulary is spread across all of them:
    the product catalogue, the inventory lines, and whatever strings past sales
    were actually recorded under. Sale history matters most — that is where
    `sales_by_product` groups, so those are the exact spellings a new row has to
    match to avoid splitting a product in two.

    Deduped case-insensitively, keeping the first spelling seen, so the
    catalogue's capitalisation wins over a sloppier historical one."""
    seen={}
    def add(name):
        n=(name or "").strip()
        if n and n.lower() not in seen:
            seen[n.lower()]=n
    for p in db.query(Product).filter(Product.business_id==bid).all():
        add(p.name)
    for it in _items(db,bid):
        add(it.name)
    for row in sales_by_product(db,bid,days):
        add(row["product"])
    return list(seen.values())[:MAX_KNOWN_PRODUCTS]

def parse_transaction(text,existing_products=None):
    """Extract a transaction from a spoken or typed phrase.

    `existing_products` is the vendor's current vocabulary (see
    known_product_names). Passing it is what stops "plate of jollof", "3 plates
    jollof rice" and "jollof" from becoming three separate products — every one
    of those splits `sales_by_product`, and with it the Dashboard insights and
    the top-earner figure.

    Writes nothing — the client pre-fills its form with this and the vendor still
    presses Save. Values are coerced and clamped here rather than trusted raw,
    because these land in money fields: a negative amount or a zero quantity
    would be a bad row even if the JSON shape was valid."""
    phrase=(text or "").strip()
    if not phrase:
        raise HTTPException(status_code=422, detail="Nothing to parse — say or type the transaction first.")

    # The list goes in the user turn, not the system prompt: it changes per
    # business and per sale, while PARSE_SYSTEM stays byte-stable.
    known=[str(p).strip() for p in (existing_products or []) if str(p).strip()]
    if known:
        content=(
            "KNOWN ITEMS for this business — if the transaction refers to one of these, "
            "copy its name exactly:\n"
            + "\n".join(f"- {n}" for n in known)
            + f"\n\nTRANSACTION: {phrase}"
        )
    else:
        content=f"TRANSACTION: {phrase}"

    data=_llm_json(PARSE_SYSTEM,content,PARSE_SCHEMA,PARSE_MAX_TOKENS,"transaction parse")

    kind=data.get("type")
    if kind not in ("sale","expense"):
        raise HTTPException(status_code=502, detail="Could not tell whether that was a sale or an expense. Try rephrasing.")

    try:
        amount=max(0.0,round(float(data.get("amount") or 0),2))
        quantity=max(1,int(round(float(data.get("quantity") or 1))))
    except (TypeError,ValueError):
        raise HTTPException(status_code=502, detail="The extracted amount or quantity was not a number.")

    return {
      "type":kind,
      "item_name":str(data.get("item_name") or "").strip(),
      "amount":amount,
      "quantity":quantity,
    }
