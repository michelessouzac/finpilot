import { formatMoney } from '../lib/constants'
import { currentPeriodKey, invoicePeriod, invoiceTotal, invoiceMonthLabel } from '../lib/invoices'
import { Card } from './ui'
import { CardIcon } from './icons'

// Mostra, por cartão, quanto já foi gasto na fatura que ainda está aberta —
// recalcula sozinho a cada novo lançamento no cartão, sem esperar ela fechar
// (a fatura só vira conta a pagar depois de fechada, em App.jsx).
function OpenInvoicesSummary({ accounts, transactions, subscriptions = [], onSelectCard }) {
  const cards = accounts.filter((a) => a.type === 'cartao')
  if (cards.length === 0) return null

  const rows = cards.map((card) => {
    const periodKey = currentPeriodKey(card)
    const period = invoicePeriod(card, periodKey)
    const total = invoiceTotal(transactions, card.id, period, subscriptions)
    return { card, period, total }
  })

  return (
    <Card className="flex flex-col gap-3">
      <h3 className="flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
        <CardIcon width={16} height={16} /> Faturas em aberto
      </h3>
      {rows.map(({ card, period, total }) => (
        <button
          key={card.id}
          type="button"
          onClick={() => onSelectCard?.(card.id)}
          className="flex items-center justify-between rounded-xl px-1 py-0.5 text-left text-sm transition hover:bg-ink/5 active:scale-[0.99]"
        >
          <span className="text-gray underline decoration-ink/20 underline-offset-2">
            {card.name} · {invoiceMonthLabel(card, period.periodKey)}
          </span>
          <span className="font-display font-semibold text-ink">{formatMoney(total)}</span>
        </button>
      ))}
      <p className="text-xs text-gray">
        Ainda não fechou — o valor atualiza sozinho conforme você lança gastos no cartão.
      </p>
    </Card>
  )
}

export default OpenInvoicesSummary
