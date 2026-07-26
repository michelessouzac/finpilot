import { useMemo, useState } from 'react'
import { formatMoney, formatDate, monthLabel } from '../lib/constants'
import {
  listInvoicePeriods,
  cardTransactionsInPeriod,
  invoiceTotal,
  invoiceDueDate,
  isPeriodClosed,
  cardSpendingByCategory,
  cardAvailableLimit,
} from '../lib/invoices'
import { Card, Select, GhostButton, PrimaryButton } from './ui'
import ImportInvoice from './ImportInvoice.jsx'
import { ArrowDownIcon, ArrowUpIcon, UploadIcon } from './icons'

function InvoiceItem({ tx }) {
  const isEntrada = tx.type === 'entrada'
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink/5 py-2.5 last:border-0">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            isEntrada ? 'bg-mint/15 text-mint' : 'bg-ink/5 text-ink'
          }`}
        >
          {isEntrada ? <ArrowUpIcon width={14} height={14} /> : <ArrowDownIcon width={14} height={14} />}
        </div>
        <div>
          <p className="text-sm font-medium text-ink">{tx.description}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray">
            {formatDate(tx.date)}
            {tx.installment && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-rose/15 px-1.5 py-0.5 text-rose">
                parcela {tx.installment.index}/{tx.installment.total}
              </span>
            )}
            {tx.projected && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-ink/5 px-1.5 py-0.5">
                prevista
              </span>
            )}
          </p>
        </div>
      </div>
      <span className={`text-sm font-semibold ${isEntrada ? 'text-mint' : 'text-ink'}`}>
        {isEntrada ? '- ' : ''}
        {formatMoney(tx.amount)}
      </span>
    </div>
  )
}

// Ficha do cartão preenchida sozinha com o que já foi cadastrado na conta —
// a pessoa não precisa digitar de novo banco, vencimento, fechamento ou
// limite aqui, só ver o resumo.
function CardInfoSummary({ card, transactions, bills, billPayments }) {
  const available = cardAvailableLimit(card, transactions, bills, billPayments)
  const fields = [
    { label: 'Banco emissor', value: card.name },
    { label: 'Fechamento da fatura', value: card.closingDay ? `Dia ${card.closingDay}` : '—' },
    { label: 'Vencimento da fatura', value: card.dueDay ? `Dia ${card.dueDay}` : '—' },
    { label: 'Limite do cartão', value: formatMoney(card.amount) },
    { label: 'Limite disponível', value: formatMoney(available) },
  ]

  return (
    <Card className="grid grid-cols-2 gap-3">
      {fields.map((field) => (
        <div key={field.label} className="flex flex-col gap-0.5">
          <span className="text-xs text-gray">{field.label}</span>
          <span className="font-display text-sm font-semibold text-ink">{field.value}</span>
        </div>
      ))}
    </Card>
  )
}

function CardInvoiceView({ card, transactions, categories }) {
  const periods = useMemo(() => listInvoicePeriods(card, { pastCount: 6, futureCount: 1 }), [card])
  const currentIndex = periods.findIndex((p) => !isPeriodClosed(p))
  const [index, setIndex] = useState(currentIndex === -1 ? periods.length - 1 : currentIndex)

  const period = periods[index]
  const items = useMemo(
    () => cardTransactionsInPeriod(transactions, card.id, period).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [transactions, card.id, period],
  )
  const total = invoiceTotal(transactions, card.id, period)
  const dueDate = invoiceDueDate(card, period.periodKey)
  const closed = isPeriodClosed(period)
  const categoryBreakdown = useMemo(
    () => cardSpendingByCategory(transactions, card.id, period, categories),
    [transactions, card.id, period, categories],
  )

  const prevPeriod = periods[index - 1]
  const prevTotal = prevPeriod ? invoiceTotal(transactions, card.id, prevPeriod) : null

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <GhostButton
            type="button"
            onClick={() => setIndex(Math.max(0, index - 1))}
            disabled={index === 0}
            className="px-3 py-1.5 text-xs"
          >
            ‹ Anterior
          </GhostButton>
          <span className="text-sm font-medium text-gray">{monthLabel(period.periodKey)}</span>
          <GhostButton
            type="button"
            onClick={() => setIndex(Math.min(periods.length - 1, index + 1))}
            disabled={index === periods.length - 1}
            className="px-3 py-1.5 text-xs"
          >
            Próxima ›
          </GhostButton>
        </div>

        <div className="flex flex-col items-center gap-1 py-2">
          <span className="text-sm font-medium text-gray">
            {closed ? 'Total da fatura' : 'Total em aberto (fatura ainda não fechou)'}
          </span>
          <span className="font-display text-3xl font-bold text-ink">{formatMoney(total)}</span>
          <span className="text-xs text-gray">
            Fecha dia {card.closingDay} · Vence {formatDate(dueDate)}
          </span>
        </div>

        {prevTotal !== null && (
          <p className="text-center text-xs text-gray">
            Fatura anterior ({monthLabel(prevPeriod.periodKey)}): {formatMoney(prevTotal)}
          </p>
        )}
      </Card>

      {categoryBreakdown.length > 0 && (
        <Card className="flex flex-col gap-2">
          <h3 className="font-display text-sm font-semibold text-ink">Gastos por categoria nessa fatura</h3>
          {categoryBreakdown.map(({ category, total: catTotal }) => (
            <div key={category.id} className="flex items-center justify-between text-sm">
              <span className="text-gray">
                {category.emoji} {category.label}
              </span>
              <span className="font-medium text-ink">{formatMoney(catTotal)}</span>
            </div>
          ))}
        </Card>
      )}

      <Card className="flex flex-col">
        <h3 className="mb-1 font-display text-sm font-semibold text-ink">Lançamentos dessa fatura</h3>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray">Nenhum lançamento nesse período.</p>
        ) : (
          items.map((tx) => <InvoiceItem key={tx.id} tx={tx} />)
        )}
      </Card>
    </div>
  )
}

function CardsScreen({
  accounts,
  transactions,
  categories,
  bills = [],
  billPayments = [],
  onImport,
  onUpdateCardInfo,
  onCreateAccount,
  selectedCardId,
  onSelectCard,
}) {
  const cards = accounts.filter((a) => a.type === 'cartao')
  // A seleção pode vir de fora (ex: link de "Faturas em aberto" em
  // Lançamentos) — sem `onSelectCard`, essa tela cuida da própria seleção.
  const [internalSelectedId, setInternalSelectedId] = useState(cards[0]?.id ?? '')
  const isControlled = Boolean(onSelectCard)
  const selectedId = isControlled ? selectedCardId : internalSelectedId
  const setSelectedId = isControlled ? onSelectCard : setInternalSelectedId
  const [showImport, setShowImport] = useState(cards.length === 0)

  function handleImport(accountId, items) {
    onImport(accountId, items)
    setSelectedId(accountId)
    setShowImport(false)
  }

  // Mantém sempre a mesma estrutura de árvore (esse <div>), mesmo sem
  // nenhum cartão cadastrado ainda — importar sozinho já cria a conta pelo
  // banco detectado na fatura, então cards.length pode virar 1 no meio do
  // processo. Se isso mudasse qual elemento é a raiz do retorno, o React
  // desmontaria e remontaria o ImportInvoice, perdendo todo o progresso.
  const selectedCard = cards.find((c) => c.id === selectedId) ?? cards[0]

  return (
    <div className="flex flex-col gap-4">
      {cards.length > 1 && (
        <Select value={selectedCard.id} onChange={(e) => setSelectedId(e.target.value)}>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      )}

      {selectedCard && (
        <CardInfoSummary
          card={selectedCard}
          transactions={transactions}
          bills={bills}
          billPayments={billPayments}
        />
      )}

      {!showImport && (
        <PrimaryButton type="button" onClick={() => setShowImport(true)}>
          <UploadIcon /> Importar fatura (PDF)
        </PrimaryButton>
      )}

      {showImport && (
        <ImportInvoice
          accounts={accounts}
          transactions={transactions}
          categories={categories}
          onImport={handleImport}
          onUpdateCardInfo={onUpdateCardInfo}
          onCreateAccount={onCreateAccount}
          onCancel={() => setShowImport(false)}
        />
      )}

      {selectedCard && (
        <CardInvoiceView card={selectedCard} transactions={transactions} categories={categories} />
      )}
    </div>
  )
}

export default CardsScreen
