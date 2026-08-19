# Hustle OS — Backend (FastAPI)

## Setup

```bash
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# paste your Supabase connection string into .env as DATABASE_URL
# (Supabase dashboard -> Project Settings -> Database -> Connection string -> URI)

uvicorn app.main:app --reload
```

Then open http://127.0.0.1:8000/docs — FastAPI's auto-generated Swagger UI.
That's your fastest way to test endpoints without touching the frontend yet.

On startup the app calls `Base.metadata.create_all()`, so hitting `/health`
once (or just booting the server) will create all tables in your Supabase
Postgres instance automatically. No manual SQL needed.

## Structure

```
app/
  main.py          FastAPI app, CORS, router registration, table creation
  db.py            SQLAlchemy engine/session, reads DATABASE_URL from .env
  models/          SQLAlchemy models - 1:1 with src/types/index.ts interfaces
  schemas/         Pydantic Create/Read schemas per resource
  routers/         API endpoints. businesses.py and sales.py are done -
                    copy sales.py's pattern for the rest
  services/        (empty for now) - this is where analytics.py and
                    aiService.ts get ported to Python next
```

## What's done

- `businesses` — full CRUD (create, list, get by id)
- `sales` — full CRUD, scoped under `/businesses/{business_id}/sales`
- Models for every entity in the frontend's `BusinessData` type: expenses,
  invoices, products, inventory, customers, suppliers (+ supplier price
  history as its own table)

## What's next (in order)

1. Copy `routers/sales.py`'s pattern to add routers for `expenses`,
   `invoices`, `products`, `inventory`, `customers`, `suppliers`
2. Port `analytics.ts` -> `app/services/analytics.py` (pure functions,
   should translate almost line-for-line)
3. Port `aiService.ts` -> `app/services/ai_service.py`, expose as endpoints:
   `/businesses/{id}/health`, `/insights`, `/passport`, `/actions`
4. Point the frontend's `AppContext` at these endpoints instead of
   `mockData.ts`
5. Swap `answerBusinessQuestion` for a real Claude API call last
