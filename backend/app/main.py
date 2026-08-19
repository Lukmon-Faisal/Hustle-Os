from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app import models  # noqa: F401 - ensures all models are registered before create_all
from app.routers import businesses, sales

app = FastAPI(title="Hustle OS API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before demo day if you want, fine for hackathon
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    # Hackathon-speed table creation. Swap for Alembic migrations if you have
    # time later; for now this just makes sure the schema exists in Supabase.
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(businesses.router)
app.include_router(sales.router)

# TODO: add routers the same way for expenses, invoices, products,
# inventory, customers, suppliers - copy app/routers/sales.py as the pattern
# (it's business-scoped: /businesses/{business_id}/<resource>)
