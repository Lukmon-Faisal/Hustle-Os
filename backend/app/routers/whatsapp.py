"""Twilio WhatsApp ingestion.

A vendor sends "I sell 3 plate jollof for 4500" to the business WhatsApp number;
this records it and replies with a running total for the day.

Two things differ from the rest of the API:

* It speaks `application/x-www-form-urlencoded` in and TwiML XML out, because
  that is what Twilio's webhooks use.
* It never raises. Twilio surfaces a non-2xx as a generic failure to the sender,
  so every path here — unknown number, unparseable text, model outage — returns
  valid TwiML that tells the vendor what happened in their own language.
"""
import logging
import os
import uuid
from datetime import date

from fastapi import APIRouter, Depends, Form, Request, Response
from sqlalchemy.orm import Session
from twilio.request_validator import RequestValidator
from twilio.twiml.messaging_response import MessagingResponse

from app.db import get_db
from app.models.business import Business
from app.models.expense import ExpenseTransaction
from app.models.sale import PaymentMethod, SaleTransaction
from app.services import ai_service
from app.services.analytics import period_over_period

log = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

# WhatsApp gives us no payment method, and cash is the norm for informal trade.
# The vendor can correct it in the app; guessing "transfer" would be worse.
DEFAULT_PAYMENT_METHOD = PaymentMethod.cash


def _money(n):
    return f"₦{float(n):,.0f}"


def _twiml(message: str) -> Response:
    resp = MessagingResponse()
    resp.message(message)
    return Response(content=str(resp), media_type="application/xml")


def _sender_number(raw: str) -> str:
    """Twilio sends 'whatsapp:+2348012345678'. We store bare E.164."""
    return (raw or "").split(":", 1)[-1].strip()


def _resolve_business(db: Session, phone: str) -> Business | None:
    """Sender's number first; otherwise the configured demo business.

    The fallback exists so a live demo never dies on an unregistered number.
    DEMO_BUSINESS_ID is a UUID (this schema has no integer ids), and if it is
    unset or stale we take the lowest id as a last resort rather than giving up.
    """
    if phone:
        match = db.query(Business).filter(Business.phone_number == phone).first()
        if match:
            return match

    configured = os.getenv("DEMO_BUSINESS_ID", "").strip()
    if configured:
        try:
            fallback = db.get(Business, uuid.UUID(configured))
            if fallback:
                log.info("WhatsApp: unknown sender %s -> demo business %s", phone, fallback.id)
                return fallback
            log.warning("DEMO_BUSINESS_ID %s is not in the database.", configured)
        except ValueError:
            log.warning("DEMO_BUSINESS_ID %r is not a valid UUID.", configured)

    first = db.query(Business).order_by(Business.id).first()
    if first:
        log.warning("WhatsApp: no DEMO_BUSINESS_ID set — falling back to %s", first.id)
    return first


def _signature_ok(request: Request, form: dict) -> bool:
    """Verify the request really came from Twilio.

    This endpoint writes to the database and needs no login, so without a
    signature check anyone who learns the URL can inject sales. Validation is
    active whenever TWILIO_AUTH_TOKEN is set and skipped (loudly) when it is
    not, so an unconfigured demo box still works.
    """
    token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    if not token:
        log.warning(
            "TWILIO_AUTH_TOKEN is not set — accepting the WhatsApp webhook without "
            "signature validation. Anyone who knows this URL can write transactions."
        )
        return True

    signature = request.headers.get("X-Twilio-Signature", "")
    # Twilio signs the URL it called. Behind Render's proxy the scheme can arrive
    # as http, so prefer the forwarded scheme when one is present.
    url = str(request.url)
    forwarded_proto = request.headers.get("X-Forwarded-Proto")
    if forwarded_proto:
        url = url.replace(f"{request.url.scheme}://", f"{forwarded_proto}://", 1)

    return RequestValidator(token).validate(url, form, signature)


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    Body: str = Form(...),
    From: str = Form(...),
    db: Session = Depends(get_db),
):
    """Record a transaction dictated over WhatsApp and reply with today's total."""
    form = dict(await request.form())
    if not _signature_ok(request, form):
        log.warning("WhatsApp: rejected a request with a bad Twilio signature.")
        return _twiml("This request could not be verified. Abeg try again from WhatsApp.")

    phone = _sender_number(From)
    business = _resolve_business(db, phone)
    if not business:
        return _twiml(
            "Hustle OS no get any business registered yet. Abeg set up your business "
            "for the app first, then come back."
        )

    # Step B — same extraction the in-app "Type or Talk" field uses, with this
    # business's product vocabulary so a dictated name lands on an existing
    # product rather than creating a near-duplicate. This path commits straight
    # to the database with no human confirmation, so the snapping matters more
    # here than it does in the app.
    try:
        known = ai_service.known_product_names(db, business.id)
        parsed = ai_service.parse_transaction(Body, known)
    except Exception as exc:
        detail = getattr(exc, "detail", None) or "the AI could not read that message"
        log.warning("WhatsApp: parse failed for %r — %s", Body, detail)
        return _twiml(
            "I no gree understand that one. Try am like this: "
            '"I sell 3 plate jollof for 4500".'
        )

    item = parsed["item_name"] or ("Sale" if parsed["type"] == "sale" else "Expense")
    amount = parsed["amount"]
    today = date.today()

    # Step C — write the row.
    if parsed["type"] == "sale":
        db.add(SaleTransaction(
            business_id=business.id,
            date=today,
            product=item,
            quantity=parsed["quantity"],
            amount=amount,
            payment_method=DEFAULT_PAYMENT_METHOD,
            customer_id=None,
        ))
        kind = "sale"
    else:
        db.add(ExpenseTransaction(
            business_id=business.id,
            date=today,
            category=item,
            amount=amount,
            supplier=None,
            note="Logged over WhatsApp",
        ))
        kind = "expense"

    db.commit()

    # Step D — a 1-day window starts at today's cutoff, so revenueNow is today's
    # gross, and it now includes the row we just committed.
    today_total = period_over_period(db, business.id, 1)["revenueNow"]

    # Step E — reply in Pidgin.
    return _twiml(
        f"Oshey! I don record your {kind} of {item} for {_money(amount)}. "
        f"Your total sales today na {_money(today_total)}. "
        "Check your full Wema Passport for the app!"
    )
