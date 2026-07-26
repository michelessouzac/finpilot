import { accountTypeMeta, formatMoney } from '../lib/constants'
import { accountCurrentBalance } from '../lib/dashboard'
import { accountBalanceInsight } from '../lib/insights'
import { Card, EmptyState } from './ui'
import InsightNote from './InsightNote'
import { PencilIcon, TrashIcon, WalletIcon } from './icons'

function AccountList({ accounts, transactions, onEdit, onDelete }) {
  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={<WalletIcon className="text-coral" width={32} height={32} />}
        title="Nenhuma conta ainda"
        description="Adicione sua primeira conta ou cartão pra começar a lançar seus gastos."
      />
    )
  }

  const insight = accountBalanceInsight(accounts, transactions)

  return (
    <div className="flex flex-col gap-3">
      <InsightNote insight={insight} />

      {accounts.map((account) => {
        const meta = accountTypeMeta(account.type)
        const amount =
          account.type === 'cartao'
            ? account.amount
            : accountCurrentBalance(account, transactions)
        return (
          <Card key={account.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-coral/15 text-coral">
                <WalletIcon width={20} height={20} />
              </div>
              <div>
                <p className="font-display font-semibold text-ink">{account.name}</p>
                <p className="text-xs text-gray">
                  {meta.label} · {meta.amountLabel.replace(' atual', '')} {formatMoney(amount)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit(account)}
                className="rounded-full p-2 text-gray hover:bg-ink/5 hover:text-ink"
                aria-label={`Editar ${account.name}`}
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                onClick={() => onDelete(account.id)}
                className="rounded-full p-2 text-gray hover:bg-rose/15 hover:text-rose"
                aria-label={`Apagar ${account.name}`}
              >
                <TrashIcon />
              </button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export default AccountList
