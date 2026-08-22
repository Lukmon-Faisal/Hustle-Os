import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app import models  # noqa: F401
from app.routers import businesses, sales, expenses, invoices, products, inventory, customers, suppliers, analytics, ai, whatsapp

app = FastAPI(title="Hustle OS API", version="0.2.0")

# Origins must be exact scheme+host, with NO trailing slash — a trailing slash
# never matches the browser's Origin header, which silently breaks every request.
# Extra origins can be added at deploy time via CORS_ORIGINS (comma-separated).
DEFAULT_ORIGINS = [
    "https://hustle-os-1-vrsq.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_extra = [o.strip().rstrip("/") for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
ALLOWED_ORIGINS = DEFAULT_ORIGINS + _extra

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # Covers Render preview/deploy subdomains without redeploying the API.
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(businesses.router)
app.include_router(sales.router)
app.include_router(expenses.router)
app.include_router(invoices.router)
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(customers.router)
app.include_router(suppliers.router)
app.include_router(analytics.router)
app.include_router(ai.router)
app.include_router(whatsapp.router)
