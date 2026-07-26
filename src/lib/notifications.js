import { formatMoney, todayIso } from './constants'
import { buildOccurrences } from './bills'

function installmentSuffix(occurrence) {
  return occurrence.installmentTotal > 1
    ? ` (parcela ${occurrence.installmentIndex}/${occurrence.installmentTotal})`
    : ''
}

function buildMessage(occurrence) {
  const { bill, status } = occurrence
  const isEntrada = bill.type === 'entrada'
  const amount = formatMoney(bill.amount ?? 0)
  const suffix = installmentSuffix(occurrence)

  if (status === 'vence-em-breve') {
    return isEntrada
      ? `Você tem a receber ${amount} de ${bill.name}${bill.person ? ` com ${bill.person}` : ''}${suffix} essa semana.`
      : `Você precisa pagar ${amount} de ${bill.name}${bill.person ? ` para ${bill.person}` : ''}${suffix} essa semana.`
  }

  // vencida
  return isEntrada
    ? bill.person
      ? `${bill.person} ainda não te pagou ${amount} de ${bill.name}${suffix}.`
      : `Você ainda não recebeu ${amount} de ${bill.name}${suffix}.`
    : `Você ainda não pagou ${bill.name}${suffix} desse mês.`
}

// Gera uma notificação por ocorrência pendente (vencida ou vencendo em
// breve), pronta pra ser exibida e clicada — cada uma carrega o `billId` +
// `monthKey` da ocorrência de origem, usados pra navegar direto até o card
// certo na tela de Lançamentos.
export function buildNotifications(bills, billPayments, today = todayIso()) {
  const occurrences = buildOccurrences(bills, billPayments, today)

  return occurrences
    .filter((o) => !o.paid && (o.status === 'vencida' || o.status === 'vence-em-breve'))
    .map((o) => ({
      id: o.key,
      billId: o.bill.id,
      monthKey: o.monthKey,
      status: o.status,
      billType: o.bill.type,
      amount: o.bill.amount ?? 0,
      message: buildMessage(o),
      tone: o.status === 'vencida' ? 'warning' : 'neutral',
      emoji: o.status === 'vencida' ? '⚠️' : '⏰',
    }))
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'vencida' ? -1 : 1))
}
