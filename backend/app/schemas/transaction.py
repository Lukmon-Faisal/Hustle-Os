from typing import Literal

from pydantic import BaseModel, Field


class ParsedTransactionRead(BaseModel):
    """What POST /businesses/{business_id}/parse-transaction returns.

    An extraction result, not a committed record — nothing is written to the
    database by this endpoint. The client pre-fills its form with these values
    and the vendor still presses Save, so a misheard amount is caught by a human
    before it becomes a row.
    """

    type: Literal["sale", "expense"] = Field(
        description="Which quick-add form the client should pre-fill.",
    )
    item_name: str = Field(
        description="Product name for a sale, expense category for an expense.",
    )
    amount: float = Field(ge=0, description="Naira value extracted from the phrase.")
    quantity: int = Field(ge=1, description="Units. Defaults to 1 when the phrase omits it.")
