import type { BusinessData } from '../types'

export function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function withinLastNDays(dateStr: string, n: number): boolean {
  return dateStr >= daysAgo(n - 1)
}

export function sumSales(data: BusinessData, days: number): number {
  return data.sales.filter((s) => withinLastNDays(s.date, days)).reduce((a, s) => a + s.amount, 0)
}

export function sumExpenses(data: BusinessData, days: number): number {
  return data.expenses.filter((e) => withinLastNDays(e.date, days)).reduce((a, e) => a + e.amount, 0)
}

export function countSales(data: BusinessData, days: number): number {
  return data.sales.filter((s) => withinLastNDays(s.date, days)).length
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

export function periodOverPeriod(data: BusinessData, days: number) {
  const revenueNow = sumSales(data, days)
  const revenuePrev =
    data.sales
      .filter((s) => s.date < daysAgo(days - 1) && s.date >= daysAgo(days * 2 - 1))
      .reduce((a, s) => a + s.amount, 0)
  const expenseNow = sumExpenses(data, days)
  const expensePrev =
    data.expenses
      .filter((e) => e.date < daysAgo(days - 1) && e.date >= daysAgo(days * 2 - 1))
      .reduce((a, e) => a + e.amount, 0)

  return {
    revenueNow,
    revenuePrev,
    revenueChangePct: pctChange(revenueNow, revenuePrev),
    expenseNow,
    expensePrev,
    expenseChangePct: pctChange(expenseNow, expensePrev),
    profitNow: revenueNow - expenseNow,
    profitPrev: revenuePrev - expensePrev,
  }
}

export function salesByProduct(data: BusinessData, days: number) {
  const map = new Map<string, { revenue: number; qty: number }>()
  data.sales
    .filter((s) => withinLastNDays(s.date, days))
    .forEach((s) => {
      const cur = map.get(s.product) ?? { revenue: 0, qty: 0 }
      cur.revenue += s.amount
      cur.qty += s.quantity
      map.set(s.product, cur)
    })
  return Array.from(map.entries()).map(([product, v]) => ({ product, ...v }))
}

export function productGrowth(data: BusinessData, product: string, days: number) {
  const now = data.sales
    .filter((s) => s.product === product && withinLastNDays(s.date, days))
    .reduce((a, s) => a + s.amount, 0)
  const prev = data.sales
    .filter((s) => s.product === product && s.date < daysAgo(days - 1) && s.date >= daysAgo(days * 2 - 1))
    .reduce((a, s) => a + s.amount, 0)
  return { now, prev, changePct: pctChange(now, prev) }
}

export function expensesByCategory(data: BusinessData, days: number) {
  const map = new Map<string, number>()
  data.expenses
    .filter((e) => withinLastNDays(e.date, days))
    .forEach((e) => map.set(e.category, (map.get(e.category) ?? 0) + e.amount))
  return Array.from(map.entries()).map(([category, amount]) => ({ category, amount }))
}

export function supplierPriceChange(data: BusinessData, supplierId: string) {
  const supplier = data.suppliers.find((s) => s.id === supplierId)
  if (!supplier || supplier.priceHistory.length < 2) return null
  const sorted = [...supplier.priceHistory].sort((a, b) => (a.date < b.date ? -1 : 1))
  const first = sorted[0].unitPrice
  const last = sorted[sorted.length - 1].unitPrice
  return { first, last, changePct: pctChange(last, first) }
}

export function repeatCustomerRate(data: BusinessData): number {
  const repeat = data.customers.filter((c) => c.ordersCount > 1).length
  const total = data.customers.filter((c) => c.ordersCount > 0).length
  if (total === 0) return 0
  return Math.round((repeat / total) * 100)
}

export function dailySeries(data: BusinessData, days: number) {
  const series: { date: string; revenue: number; expenses: number; profit: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const date = daysAgo(i)
    const revenue = data.sales.filter((s) => s.date === date).reduce((a, s) => a + s.amount, 0)
    const expenses = data.expenses.filter((e) => e.date === date).reduce((a, e) => a + e.amount, 0)
    series.push({ date, revenue, expenses, profit: revenue - expenses })
  }
  return series
}

export function weeklySeries(data: BusinessData, weeks: number) {
  const out: { week: string; revenue: number; expenses: number; profit: number }[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const start = w * 7
    const end = start + 6
    const revenue = data.sales
      .filter((s) => s.date >= daysAgo(end) && s.date <= daysAgo(start))
      .reduce((a, s) => a + s.amount, 0)
    const expenses = data.expenses
      .filter((e) => e.date >= daysAgo(end) && e.date <= daysAgo(start))
      .reduce((a, e) => a + e.amount, 0)
    out.push({ week: `Wk ${weeks - w}`, revenue, expenses, profit: revenue - expenses })
  }
  return out
}

export function inventoryDaysRemaining(currentStock: number, dailyVelocity: number): number {
  if (dailyVelocity <= 0) return Infinity
  return Math.floor(currentStock / dailyVelocity)
}

export function formatNaira(n: number): string {
  return '₦' + Math.round(n).toLocaleString('en-NG')
}
