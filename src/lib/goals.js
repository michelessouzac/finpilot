import { todayIso } from './constants'

// Datas são strings YYYY-MM-DD; ancoramos em UTC só pra fazer a subtração de
// dias, sem deixar o fuso horário local (ex: horário de Brasília) interferir.
function daysBetween(isoA, isoB) {
  const a = Date.UTC(...isoA.split('-').map(Number))
  const b = Date.UTC(...isoB.split('-').map(Number))
  return (b - a) / (1000 * 60 * 60 * 24)
}

function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return date.toISOString().slice(0, 10)
}

// Cada meta guarda uma lista de movimentos (depósitos positivos, retiradas
// negativas). O valor guardado e a previsão são sempre derivados dela, então
// nunca ficam "dessincronizados" do histórico.

export function computeSaved(goal) {
  return (goal.movements ?? []).reduce((sum, m) => sum + (Number(m.amount) || 0), 0)
}

export function computeProgress(goal) {
  const target = Number(goal.target) || 0
  if (target <= 0) return 0
  const saved = computeSaved(goal)
  return Math.max(0, Math.min(100, (saved / target) * 100))
}

// Previsão de quando a meta é atingida, baseada no ritmo médio de depósitos
// dos últimos 90 dias (não é só uma barra de progresso estática).
export function computeForecast(goal) {
  const target = Number(goal.target) || 0
  const saved = computeSaved(goal)
  const remaining = target - saved

  if (remaining <= 0) return { status: 'done' }

  const movements = goal.movements ?? []
  if (movements.length === 0) return { status: 'unknown' }

  const today = todayIso()
  const windowStart = addDays(today, -90)

  const recentDeposits = movements.filter(
    (m) => m.amount > 0 && m.date >= windowStart && m.date <= today,
  )

  if (recentDeposits.length === 0) return { status: 'unknown' }

  const totalRecent = recentDeposits.reduce((sum, m) => sum + Number(m.amount), 0)
  const oldestDate = recentDeposits.reduce((min, m) => (m.date < min ? m.date : min), today)
  const daysSpan = Math.max(1, daysBetween(oldestDate, today))
  const dailyRate = totalRecent / daysSpan

  if (dailyRate <= 0) return { status: 'unknown' }

  const daysToGo = Math.ceil(remaining / dailyRate)

  return { status: 'forecast', date: addDays(today, daysToGo), daysToGo }
}

// Quanto falta guardar por dia/mês pra bater a meta exatamente na data alvo,
// sempre recalculado a partir de hoje (não do dia em que a meta foi criada) —
// então o valor sobe se a pessoa atrasar os depósitos e desce se adiantar.
export function computeRequiredPace(goal) {
  const target = Number(goal.target) || 0
  const saved = computeSaved(goal)
  const remaining = target - saved

  if (remaining <= 0) return { status: 'done' }
  if (!goal.deadline) return { status: 'no-deadline' }

  const today = todayIso()
  const daysLeft = daysBetween(today, goal.deadline)

  if (daysLeft < 0) return { status: 'overdue', remaining }
  if (daysLeft === 0) return { status: 'today', remaining }

  const perDay = remaining / daysLeft
  const perMonth = perDay * 30

  return { status: 'ok', remaining, daysLeft, perDay, perMonth }
}
