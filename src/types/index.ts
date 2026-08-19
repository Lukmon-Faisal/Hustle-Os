export type Lang = 'en' | 'pcm'

export interface Business {
  name: string
  type: string
  location: string
  yearsOperating: number
  mainProducts: string[]
}

export type PaymentMethod = 'transfer' | 'cash' | 'pos' | 'credit'

export interface SaleTransaction {
  id: string
  date: string // ISO date
  product: string
  quantity: number
  amount: number
  paymentMethod: PaymentMethod
  customerId: string
}

export interface ExpenseTransaction {
  id: string
  date: string
  category: string
  supplier?: string
  amount: number
  note?: string
}

export interface InvoiceRecord {
  id: string
  date: string
  customerId: string
  amount: number
  status: 'paid' | 'pending' | 'overdue'
}

export interface Product {
  id: string
  name: string
  unit: string
}

export interface InventoryItem {
  id: string
  productId: string
  name: string
  currentStock: number
  unit: string
  dailyVelocity: number // units sold per day on average, recent
  reorderThreshold: number
}

export interface Customer {
  id: string
  name: string
  firstSeen: string
  ordersCount: number
  totalSpend: number
  lastOrderDate: string
}

export interface Supplier {
  id: string
  name: string
  category: string
  priceHistory: { date: string; unitPrice: number }[]
}

export interface Insight {
  id: string
  kind: 'fact' | 'inference' | 'recommendation'
  title: string
  titlePidgin: string
  detail: string
  detailPidgin: string
  severity: 'positive' | 'neutral' | 'warning' | 'critical'
}

export interface HealthComponent {
  key: string
  label: string
  labelPidgin: string
  score: number // 0-100
}

export interface BusinessHealth {
  overall: number
  components: HealthComponent[]
  summary: string
  summaryPidgin: string
}

export interface PassportSignal {
  label: string
  verified: boolean
}

export interface BusinessPassport {
  businessName: string
  operatingHistoryMonths: number
  verifiedActivityMonths: number
  revenueConsistency: 'Weak' | 'Moderate' | 'Strong'
  transactionConsistency: 'Weak' | 'Moderate' | 'Strong'
  customerRetentionPct: number
  expenseStability: 'Weak' | 'Moderate' | 'Strong'
  inventoryEfficiency: 'Needs work' | 'Good' | 'Excellent'
  cashFlowHealth: 'Weak' | 'Moderate' | 'Strong'
  signals: PassportSignal[]
}

export interface ActionItem {
  id: string
  priority: 'high' | 'medium' | 'opportunity'
  title: string
  titlePidgin: string
  why: string
  whyPidgin: string
  impact: string
  impactPidgin: string
  nextStep: string
  nextStepPidgin: string
}

export interface BusinessData {
  business: Business
  sales: SaleTransaction[]
  expenses: ExpenseTransaction[]
  invoices: InvoiceRecord[]
  products: Product[]
  inventory: InventoryItem[]
  customers: Customer[]
  suppliers: Supplier[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  text: string
  textPidgin?: string
}
