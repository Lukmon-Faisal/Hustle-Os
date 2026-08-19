import type {
  BusinessData,
  SaleTransaction,
  ExpenseTransaction,
  InvoiceRecord,
  Product,
  InventoryItem,
  Customer,
  Supplier,
  PaymentMethod,
} from '../types'

// Small deterministic PRNG so the demo dataset is stable across reloads.
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)]
const round = (n: number) => Math.round(n)

const PRODUCTS: Product[] = [
  { id: 'jollof', name: 'Jollof Rice', unit: 'plate' },
  { id: 'fried', name: 'Fried Rice', unit: 'plate' },
  { id: 'chicken', name: 'Chicken', unit: 'portion' },
  { id: 'drinks', name: 'Drinks', unit: 'bottle' },
]

const BASE_PRICE: Record<string, number> = {
  jollof: 1200,
  fried: 1300,
  chicken: 1500,
  drinks: 500,
}

const PAYMENT_METHODS: PaymentMethod[] = ['transfer', 'transfer', 'cash', 'pos', 'credit']

const CUSTOMER_NAMES = [
  'Chidinma A.', 'Tunde O.', 'Blessing E.', 'Kabiru M.', 'Ngozi P.',
  'Emeka U.', 'Fatima B.', 'Segun A.', 'Amaka N.', 'Yusuf I.',
  'Grace T.', 'Chuka O.', 'Halima S.', 'Bimbo K.', 'Ifeoma C.',
  'David E.', 'Ronke A.', 'Peter N.', 'Zainab L.', 'Emmanuel G.',
]

function isoDate(daysAgoFromToday: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgoFromToday)
  return d.toISOString().slice(0, 10)
}

const TOTAL_DAYS = 90

function buildCustomers(): Customer[] {
  return CUSTOMER_NAMES.map((name, i) => ({
    id: `cust-${i + 1}`,
    name,
    firstSeen: isoDate(TOTAL_DAYS - Math.floor(rand() * 20)),
    ordersCount: 0,
    totalSpend: 0,
    lastOrderDate: isoDate(TOTAL_DAYS),
  }))
}

function buildSuppliers(): Supplier[] {
  const chickenPriceHistory: { date: string; unitPrice: number }[] = []
  // Chicken supplier price anomaly: stable ~950/portion cost for first ~55 days,
  // then a step increase of ~18% starting around day 35-from-end (creates the "wow" insight).
  for (let d = TOTAL_DAYS; d >= 0; d--) {
    const dayIndex = TOTAL_DAYS - d
    let price = 950
    if (dayIndex > 55) {
      // last ~35 days: price steps up ~18%
      price = 950 * 1.18
    }
    if (dayIndex % 10 === 0) {
      chickenPriceHistory.push({ date: isoDate(d), unitPrice: round(price) })
    }
  }
  return [
    { id: 'sup-chicken', name: 'Alhaji Musa Poultry', category: 'Chicken', priceHistory: chickenPriceHistory },
    { id: 'sup-rice', name: 'Iya Bose Rice Supplies', category: 'Rice', priceHistory: [] },
    { id: 'sup-drinks', name: 'CoolFizz Distributors', category: 'Drinks', priceHistory: [] },
  ]
}

function buildSalesAndCustomers(customers: Customer[]): SaleTransaction[] {
  const sales: SaleTransaction[] = []
  let saleCounter = 1

  for (let d = TOTAL_DAYS; d >= 0; d--) {
    const dayIndex = TOTAL_DAYS - d // 0 = 90 days ago, 90 = today
    const monthPhase = Math.floor(dayIndex / 30) // 0,1,2 => 3 growth months

    // Base daily order count grows month over month: ~18 -> ~20 -> ~22 orders/day
    const baseOrders = 17 + monthPhase * 2 + (rand() < 0.15 ? -3 : 0)
    const weekendBoost = (dayIndex % 7 === 5 || dayIndex % 7 === 6) ? 1.25 : 1
    const ordersToday = Math.max(6, round(baseOrders * weekendBoost * (0.9 + rand() * 0.2)))

    // Drinks trending up sharply over the period (rapid grower)
    const drinksWeight = 0.15 + (dayIndex / TOTAL_DAYS) * 0.18
    // Chicken demand keeps growing too (demand isn't the problem, cost is)
    const chickenWeight = 0.28 + (dayIndex / TOTAL_DAYS) * 0.07

    for (let i = 0; i < ordersToday; i++) {
      const r = rand()
      let productId: string
      if (r < chickenWeight) productId = 'chicken'
      else if (r < chickenWeight + drinksWeight) productId = 'drinks'
      else if (r < chickenWeight + drinksWeight + 0.28) productId = 'jollof'
      else productId = 'fried'

      const qty = productId === 'drinks' ? 1 + Math.floor(rand() * 2) : 1
      const priceJitter = 0.95 + rand() * 0.1
      const amount = round(BASE_PRICE[productId] * qty * priceJitter)

      // 71% of orders come from repeat customers weighted toward a loyal subset
      const isRepeat = rand() < 0.71
      const customer = isRepeat
        ? customers[Math.floor(rand() * 12)] // loyal pool
        : customers[12 + Math.floor(rand() * (customers.length - 12))]

      customer.ordersCount += 1
      customer.totalSpend += amount
      const saleDate = isoDate(d)
      if (saleDate > customer.lastOrderDate) customer.lastOrderDate = saleDate

      sales.push({
        id: `sale-${saleCounter++}`,
        date: saleDate,
        product: PRODUCTS.find((p) => p.id === productId)!.name,
        quantity: qty,
        amount,
        paymentMethod: pick(PAYMENT_METHODS),
        customerId: customer.id,
      })
    }
  }

  return sales
}

function buildExpenses(): ExpenseTransaction[] {
  const expenses: ExpenseTransaction[] = []
  let counter = 1

  for (let d = TOTAL_DAYS; d >= 0; d--) {
    const dayIndex = TOTAL_DAYS - d
    const monthPhase = Math.floor(dayIndex / 30)

    // Chicken purchases every ~2 days, price reflects the supplier anomaly after day 55
    if (dayIndex % 2 === 0) {
      const portions = 25 + monthPhase * 3
      const unitPrice = dayIndex > 55 ? 950 * 1.18 : 950
      expenses.push({
        id: `exp-${counter++}`,
        date: isoDate(d),
        category: 'Chicken supply',
        supplier: 'Alhaji Musa Poultry',
        amount: round(portions * unitPrice),
        note: dayIndex > 55 ? 'Supplier increased unit price' : undefined,
      })
    }

    // Rice & staples every ~3 days
    if (dayIndex % 3 === 0) {
      expenses.push({
        id: `exp-${counter++}`,
        date: isoDate(d),
        category: 'Rice & staples',
        supplier: 'Iya Bose Rice Supplies',
        amount: round((7000 + monthPhase * 400) * (0.9 + rand() * 0.2)),
      })
    }

    // Drinks restock every ~4 days, scales with growing drink sales
    if (dayIndex % 4 === 0) {
      expenses.push({
        id: `exp-${counter++}`,
        date: isoDate(d),
        category: 'Drinks restock',
        supplier: 'CoolFizz Distributors',
        amount: round((4000 + dayIndex * 25) * (0.9 + rand() * 0.2)),
      })
    }

    // Cooking gas / oil weekly
    if (dayIndex % 7 === 0) {
      expenses.push({
        id: `exp-${counter++}`,
        date: isoDate(d),
        category: 'Cooking gas & oil',
        amount: round(9000 * (0.9 + rand() * 0.2)),
      })
    }

    // Transport / logistics most days
    if (dayIndex % 2 === 1) {
      expenses.push({
        id: `exp-${counter++}`,
        date: isoDate(d),
        category: 'Transport & delivery',
        amount: round(1500 * (0.8 + rand() * 0.4)),
      })
    }

    // Packaging
    if (dayIndex % 5 === 0) {
      expenses.push({
        id: `exp-${counter++}`,
        date: isoDate(d),
        category: 'Packaging',
        amount: round(3200 * (0.85 + rand() * 0.3)),
      })
    }
  }

  return expenses
}

function buildInvoices(customers: Customer[]): InvoiceRecord[] {
  const invoices: InvoiceRecord[] = []
  let counter = 1
  // Credit sales become invoices - simulate ~14 of them across the period
  for (let i = 0; i < 14; i++) {
    const daysAgo = Math.floor(rand() * TOTAL_DAYS)
    const status = rand() < 0.75 ? 'paid' : rand() < 0.6 ? 'pending' : 'overdue'
    invoices.push({
      id: `inv-${counter++}`,
      date: isoDate(daysAgo),
      customerId: pick(customers).id,
      amount: round(3000 + rand() * 9000),
      status,
    })
  }
  return invoices
}

function buildInventory(): InventoryItem[] {
  return [
    { id: 'inv-chicken', productId: 'chicken', name: 'Chicken', currentStock: 23, unit: 'portions', dailyVelocity: 11, reorderThreshold: 20 },
    { id: 'inv-rice', productId: 'jollof', name: 'Rice', currentStock: 140, unit: 'kg', dailyVelocity: 9, reorderThreshold: 40 },
    { id: 'inv-drinks', productId: 'drinks', name: 'Drinks', currentStock: 96, unit: 'bottles', dailyVelocity: 18, reorderThreshold: 60 },
    { id: 'inv-oil', productId: 'jollof', name: 'Cooking oil', currentStock: 18, unit: 'litres', dailyVelocity: 1.6, reorderThreshold: 8 },
  ]
}

let cached: BusinessData | null = null

export function getAishaKitchenData(): BusinessData {
  if (cached) return cached

  const customers = buildCustomers()
  const sales = buildSalesAndCustomers(customers)
  const expenses = buildExpenses()
  const invoices = buildInvoices(customers)
  const suppliers = buildSuppliers()
  const inventory = buildInventory()

  cached = {
    business: {
      name: "Aisha's Kitchen",
      type: 'Food Vendor',
      location: 'Lagos',
      yearsOperating: 2,
      mainProducts: ['Jollof Rice', 'Fried Rice', 'Chicken', 'Drinks'],
    },
    sales,
    expenses,
    invoices,
    products: PRODUCTS,
    inventory,
    customers,
    suppliers,
  }
  return cached
}

export function emptyBusinessData(business: BusinessData['business']): BusinessData {
  return {
    business,
    sales: [],
    expenses: [],
    invoices: [],
    products: PRODUCTS,
    inventory: [],
    customers: [],
    suppliers: [],
  }
}
