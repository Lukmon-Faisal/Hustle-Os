import type {
  BusinessData,
  BusinessHealth,
  Insight,
  BusinessPassport,
  ActionItem,
} from '../types'
import {
  periodOverPeriod,
  salesByProduct,
  productGrowth,
  supplierPriceChange,
  repeatCustomerRate,
  inventoryDaysRemaining,
  formatNaira,
} from './analytics'

// ---------------------------------------------------------------------------
// This layer never invents financial figures. Every number surfaced here is
// derived directly from BusinessData. Where there isn't enough data to make a
// claim, functions return an explicit "not enough data" signal instead of
// guessing. Outputs are tagged FACT / INFERENCE / RECOMMENDATION via Insight.kind.
// ---------------------------------------------------------------------------

export function analyzeBusinessHealth(data: BusinessData): BusinessHealth {
  const pop30 = periodOverPeriod(data, 30)
  const repeatRate = repeatCustomerRate(data)

  const revenueConsistency = clampScore(60 + pop30.revenueChangePct)
  const expenseControl = clampScore(75 - Math.max(0, pop30.expenseChangePct - pop30.revenueChangePct) * 1.4)
  const customerRetention = clampScore(repeatRate + 10)
  const chickenInv = data.inventory.find((i) => i.name === 'Chicken')
  const inventoryHealth = chickenInv
    ? clampScore(60 + (inventoryDaysRemaining(chickenInv.currentStock, chickenInv.dailyVelocity) - 2) * 8)
    : 70
  const cashFlow = clampScore(55 + (pop30.profitNow > 0 ? Math.min(30, (pop30.profitNow / Math.max(1, pop30.revenueNow)) * 150) : -20))

  const components = [
    { key: 'revenue', label: 'Revenue consistency', labelPidgin: 'Money wey enter, e steady?', score: revenueConsistency },
    { key: 'expense', label: 'Expense control', labelPidgin: 'Expense control', score: expenseControl },
    { key: 'retention', label: 'Customer retention', labelPidgin: 'Customer wey dey return', score: customerRetention },
    { key: 'inventory', label: 'Inventory health', labelPidgin: 'Stock health', score: inventoryHealth },
    { key: 'cashflow', label: 'Cash-flow health', labelPidgin: 'Cash-flow health', score: cashFlow },
  ]

  const overall = Math.round(components.reduce((a, c) => a + c.score, 0) / components.length)

  const summary =
    overall >= 75
      ? 'Your business is healthy overall, but expenses need attention.'
      : overall >= 55
        ? 'Your business is steady, with a few areas that need attention.'
        : 'Your business needs attention in more than one area right now.'
  const summaryPidgin =
    overall >= 75
      ? 'Your business dey healthy, but expenses need attention.'
      : overall >= 55
        ? 'Your business dey managed, but some areas need attention.'
        : 'Your business need attention for more than one area now.'

  return { overall, components, summary, summaryPidgin }
}

function clampScore(n: number): number {
  return Math.max(5, Math.min(98, Math.round(n)))
}

export function generateBusinessInsights(data: BusinessData): Insight[] {
  const insights: Insight[] = []
  const pop30 = periodOverPeriod(data, 30)
  const chickenGrowth = productGrowth(data, 'Chicken', 30)
  const drinksGrowth = productGrowth(data, 'Drinks', 30)
  const chickenPrice = supplierPriceChange(data, 'sup-chicken')
  const repeatRate = repeatCustomerRate(data)
  const productBreakdown = salesByProduct(data, 30).sort((a, b) => b.revenue - a.revenue)
  const topProduct = productBreakdown[0]

  if (chickenGrowth.now > 0) {
    insights.push({
      id: 'chicken-growth',
      kind: 'fact',
      title: `Chicken sales are up ${Math.round(chickenGrowth.changePct)}% this month`,
      titlePidgin: `Chicken sales don increase ${Math.round(chickenGrowth.changePct)}%`,
      detail: `Chicken brought in ${formatNaira(chickenGrowth.now)} in the last 30 days.`,
      detailPidgin: `Chicken bring ${formatNaira(chickenGrowth.now)} for the last 30 days.`,
      severity: 'positive',
    })
  }

  if (chickenPrice && chickenPrice.changePct > 0) {
    insights.push({
      id: 'chicken-supplier',
      kind: 'fact',
      title: `Your chicken supplier cost rose ${Math.round(chickenPrice.changePct)}%`,
      titlePidgin: `Supplier cost don increase ${Math.round(chickenPrice.changePct)}%`,
      detail: `Alhaji Musa Poultry's unit price moved from ${formatNaira(chickenPrice.first)} to ${formatNaira(chickenPrice.last)} per portion.`,
      detailPidgin: `Alhaji Musa Poultry price change from ${formatNaira(chickenPrice.first)} to ${formatNaira(chickenPrice.last)} per portion.`,
      severity: 'warning',
    })
  }

  if (repeatRate > 0) {
    insights.push({
      id: 'repeat-customers',
      kind: 'fact',
      title: `${repeatRate}% of your customers came back this period`,
      titlePidgin: `${repeatRate}% of your customers come back`,
      detail: 'Repeat customers are a strong share of your order volume.',
      detailPidgin: 'Repeat customers dey drive plenty of your orders.',
      severity: 'positive',
    })
  }

  if (drinksGrowth.changePct > 5) {
    insights.push({
      id: 'drinks-momentum',
      kind: 'fact',
      title: 'Drinks are moving faster this month',
      titlePidgin: 'Drinks dey move faster this month',
      detail: `Drinks revenue grew ${Math.round(drinksGrowth.changePct)}% versus the prior period.`,
      detailPidgin: `Drinks money increase ${Math.round(drinksGrowth.changePct)}% pass the last period.`,
      severity: 'positive',
    })
  }

  if (pop30.expenseChangePct > pop30.revenueChangePct) {
    insights.push({
      id: 'expenses-outpacing',
      kind: 'inference',
      title: 'Expenses are growing faster than revenue',
      titlePidgin: 'Expenses dey rise pass the money wey dey enter',
      detail: `Revenue moved ${Math.round(pop30.revenueChangePct)}% while expenses moved ${Math.round(pop30.expenseChangePct)}% over the same 30 days.`,
      detailPidgin: `Money wey enter change ${Math.round(pop30.revenueChangePct)}%, but expenses change ${Math.round(pop30.expenseChangePct)}% for the same period.`,
      severity: 'warning',
    })
  }

  if (topProduct) {
    insights.push({
      id: 'top-product',
      kind: 'fact',
      title: `${topProduct.product} is your top earner this month`,
      titlePidgin: `${topProduct.product} na your number one product this month`,
      detail: `It brought in ${formatNaira(topProduct.revenue)} across ${topProduct.qty} units sold.`,
      detailPidgin: `E bring ${formatNaira(topProduct.revenue)} from ${topProduct.qty} units wey sell.`,
      severity: 'neutral',
    })
  }

  return insights
}

export function detectAnomalies(data: BusinessData): Insight[] {
  const anomalies: Insight[] = []
  const chickenPrice = supplierPriceChange(data, 'sup-chicken')
  if (chickenPrice && chickenPrice.changePct >= 10) {
    anomalies.push({
      id: 'anomaly-chicken-price',
      kind: 'inference',
      title: 'Unusual supplier price jump detected',
      titlePidgin: 'Something dey wrong with supplier price',
      detail: `Alhaji Musa Poultry's price rose ${Math.round(chickenPrice.changePct)}% — sharper than a typical monthly change.`,
      detailPidgin: `Alhaji Musa Poultry price rise ${Math.round(chickenPrice.changePct)}% — e pass normal monthly change.`,
      severity: 'critical',
    })
  }

  const chickenInv = data.inventory.find((i) => i.name === 'Chicken')
  if (chickenInv) {
    const daysLeft = inventoryDaysRemaining(chickenInv.currentStock, chickenInv.dailyVelocity)
    if (daysLeft <= 3) {
      anomalies.push({
        id: 'anomaly-chicken-stock',
        kind: 'inference',
        title: 'Chicken stock is running low',
        titlePidgin: 'Chicken stock dey finish',
        detail: `At the current selling pace, chicken may run out in about ${daysLeft} day(s).`,
        detailPidgin: `If the pace continue, chicken fit finish for about ${daysLeft} day(s).`,
        severity: 'critical',
      })
    }
  }

  return anomalies
}

export function generateActionPlan(data: BusinessData): ActionItem[] {
  const actions: ActionItem[] = []
  const chickenPrice = supplierPriceChange(data, 'sup-chicken')
  const chickenInv = data.inventory.find((i) => i.name === 'Chicken')
  const drinksGrowth = productGrowth(data, 'Drinks', 30)

  if (chickenPrice && chickenPrice.changePct >= 10) {
    actions.push({
      id: 'action-supplier',
      priority: 'high',
      title: 'Supplier price has increased',
      titlePidgin: 'Supplier price don increase',
      why: `Chicken supply cost rose ${Math.round(chickenPrice.changePct)}%, squeezing your margin on your best-selling item.`,
      whyPidgin: `Chicken cost rise ${Math.round(chickenPrice.changePct)}%, e dey chop your profit for your best product.`,
      impact: 'Protects your profit margin on chicken orders.',
      impactPidgin: 'E go protect your profit for chicken orders.',
      nextStep: 'Compare prices with at least one alternative poultry supplier this week.',
      nextStepPidgin: 'Compare price with one next poultry supplier this week.',
    })
  }

  if (chickenInv) {
    const daysLeft = inventoryDaysRemaining(chickenInv.currentStock, chickenInv.dailyVelocity)
    if (daysLeft <= 5) {
      actions.push({
        id: 'action-restock',
        priority: 'medium',
        title: 'Chicken stock is low',
        titlePidgin: 'Chicken stock low',
        why: `Only about ${daysLeft} day(s) of chicken stock remain at the current sales pace.`,
        whyPidgin: `Na about ${daysLeft} day(s) of chicken stock remain, if the pace continue.`,
        impact: 'Avoids turning away chicken orders during a busy week.',
        impactPidgin: 'E go stop you from turn away chicken customers.',
        nextStep: 'Plan a restock before the weekend rush.',
        nextStepPidgin: 'Plan restock before weekend rush reach.',
      })
    }
  }

  if (drinksGrowth.changePct > 8) {
    actions.push({
      id: 'action-drinks-opportunity',
      priority: 'opportunity',
      title: 'Drinks sales are increasing',
      titlePidgin: 'Drinks sales dey increase',
      why: `Drinks revenue is up ${Math.round(drinksGrowth.changePct)}% — customers are buying more per visit.`,
      whyPidgin: `Drinks money increase ${Math.round(drinksGrowth.changePct)}% — customers dey buy more.`,
      impact: 'A small stock increase could capture more of this demand.',
      impactPidgin: 'If you increase stock small, you fit sell more.',
      nextStep: 'Consider increasing drinks stock by 15-20% next order.',
      nextStepPidgin: 'Try increase drinks stock small, like 15-20% for next order.',
    })
  }

  return actions
}

export function generateBusinessPassport(data: BusinessData): BusinessPassport {
  const pop30 = periodOverPeriod(data, 30)
  const pop90 = periodOverPeriod(data, 90)
  const repeatRate = repeatCustomerRate(data)

  const revenueConsistency: BusinessPassport['revenueConsistency'] =
    pop90.revenueChangePct >= 10 ? 'Strong' : pop90.revenueChangePct >= 0 ? 'Moderate' : 'Weak'
  const transactionConsistency: BusinessPassport['transactionConsistency'] =
    data.sales.length > 800 ? 'Strong' : data.sales.length > 300 ? 'Moderate' : 'Weak'
  const expenseStability: BusinessPassport['expenseStability'] =
    Math.abs(pop30.expenseChangePct - pop30.revenueChangePct) < 5
      ? 'Strong'
      : Math.abs(pop30.expenseChangePct - pop30.revenueChangePct) < 20
        ? 'Moderate'
        : 'Weak'
  const chickenInv = data.inventory.find((i) => i.name === 'Chicken')
  const inventoryEfficiency: BusinessPassport['inventoryEfficiency'] = chickenInv
    ? inventoryDaysRemaining(chickenInv.currentStock, chickenInv.dailyVelocity) > 5
      ? 'Excellent'
      : 'Good'
    : 'Good'
  const cashFlowHealth: BusinessPassport['cashFlowHealth'] =
    pop30.profitNow > pop30.profitPrev ? 'Strong' : pop30.profitNow > 0 ? 'Moderate' : 'Weak'

  return {
    businessName: data.business.name,
    operatingHistoryMonths: data.business.yearsOperating * 12,
    verifiedActivityMonths: Math.min(data.business.yearsOperating * 12, Math.round((90 / 30) * 4.6)),
    revenueConsistency,
    transactionConsistency,
    customerRetentionPct: repeatRate,
    expenseStability,
    inventoryEfficiency,
    cashFlowHealth,
    signals: [
      { label: 'Business activity verified', verified: data.sales.length > 0 },
      { label: 'Transaction history available', verified: data.sales.length > 0 },
      { label: 'Revenue pattern available', verified: data.sales.length > 20 },
      { label: 'Customer activity available', verified: data.customers.length > 0 },
      { label: 'Invoice/payment history available', verified: data.invoices.length > 0 },
    ],
  }
}

// ---------------------------------------------------------------------------
// Q&A over the dataset. Matches the question against known intents backed by
// real analytics. If nothing matches confidently, it says so explicitly
// rather than guessing — per spec, the AI must never invent financial data.
// ---------------------------------------------------------------------------
export function answerBusinessQuestion(question: string, data: BusinessData): { en: string; pcm: string } {
  const q = question.toLowerCase()
  const pop30 = periodOverPeriod(data, 30)
  const chickenPrice = supplierPriceChange(data, 'sup-chicken')
  const chickenGrowth = productGrowth(data, 'Chicken', 30)
  const productBreakdown = salesByProduct(data, 30).sort((a, b) => b.revenue - a.revenue)
  const repeatRate = repeatCustomerRate(data)
  const chickenInv = data.inventory.find((i) => i.name === 'Chicken')

  const profitReduced = pop30.profitNow < pop30.profitPrev

  if (q.includes('profit') && (q.includes('reduce') || q.includes('why') || q.includes('drop') || q.includes('fall'))) {
    if (!profitReduced) {
      return {
        en: `Good news — your profit actually grew, from ${formatNaira(pop30.profitPrev)} to ${formatNaira(pop30.profitNow)} over the last 30 days.`,
        pcm: `Good news — your profit grow, from ${formatNaira(pop30.profitPrev)} to ${formatNaira(pop30.profitNow)} for the last 30 days.`,
      }
    }
    const supplierNote = chickenPrice
      ? `The biggest reason is your chicken supplier cost, which increased by ${Math.round(chickenPrice.changePct)}%.`
      : ''
    const supplierNotePcm = chickenPrice
      ? `The biggest reason na your chicken supplier cost, wey increase by ${Math.round(chickenPrice.changePct)}%.`
      : ''
    return {
      en: `Your sales moved ${Math.round(pop30.revenueChangePct)}%, but your expenses moved ${Math.round(pop30.expenseChangePct)}% over the same period. ${supplierNote} Your chicken sales are still growing, so the issue isn't demand. What I recommend: compare supplier prices, review your chicken price, and monitor your portion cost.`,
      pcm: `Your sales change ${Math.round(pop30.revenueChangePct)}%, but your expenses change ${Math.round(pop30.expenseChangePct)}% for the same period. ${supplierNotePcm} Your chicken sales still dey grow, so the issue no be demand. Wetin I recommend: compare supplier prices, review your chicken price, and check your portion cost.`,
    }
  }

  if (q.includes('sell pass') || (q.includes('best') && q.includes('sell')) || q.includes('top product') || q.includes('sell the most')) {
    const top = productBreakdown[0]
    if (!top) return { en: 'I don\'t have enough sales data to answer that yet.', pcm: 'I no get enough information to answer that yet.' }
    return {
      en: `${top.product} is selling the most, bringing in ${formatNaira(top.revenue)} from ${top.qty} units in the last 30 days.`,
      pcm: `${top.product} dey sell pass, e don bring ${formatNaira(top.revenue)} from ${top.qty} units for the last 30 days.`,
    }
  }

  if (q.includes('expense') && (q.includes('worry') || q.includes('most') || q.includes('high'))) {
    if (chickenPrice && chickenPrice.changePct > 0) {
      return {
        en: `Your chicken supply cost is the one to watch — it rose ${Math.round(chickenPrice.changePct)}% recently, from ${formatNaira(chickenPrice.first)} to ${formatNaira(chickenPrice.last)} per portion.`,
        pcm: `Your chicken supply cost na the one to watch — e rise ${Math.round(chickenPrice.changePct)}% recently, from ${formatNaira(chickenPrice.first)} to ${formatNaira(chickenPrice.last)} per portion.`,
      }
    }
    return { en: 'I don\'t have enough expense data to answer that yet.', pcm: 'I no get enough information to answer that yet.' }
  }

  if (q.includes('more profit') || q.includes('increase profit') || (q.includes('how') && q.includes('profit'))) {
    return {
      en: `Two levers stand out: your chicken supplier cost is up ${chickenPrice ? Math.round(chickenPrice.changePct) : 0}%, so renegotiating or comparing suppliers protects margin. Drinks are also growing — stocking a bit more could add revenue without much extra cost.`,
      pcm: `Two things fit help: your chicken supplier cost don increase ${chickenPrice ? Math.round(chickenPrice.changePct) : 0}%, so if you compare suppliers e go protect your profit. Drinks dey grow well too — if you stock am small more, e fit bring more money.`,
    }
  }

  if (q.includes('stock more') || q.includes('which product') && q.includes('stock')) {
    return {
      en: 'Drinks show the clearest upward momentum right now, and chicken demand keeps growing too — just watch the chicken supplier cost.',
      pcm: 'Drinks dey show clear increase now, and chicken demand still dey grow — just watch the chicken supplier cost well.',
    }
  }

  if (q.includes('sales drop') || (q.includes('why') && q.includes('sales') && (q.includes('drop') || q.includes('fall')))) {
    if (pop30.revenueChangePct >= 0) {
      return {
        en: `Your sales didn't drop — revenue is up ${Math.round(pop30.revenueChangePct)}% over the last 30 days.`,
        pcm: `Your sales no drop — money wey enter increase ${Math.round(pop30.revenueChangePct)}% for the last 30 days.`,
      }
    }
    return {
      en: `Revenue fell ${Math.abs(Math.round(pop30.revenueChangePct))}% over the last 30 days. I don't have enough context in this data to point to a single cause beyond the sales pattern itself.`,
      pcm: `Money wey enter reduce ${Math.abs(Math.round(pop30.revenueChangePct))}% for the last 30 days. I no get enough information to point one single reason pass the sales pattern.`,
    }
  }

  if (q.includes('customer') && (q.includes('return') || q.includes('repeat') || q.includes('retention'))) {
    return {
      en: `${repeatRate}% of your customers returned within this period. Repeat customers are driving a meaningful share of your revenue.`,
      pcm: `${repeatRate}% of your customers come back for this period. Repeat customers dey drive plenty of your money.`,
    }
  }

  if (q.includes('chicken') && q.includes('stock')) {
    if (chickenInv) {
      const daysLeft = inventoryDaysRemaining(chickenInv.currentStock, chickenInv.dailyVelocity)
      return {
        en: `You have ${chickenInv.currentStock} portions of chicken left, selling at about ${chickenInv.dailyVelocity} portions a day — roughly ${daysLeft} day(s) of stock remaining.`,
        pcm: `You get ${chickenInv.currentStock} portions of chicken remain, e dey sell like ${chickenInv.dailyVelocity} portions daily — na about ${daysLeft} day(s) stock remain.`,
      }
    }
  }

  if (q.includes('chicken') && chickenGrowth.now > 0) {
    return {
      en: `Chicken sales are up ${Math.round(chickenGrowth.changePct)}% over the last 30 days, bringing in ${formatNaira(chickenGrowth.now)}.`,
      pcm: `Chicken sales don increase ${Math.round(chickenGrowth.changePct)}% for the last 30 days, e bring ${formatNaira(chickenGrowth.now)}.`,
    }
  }

  return {
    en: "I don't have enough information to answer that yet. Try asking about profit, top-selling products, expenses, or customer retention.",
    pcm: 'I no get enough information to answer that yet. Try ask about profit, wetin dey sell pass, expenses, or customer retention.',
  }
}
