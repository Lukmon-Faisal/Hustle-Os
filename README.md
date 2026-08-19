# HUSTLE OS

"No be just your sales. Understand your hustle."

A hackathon prototype for **Wema Bank Hackaholics 2026** — a business intelligence
layer + Business Passport for Nigerian micro/small businesses, built Pidgin-first.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. Click **"Continue with demo"** on the onboarding
screen to load the Aisha's Kitchen dataset (90 days of realistic sales, expenses,
inventory, customers, invoices and a built-in supplier price anomaly).

To produce a production build:

```bash
npm run build
npm run preview
```

## Structure

```
src/
  types/        Shared TypeScript types (Business, SaleTransaction, Insight, ...)
  data/         Deterministic 90-day mock dataset generator for Aisha's Kitchen
  services/     analytics.ts (pure number crunching) + aiService.ts (health engine,
                insights, anomaly detection, action plan, Business Passport,
                and the AI Q&A logic used by "Ask your hustle")
  i18n/         English / Pidgin copy dictionary
  context/      AppContext — language, navigation, active business data
  components/   Shared UI: nav, health gauge, insight cards, empty states
  pages/        The 12 screens described in the product spec
```

## Notes on the AI layer

`aiService.ts` is written as a clean, isolated service layer per the spec's
technical requirements. It currently runs on deterministic, rule-based logic
derived directly from the dataset — every number it surfaces is calculated
from `BusinessData`, never invented. Answers are tagged FACT / INFERENCE /
RECOMMENDATION, and the Q&A function explicitly says "I don't have enough
information to answer that yet" when a question doesn't match a supported
pattern, rather than guessing.

If you want to swap in a real LLM (e.g. Claude) for `answerBusinessQuestion`,
the function signature and the FACT/INFERENCE/RECOMMENDATION contract are
already the right shape to drop an API call behind — pass it the same
structured `businessData` object described in the spec and keep the same
"say when you don't know" behavior.

## What's implemented from the spec

- Pidgin-first UX with a working EN | Pidgin toggle (default Pidgin)
- Onboarding → Business Setup → Dashboard flow, with a "Continue with demo" shortcut
- Hustle Health score with transparent component breakdown
- Business Intelligence page with interactive 7/30/90-day charts (Recharts)
- "Ask your hustle" AI analyst chat with suggested questions and grounded answers
- Business Passport with evidence-based indicators (not a single credit score)
- Transaction/Data Center (Sales, Expenses, Invoices) with quick-add
- Inventory Intelligence with days-remaining alerts
- Customer Intelligence with retention metrics
- Action Center (High priority / Medium / Opportunity)
- Wema Ecosystem page framed clearly as a prototype/future-integration concept
- Settings with data-permission language and a demo reset
- Mobile-first bottom nav + floating "Ask AI" button; desktop sidebar layout
