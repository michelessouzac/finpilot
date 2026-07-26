import { useState } from 'react'
import { formatMoney, formatDate, goalTypeMeta } from '../lib/constants'
import { computeSaved, computeProgress, computeForecast, computeRequiredPace } from '../lib/goals'
import { closestGoalInsight } from '../lib/insights'
import { Card, EmptyState, TextInput, PrimaryButton, GhostButton } from './ui'
import InsightNote from './InsightNote'
import { PencilIcon, TrashIcon, CatIcon, PlusIcon, MinusIcon } from './icons'
import { GoalCat } from '../GoalCat.jsx'

function RequiredPaceLine({ goal }) {
  const pace = computeRequiredPace(goal)

  if (pace.status === 'done') {
    return <p className="text-sm font-semibold text-coral">Meta batida! 🎉</p>
  }
  if (pace.status === 'overdue') {
    return (
      <p className="text-xs text-rose">
        Data alvo já passou e ainda falta <strong>{formatMoney(pace.remaining)}</strong>.
      </p>
    )
  }
  if (pace.status === 'today') {
    return (
      <p className="text-xs text-rose">
        A meta é hoje e ainda falta <strong>{formatMoney(pace.remaining)}</strong>.
      </p>
    )
  }

  // Menos de ~45 dias: pensar em meses fica estranho, foca no valor por dia.
  if (pace.daysLeft <= 45) {
    return (
      <p className="text-xs text-gray">
        Pra bater a meta até <strong className="text-ink">{formatDate(goal.deadline)}</strong>, guarde{' '}
        <strong className="text-ink">{formatMoney(pace.perDay)}/dia</strong> ({pace.daysLeft}{' '}
        {pace.daysLeft === 1 ? 'dia' : 'dias'} restantes).
      </p>
    )
  }

  return (
    <p className="text-xs text-gray">
      Pra bater a meta até <strong className="text-ink">{formatDate(goal.deadline)}</strong>, guarde{' '}
      <strong className="text-ink">{formatMoney(pace.perMonth)}/mês</strong> (≈{' '}
      {formatMoney(pace.perDay)}/dia).
    </p>
  )
}

function PastPaceForecastLine({ goal }) {
  const forecast = computeForecast(goal)

  if (forecast.status === 'done') {
    return <p className="text-sm font-semibold text-coral">Meta batida! 🎉</p>
  }
  if (forecast.status === 'unknown') {
    return (
      <p className="text-xs text-gray">
        Guarde algumas vezes pra gente calcular a previsão de quando você bate a meta.
      </p>
    )
  }
  const months = Math.round(forecast.daysToGo / 30)
  const monthsLabel = months <= 0 ? 'menos de 1 mês' : months === 1 ? '~1 mês' : `~${months} meses`
  return (
    <p className="text-xs text-gray">
      No seu ritmo atual, você bate a meta em <strong className="text-ink">{formatDate(forecast.date)}</strong>{' '}
      ({monthsLabel})
    </p>
  )
}

function ForecastLine({ goal }) {
  return goal.deadline ? <RequiredPaceLine goal={goal} /> : <PastPaceForecastLine goal={goal} />
}

function MovementForm({ mode, max, onConfirm, onCancel }) {
  const [value, setValue] = useState('')
  const isWithdraw = mode === 'retirar'

  function handleSubmit(e) {
    e.preventDefault()
    const amount = Number(value)
    if (!amount || amount <= 0) return
    onConfirm(isWithdraw ? -amount : amount)
  }

  return (
    <form className="flex items-center gap-2" onSubmit={handleSubmit}>
      <TextInput
        type="number"
        step="0.01"
        inputMode="decimal"
        min="0"
        max={isWithdraw ? max : undefined}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0,00"
        className="flex-1"
      />
      <PrimaryButton type="submit" className="px-4 py-2.5 text-sm">
        {isWithdraw ? 'Retirar' : 'Guardar'}
      </PrimaryButton>
      <GhostButton type="button" onClick={onCancel} className="px-3 py-2.5 text-sm">
        Cancelar
      </GhostButton>
    </form>
  )
}

function GoalCard({ goal, onEdit, onDelete, onMove }) {
  const [openForm, setOpenForm] = useState(null) // 'guardar' | 'retirar' | null
  const meta = goalTypeMeta(goal.type)
  const saved = computeSaved(goal)
  const progress = computeProgress(goal)

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-coral/15 px-2.5 py-1 text-xs font-medium text-coral">
            <span>{meta.emoji}</span> {meta.label}
          </p>
          <h3 className="mt-1.5 font-display text-lg font-semibold text-ink">{goal.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(goal)}
            className="rounded-full p-2 text-gray hover:bg-ink/5 hover:text-ink"
            aria-label={`Editar ${goal.name}`}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={() => onDelete(goal.id)}
            className="rounded-full p-2 text-gray hover:bg-rose/15 hover:text-rose"
            aria-label={`Apagar ${goal.name}`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <GoalCat type={goal.type} progress={progress} name={goal.name} className="mx-auto h-40 w-40" />

      <div className="flex flex-col gap-1.5">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink/10">
          <div
            className="h-full rounded-full bg-coral transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-display font-semibold text-ink">{formatMoney(saved)}</span>
          <span className="text-gray">de {formatMoney(goal.target)}</span>
        </div>
      </div>

      <ForecastLine goal={goal} />

      {goal.deadline && (
        <p className="text-xs text-gray">Data desejada: {formatDate(goal.deadline)}</p>
      )}

      {openForm ? (
        <MovementForm
          mode={openForm}
          max={saved}
          onConfirm={(amount) => {
            onMove(goal.id, amount)
            setOpenForm(null)
          }}
          onCancel={() => setOpenForm(null)}
        />
      ) : (
        <div className="flex gap-3">
          <PrimaryButton className="flex-1" onClick={() => setOpenForm('guardar')}>
            <PlusIcon /> Guardar
          </PrimaryButton>
          <GhostButton
            className="flex-1"
            onClick={() => setOpenForm('retirar')}
            disabled={saved <= 0}
          >
            <MinusIcon /> Retirar
          </GhostButton>
        </div>
      )}
    </Card>
  )
}

function GoalList({ goals, onEdit, onDelete, onMove }) {
  if (goals.length === 0) {
    return (
      <EmptyState
        icon={<CatIcon className="text-coral" width={32} height={32} />}
        title="Nenhum gatinho ainda"
        description="Crie sua primeira meta de economia e acompanhe o gatinho engordando conforme você guarda dinheiro."
      />
    )
  }

  const insight = closestGoalInsight(goals)

  return (
    <div className="flex flex-col gap-4">
      <InsightNote insight={insight} />

      {goals.map((goal) => (
        <GoalCard key={goal.id} goal={goal} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
      ))}
    </div>
  )
}

export default GoalList
