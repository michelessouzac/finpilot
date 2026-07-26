import { formatMoney, formatDate, categoryMeta } from '../lib/constants'
import { recurringCommitmentInsight } from '../lib/insights'
import { Card, EmptyState } from './ui'
import InsightNote from './InsightNote'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DollarIcon,
  PencilIcon,
  RepeatIcon,
  TrashIcon,
} from './icons'

function TransactionList({ transactions, accounts, categories = [], onEdit, onDelete }) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={<DollarIcon className="text-coral" width={32} height={32} />}
        title="Nenhum lançamento ainda"
        description="Registre uma entrada ou saída pra começar a acompanhar seus gastos."
      />
    )
  }

  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? 1 : -1))
  const insight = recurringCommitmentInsight(transactions)

  return (
    <div className="flex flex-col gap-3">
      <InsightNote insight={insight} />

      {sorted.map((tx) => {
        const account = accounts.find((a) => a.id === tx.accountId)
        const category = categoryMeta(categories, tx.category)
        const isEntrada = tx.type === 'entrada'
        return (
          <Card key={tx.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                  isEntrada ? 'bg-mint/15 text-mint' : 'bg-rose/15 text-rose'
                }`}
              >
                {isEntrada ? <ArrowUpIcon /> : <ArrowDownIcon />}
              </div>
              <div>
                <p className="font-display font-semibold text-ink">{tx.description}</p>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray">
                  {formatDate(tx.date)} · {account?.name ?? 'Conta removida'}
                  {tx.recurring && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-ink/5 px-1.5 py-0.5">
                      <RepeatIcon /> recorrente
                    </span>
                  )}
                  {tx.installment && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-rose/15 px-1.5 py-0.5 text-rose">
                      parcela {tx.installment.index}/{tx.installment.total}
                      {tx.projected ? ' · prevista' : ''}
                    </span>
                  )}
                  {category ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-coral/15 px-1.5 py-0.5 text-coral">
                      {category.emoji} {category.label}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-rose/15 px-1.5 py-0.5 text-rose">
                      sem categoria
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`font-display font-semibold ${
                  isEntrada ? 'text-mint' : 'text-ink'
                }`}
              >
                {isEntrada ? '+' : '-'} {formatMoney(tx.amount)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(tx)}
                  className="rounded-full p-2 text-gray hover:bg-ink/5 hover:text-ink"
                  aria-label={`Editar ${tx.description}`}
                >
                  <PencilIcon />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(tx.id)}
                  className="rounded-full p-2 text-gray hover:bg-rose/15 hover:text-rose"
                  aria-label={`Apagar ${tx.description}`}
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export default TransactionList
