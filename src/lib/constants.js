export const ACCOUNT_TYPES = [
  { value: 'corrente', label: 'Conta corrente', amountLabel: 'Saldo atual' },
  { value: 'cartao', label: 'Cartão de crédito', amountLabel: 'Limite atual' },
  { value: 'investimento', label: 'Investimento', amountLabel: 'Saldo atual' },
]

export function accountTypeMeta(value) {
  return ACCOUNT_TYPES.find((t) => t.value === value) ?? ACCOUNT_TYPES[0]
}

export function formatMoney(value) {
  const n = Number(value) || 0
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Data local de hoje em YYYY-MM-DD. `toISOString()` usa UTC, o que faz a
// data "virar o dia" mais cedo em fusos negativos (ex: Brasil, à noite) —
// por isso montamos a string a partir dos componentes locais.
export function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDate(isoDate) {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year.slice(-2)}`
}

// Jornada padrão usada pra converter salário mensal em valor da hora
// trabalhada (CLT: 44h/semana ≈ 220h/mês).
export const WORK_HOURS_PER_MONTH = 220

export function formatWorkHours(hours) {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

export const DEFAULT_CATEGORIES = [
  { id: 'alimentacao', label: 'Alimentação', emoji: '🍽️' },
  { id: 'transporte', label: 'Transporte', emoji: '🚗' },
  { id: 'lazer', label: 'Lazer', emoji: '🎉' },
  { id: 'contas-fixas', label: 'Contas fixas', emoji: '📄' },
  { id: 'salario', label: 'Salário', emoji: '💰' },
  { id: 'diversos', label: 'Diversos', emoji: '📦' },
]

function stripDiacritics(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function slugify(text) {
  return stripDiacritics(text.toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
}

export function categoryMeta(categories, id) {
  return categories.find((c) => c.id === id) ?? null
}

export const GOAL_TYPES = [
  { id: 'viagem', label: 'Viagem', emoji: '✈️' },
  { id: 'casa', label: 'Casa nova', emoji: '🏠' },
  { id: 'manicure', label: 'Manicure', emoji: '💅' },
  { id: 'eletronico', label: 'Eletrônico', emoji: '📱' },
  { id: 'presente', label: 'Presente', emoji: '🎁' },
  { id: 'emergencia', label: 'Reserva de emergência', emoji: '🛟' },
  { id: 'outro', label: 'Outro', emoji: '🐷' },
]

export function goalTypeMeta(id) {
  return GOAL_TYPES.find((t) => t.id === id) ?? GOAL_TYPES[GOAL_TYPES.length - 1]
}

export function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-')
  const date = new Date(Number(year), Number(month) - 1, 1)
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
