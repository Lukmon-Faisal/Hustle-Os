from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class BusinessPassportRead(BaseModel):
    """Lending-engine contract for GET /businesses/{business_id}/passport.

    This is the payload a partner underwriting system (Wema / ALAT) consumes to
    size an offer. Every field is derived deterministically from the business's
    own transaction rows — no LLM touches this endpoint, because a credit
    decision has to be reproducible and explainable from the underlying data.

    Declaring it as a response_model means FastAPI validates the payload on the
    way out and publishes the contract in the OpenAPI schema at /docs, so the
    consuming side can generate a client against it.
    """

    credit_risk_tier: Literal["A", "B", "C", "D"] = Field(
        description="A is the strongest tier. Derived from transaction consistency and whether revenue was recorded.",
    )
    recommended_credit_limit_ngn: float = Field(
        ge=0,
        description="Conservative offer ceiling in naira: 30% of thirty_day_gross_revenue.",
    )
    thirty_day_gross_revenue: float = Field(
        ge=0,
        description="Sum of all sales in the trailing 30 days, in naira.",
    )
    transaction_consistency_score: int = Field(
        ge=0,
        le=100,
        description="Share of the trailing 30 days that recorded at least one sale, scaled to 100.",
    )
    expense_stability_index: Literal["High", "Medium", "Low"] = Field(
        description="Volatility of daily expense totals. High means predictable outgoings.",
    )
    inventory_health_status: Literal["Excellent", "Needs Work", "Critical"] = Field(
        description="Share of stock lines running out within the reorder window.",
    )
    kyc_data_verifiability: bool = Field(
        description="Whether the identity data behind this business has been verified. Fixed true pending KYC integration.",
    )
    last_calculated_at: datetime = Field(
        description="UTC timestamp this payload was computed. The figures are a snapshot, not a live feed.",
    )
