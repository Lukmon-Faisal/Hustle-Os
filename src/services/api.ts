// ---------------------------------------------------------------------------
// API client — the single place the frontend talks to the FastAPI backend.
//
// The backend speaks snake_case + string decimals; the app speaks camelCase +
// numbers. Every conversion happens here so pages/services stay unchanged.
// ---------------------------------------------------------------------------
import type {
  ActionItem,
  Business,
  BusinessData,
  BusinessHealth,
  BusinessPassport,
  Customer,
  ExpenseTransaction,
  Insight,
  InventoryItem,
  InvoiceRecord,
  PaymentMethod,
  Product,
  SaleTransaction,
  Supplier,
} from '../types'

const RAW_BASE = (import.meta.env.VITE_API_URL ?? '').trim()

if (!RAW_BASE && import.meta.env.PROD) {
  // Loud, early failure beats silent "nothing syncs" in production.
  console.error(
    '[HustleOS] VITE_API_URL is not set at build time — the app cannot reach the backend.',
  )
}

// Strip trailing slashes so `${API_BASE}/businesses` never becomes `//businesses`.
export const API_BASE = (RAW_BASE || 'http://127.0.0.1:8000').replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })
  } catch (err) {
    throw new ApiError(
      `Cannot reach the API at ${API_BASE}. Check VITE_API_URL and that the backend allows this origin (CORS).`,
      0,
    )
  }

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(`${init?.method ?? 'GET'} ${path} failed: ${detail}`, res.status)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const num = (v: unknown): number => (v == null ? 0 : Number(v))

// --- wire types (what FastAPI actually returns) ----------------------------

interface WireBusiness {
  id: string
  name: string
  type: string
  location: string
  years_operating: number
  main_products: string[]
}
interface WireSale {
  id: string
  date: string
  product: string
  quantity: number
  amount: string | number
  payment_method: PaymentMethod
  customer_id: string | null
}
interface WireExpense {
  id: string
  date: string
  category: string
  supplier: string | null
  amount: string | number
  note: string | null
}
interface WireInvoice {
  id: string
  date: string
  customer_id: string
  amount: string | number
  status: InvoiceRecord['status']
}
interface WireProduct {
  id: string
  name: string
  unit: string
}
interface WireInventory {
  id: string
  product_id: string
  name: string
  current_stock: string | number
  unit: string
  daily_velocity: string | number
  reorder_threshold: string | number
}
interface WireCustomer {
  id: string
  name: string
  first_seen: string
  orders_count: number
  total_spend: string | number
  last_order_date: string | null
}
interface WireSupplier {
  id: string
  name: string
  category: string
  price_history?: { date: string; unit_price: string | number }[]
}

// --- mappers --------------------------------------------------------------

const toBusiness = (b: WireBusiness): Business => ({
  name: b.name,
  type: b.type,
  location: b.location,
  yearsOperating: b.years_operating,
  mainProducts: b.main_products ?? [],
})

const toSale = (s: WireSale): SaleTransaction => ({
  id: s.id,
  date: s.date,
  product: s.product,
  quantity: s.quantity,
  amount: num(s.amount),
  paymentMethod: s.payment_method,
  customerId: s.customer_id ?? 'walk-in',
})

const toExpense = (e: WireExpense): ExpenseTransaction => ({
  id: e.id,
  date: e.date,
  category: e.category,
  supplier: e.supplier ?? undefined,
  amount: num(e.amount),
  note: e.note ?? undefined,
})

const toInvoice = (i: WireInvoice): InvoiceRecord => ({
  id: i.id,
  date: i.date,
  customerId: i.customer_id,
  amount: num(i.amount),
  status: i.status,
})

const toProduct = (p: WireProduct): Product => ({ id: p.id, name: p.name, unit: p.unit })

const toInventory = (i: WireInventory): InventoryItem => ({
  id: i.id,
  productId: i.product_id,
  name: i.name,
  currentStock: num(i.current_stock),
  unit: i.unit,
  dailyVelocity: num(i.daily_velocity),
  reorderThreshold: num(i.reorder_threshold),
})

const toCustomer = (c: WireCustomer): Customer => ({
  id: c.id,
  name: c.name,
  firstSeen: c.first_seen,
  ordersCount: c.orders_count,
  totalSpend: num(c.total_spend),
  lastOrderDate: c.last_order_date ?? c.first_seen,
})

const toSupplier = (s: WireSupplier): Supplier => ({
  id: s.id,
  name: s.name,
  category: s.category,
  priceHistory: (s.price_history ?? []).map((p) => ({
    date: p.date,
    unitPrice: num(p.unit_price),
  })),
})

// --- endpoints ------------------------------------------------------------

export async function checkHealth(): Promise<boolean> {
  try {
    await request<{ status: string }>('/health')
    return true
  } catch {
    return false
  }
}

export async function createBusiness(business: Business): Promise<string> {
  const created = await request<WireBusiness>('/businesses', {
    method: 'POST',
    body: JSON.stringify({
      name: business.name,
      type: business.type,
      location: business.location,
      years_operating: business.yearsOperating,
      main_products: business.mainProducts,
    }),
  })
  return created.id
}

export async function fetchBusinessData(businessId: string): Promise<BusinessData> {
  const base = `/businesses/${businessId}`
  const [business, sales, expenses, invoices, products, inventory, customers, suppliers] =
    await Promise.all([
      request<WireBusiness>(base),
      request<WireSale[]>(`${base}/sales`),
      request<WireExpense[]>(`${base}/expenses`),
      request<WireInvoice[]>(`${base}/invoices`),
      request<WireProduct[]>(`${base}/products`),
      request<WireInventory[]>(`${base}/inventory`),
      request<WireCustomer[]>(`${base}/customers`),
      request<WireSupplier[]>(`${base}/suppliers`),
    ])

  return {
    business: toBusiness(business),
    sales: sales.map(toSale),
    expenses: expenses.map(toExpense),
    invoices: invoices.map(toInvoice),
    products: products.map(toProduct),
    inventory: inventory.map(toInventory),
    customers: customers.map(toCustomer),
    suppliers: suppliers.map(toSupplier),
  }
}

export async function createSale(
  businessId: string,
  sale: { date: string; product: string; quantity: number; amount: number; paymentMethod: PaymentMethod; customerId?: string },
): Promise<SaleTransaction> {
  const created = await request<WireSale>(`/businesses/${businessId}/sales`, {
    method: 'POST',
    body: JSON.stringify({
      date: sale.date,
      product: sale.product,
      quantity: sale.quantity,
      amount: sale.amount,
      payment_method: sale.paymentMethod,
      // The API expects a real customer UUID or null — never a placeholder string.
      customer_id: sale.customerId ?? null,
    }),
  })
  return toSale(created)
}

export async function createExpense(
  businessId: string,
  expense: { date: string; category: string; amount: number; supplier?: string; note?: string },
): Promise<ExpenseTransaction> {
  const created = await request<WireExpense>(`/businesses/${businessId}/expenses`, {
    method: 'POST',
    body: JSON.stringify({
      date: expense.date,
      category: expense.category,
      amount: expense.amount,
      supplier: expense.supplier ?? null,
      note: expense.note ?? null,
    }),
  })
  return toExpense(created)
}

// --- AI endpoints ---------------------------------------------------------
// The AI routers already emit camelCase keys that line up 1:1 with the types
// in src/types, so unlike the data endpoints above these need no field
// renaming — only numeric coercion, because anything derived from a Numeric
// column can arrive as a string.

export interface AiAnswer {
  en: string
  pcm: string
  /**
   * The /ask endpoint's LLM schema. `en`/`pcm` above are these three joined
   * into prose for the chat bubble; the parts are sent separately so the UI can
   * render them as distinct sections. Optional because only /ask returns them.
   */
  fact?: string
  inference?: string
  recommendation?: string
}

interface WireHealth {
  overall: string | number
  components: { key: string; label: string; labelPidgin: string; score: string | number }[]
  summary: string
  summaryPidgin: string
}

interface WirePassport extends Omit<
  BusinessPassport,
  'recommended_credit_limit_ngn' | 'thirty_day_gross_revenue' | 'transaction_consistency_score'
> {
  recommended_credit_limit_ngn: string | number
  thirty_day_gross_revenue: string | number
  transaction_consistency_score: string | number
}

export async function fetchBusinessHealth(businessId: string): Promise<BusinessHealth> {
  const h = await request<WireHealth>(`/businesses/${businessId}/health`)
  return {
    overall: num(h.overall),
    components: (h.components ?? []).map((c) => ({
      key: c.key,
      label: c.label,
      labelPidgin: c.labelPidgin,
      score: num(c.score),
    })),
    summary: h.summary,
    summaryPidgin: h.summaryPidgin,
  }
}

export async function fetchInsights(businessId: string): Promise<Insight[]> {
  return (await request<Insight[]>(`/businesses/${businessId}/insights`)) ?? []
}

export async function fetchAnomalies(businessId: string): Promise<Insight[]> {
  return (await request<Insight[]>(`/businesses/${businessId}/anomalies`)) ?? []
}

export async function fetchActions(businessId: string): Promise<ActionItem[]> {
  return (await request<ActionItem[]>(`/businesses/${businessId}/actions`)) ?? []
}

export async function fetchPassport(businessId: string): Promise<BusinessPassport> {
  const p = await request<WirePassport>(`/businesses/${businessId}/passport`)
  return {
    ...p,
    recommended_credit_limit_ngn: num(p.recommended_credit_limit_ngn),
    thirty_day_gross_revenue: num(p.thirty_day_gross_revenue),
    transaction_consistency_score: num(p.transaction_consistency_score),
  }
}

export async function askQuestion(businessId: string, question: string): Promise<AiAnswer> {
  return await request<AiAnswer>(`/businesses/${businessId}/ask`, {
    method: 'POST',
    body: JSON.stringify({ question }),
  })
}
