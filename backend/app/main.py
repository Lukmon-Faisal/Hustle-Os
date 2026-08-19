from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app import models  # noqa: F401
from app.routers import businesses, sales, expenses, invoices, products, inventory, customers, suppliers, analytics, ai

app = FastAPI(title="Hustle OS API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://hustle-os-1-vrsq.onrender.com/",
        "http://localhost:5173",
    ],
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
