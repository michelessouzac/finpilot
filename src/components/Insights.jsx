import { EmptyState } from './ui'
import { SparkleIcon } from './icons'
import { computeInsights } from '../lib/insights'

const toneClasses = {
  positive: 'bg-coral/10',
  warning: 'bg-rose/15',
  neutral: 'bg-ink/5',
}

function Insights({ accounts, transactions, categories, goals }) {
  const insights = computeInsights(accounts, transactions, categories, goals)

  if (insights.length === 0) {
    return (
      <EmptyState
        icon={<SparkleIcon className="text-coral" width={32} height={32} />}
        title="Ainda sem insights"
        description="Lance e categorize algumas transações pra Finny começar a notar padrões nos seus gastos."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">Insights</h2>
        <p className="text-xs text-gray">
          Tudo o que Finny percebeu, num só lugar — alguns desses avisos também aparecem direto
          nas telas de Contas, Lançamentos, Caixa de entrada e Gatinhos.
        </p>
      </div>

      {insights.map((insight) => (
        <div
          key={insight.id}
          className={`flex items-start gap-3 rounded-[1.75rem] p-5 shadow-[0_12px_30px_-16px_rgba(30,30,30,0.25)] ${toneClasses[insight.tone]}`}
        >
          <span className="text-2xl leading-none">{insight.emoji}</span>
          <p className="text-sm text-ink">{insight.text}</p>
        </div>
      ))}
    </div>
  )
}

export default Insights
