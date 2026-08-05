import { todayIso, categoryMeta } from './constants'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function ymd(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function clampDay(year, month, day) {
  return Math.min(Math.max(1, day), daysInMonth(year, month))
}

// Intervalo de compras que cai numa fatura: do dia seguinte ao fechamento
// anterior até o dia de fechamento do `periodKey` (mês em que a fatura fecha).
export function invoicePeriod(card, periodKey) {
  const [year, month] = periodKey.split('-').map(Number)
  const closingDay = clampDay(year, month, Number(card.closingDay) || 1)
  const end = ymd(year, month, closingDay)

  const prevMonthDate = new Date(Date.UTC(year, month - 2, 1))
  const prevYear = prevMonthDate.getUTCFullYear()
  const prevMonth = prevMonthDate.getUTCMonth() + 1
  const prevClosingDay = clampDay(prevYear, prevMonth, Number(card.closingDay) || 1)
  const startDate = new Date(Date.UTC(prevYear, prevMonth - 1, prevClosingDay + 1))
  const start = startDate.toISOString().slice(0, 10)

  return { periodKey, start, end }
}

// Em qual fatura (periodKey) uma data de compra cai: se for até o dia de
// fechamento, entra na fatura desse mês; senão, já é da fatura do mês
// seguinte.
export function periodKeyForDate(dateIso, card) {
  const [y, m, d] = dateIso.split('-').map(Number)
  const closingDay = clampDay(y, m, Number(card.closingDay) || 1)
  if (d <= closingDay) return `${y}-${pad2(m)}`
  const next = new Date(Date.UTC(y, m, 1))
  return `${next.getUTCFullYear()}-${pad2(next.getUTCMonth() + 1)}`
}

export function currentPeriodKey(card, today = todayIso()) {
  return periodKeyForDate(today, card)
}

// Identidade estável de uma fatura: cartão + competência. Não é uma linha
// própria no banco — é só a chave usada pra vincular transações à fatura
// delas (ver `resolveInvoiceId`/`backfillInvoiceIds`), a mesma dupla
// (cardId + periodKey) que o efeito de gerar contas a partir de fatura
// fechada já usa informalmente pra identificar cada fatura (App.jsx).
export function invoiceIdFor(accountId, periodKey) {
  return `${accountId}:${periodKey}`
}

// Calcula a fatura (invoiceId + periodKey) que uma transação de cartão deve
// carregar, a partir da data dela e do fechamento do cartão. Retorna `null`
// se o cartão não tem `closingDay` cadastrado — nesse caso é melhor deixar a
// transação sem fatura (sinal visível de que falta configurar o cartão) do
// que chutar um fechamento, o que faria a transação entrar silenciosamente
// na fatura errada.
export function resolveInvoiceId(dateIso, card) {
  if (card?.closingDay == null) return null
  const periodKey = periodKeyForDate(dateIso, card)
  return { invoiceId: invoiceIdFor(card.id, periodKey), periodKey }
}

// Migração auto-aplicada: carimba `invoiceId`/`periodKey` em toda transação
// de cartão que ainda não tem (dados importados/lançados antes desse campo
// existir). Nunca recalcula uma transação que já tem invoiceId — uma vez
// vinculada, a fatura da transação fica congelada mesmo que o fechamento do
// cartão mude depois; é exatamente isso que evita o bug de uma fatura já
// importada "sumir" quando o dia de fechamento é ajustado.
export function backfillInvoiceIds(transactions, accounts) {
  const cardsById = new Map(accounts.filter((a) => a.type === 'cartao').map((a) => [a.id, a]))

  return (transactions ?? []).map((t) => {
    if (t.invoiceId) return t
    const card = cardsById.get(t.accountId)
    if (!card) return t
    const resolved = resolveInvoiceId(t.date, card)
    if (!resolved) return t
    return { ...t, ...resolved }
  })
}

// Vencimento da fatura: convenção comum no Brasil — se o dia de vencimento é
// depois do dia de fechamento, vence no mesmo mês do fechamento; senão, só
// vence no mês seguinte.
export function invoiceDueDate(card, periodKey) {
  const [year, month] = periodKey.split('-').map(Number)
  const closingDay = Number(card.closingDay) || 1
  const dueDay = Number(card.dueDay) || 1
  const sameMonth = dueDay > closingDay

  const dueDate = new Date(Date.UTC(year, month - 1 + (sameMonth ? 0 : 1), 1))
  const dueYear = dueDate.getUTCFullYear()
  const dueMonth = dueDate.getUTCMonth() + 1
  return ymd(dueYear, dueMonth, clampDay(dueYear, dueMonth, dueDay))
}

// Fonte da verdade de "quais transações pertencem a essa fatura": o vínculo
// gravado (invoiceId), não mais a data recalculada contra o fechamento atual
// do cartão — assim editar o dia de fechamento de um cartão não reembaralha
// faturas já importadas/lançadas.
export function cardTransactionsInPeriod(transactions, cardId, period) {
  const expectedId = invoiceIdFor(cardId, period.periodKey)
  return (transactions ?? []).filter((t) => t.invoiceId === expectedId)
}

function signedInvoiceAmount(tx) {
  const amount = Number(tx.amount) || 0
  return tx.type === 'entrada' ? -amount : amount
}

// Total da fatura = soma das compras (saída) menos estornos/créditos
// (entrada) lançados no cartão dentro do período.
export function invoiceTotal(transactions, cardId, period) {
  return cardTransactionsInPeriod(transactions, cardId, period).reduce(
    (sum, t) => sum + signedInvoiceAmount(t),
    0,
  )
}

// Limite ainda disponível no cartão: limite total menos o que já foi gasto
// na fatura em aberto e menos as faturas fechadas que ainda não foram pagas
// (o limite só volta de verdade quando a fatura é quitada, não quando fecha).
export function cardAvailableLimit(card, transactions, bills = [], billPayments = []) {
  const openPeriod = invoicePeriod(card, currentPeriodKey(card))
  const openTotal = invoiceTotal(transactions, card.id, openPeriod)
  const unpaidPastInvoices = bills
    .filter((b) => b.cardId === card.id)
    .filter((b) => !billPayments.some((p) => p.billId === b.id))
    .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

  return (Number(card.amount) || 0) - openTotal - unpaidPastInvoices
}

export function isPeriodClosed(period, today = todayIso()) {
  return today > period.end
}

// Faturas navegáveis: `pastCount` fechadas antes da atual, a atual, e
// `futureCount` adiante (pra compras já lançadas com data futura).
export function listInvoicePeriods(card, { pastCount = 6, futureCount = 1 } = {}) {
  const current = currentPeriodKey(card)
  const [y, m] = current.split('-').map(Number)
  const periods = []
  for (let offset = -pastCount; offset <= futureCount; offset++) {
    const d = new Date(Date.UTC(y, m - 1 + offset, 1))
    const periodKey = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`
    periods.push(invoicePeriod(card, periodKey))
  }
  return periods
}

// Gastos por categoria dentro de uma fatura específica — mesma ideia de
// `spendingByCategory` em lib/insights.js, só que escopado a cartão+período
// em vez de mês calendário.
export function cardSpendingByCategory(transactions, cardId, period, categories) {
  const periodTx = cardTransactionsInPeriod(transactions, cardId, period).filter(
    (t) => t.type === 'saida',
  )
  const totals = new Map()

  for (const tx of periodTx) {
    if (!tx.category) continue
    totals.set(tx.category, (totals.get(tx.category) || 0) + (Number(tx.amount) || 0))
  }

  return [...totals.entries()]
    .map(([categoryId, total]) => ({ category: categoryMeta(categories, categoryId), total }))
    .filter((entry) => entry.category)
    .sort((a, b) => b.total - a.total)
}
