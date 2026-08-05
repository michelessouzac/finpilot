import { useMemo, useRef, useState } from 'react'
import { Card, EmptyState } from './ui'
import InsightNote from './InsightNote'
import NotificationItem from './NotificationItem'
import { ArrowUpIcon, ArrowDownIcon, WalletIcon } from './icons'
import { formatMoney, formatDate } from '../lib/constants'
import {
  computeMonthSummary,
  computeProjection,
  computeAvailableBalance,
  computeInvestedAmount,
  computeGoalsReserved,
  computePocketsReserved,
} from '../lib/dashboard'
import { overspendAlertInsight, monthComparisonInsight } from '../lib/insights'

function ProjectionChart({ points }) {
  const width = 300
  const height = 120
  const padding = 8

  const svgRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(null)

  const balances = points.map((p) => p.balance)
  const min = Math.min(...balances)
  const max = Math.max(...balances)
  const range = max - min || 1

  const toX = (i) => padding + (i / (points.length - 1)) * (width - padding * 2)
  const toY = (balance) =>
    height - padding - ((balance - min) / range) * (height - padding * 2)

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.balance)}`).join(' ')
  const zeroY = min <= 0 && max >= 0 ? toY(0) : null

  const first = points[0]
  const last = points[points.length - 1]
  const active = activeIndex !== null ? points[activeIndex] : null

  const updateFromClientX = (clientX) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    const x = ratio * width
    const i = Math.round(((x - padding) / (width - padding * 2)) * (points.length - 1))
    setActiveIndex(Math.min(points.length - 1, Math.max(0, i)))
  }

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromClientX(e.clientX)
  }
  const handlePointerMove = (e) => {
    if (e.buttons === 0 && e.pointerType === 'mouse' && activeIndex === null) return
    updateFromClientX(e.clientX)
  }
  const handlePointerEnter = (e) => {
    if (e.pointerType === 'mouse') updateFromClientX(e.clientX)
  }
  const handlePointerUp = () => setActiveIndex(null)
  const handlePointerLeave = (e) => {
    if (e.pointerType === 'mouse') setActiveIndex(null)
  }

  const tooltipX = active ? toX(activeIndex) : 0
  const tooltipSide = tooltipX > width - 70 ? 'right' : 'left'

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="block w-full touch-none select-none text-coral"
          preserveAspectRatio="none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerEnter={handlePointerEnter}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        >
          {zeroY !== null && (
            <line
              x1={padding}
              x2={width - padding}
              y1={zeroY}
              y2={zeroY}
              stroke="currentColor"
              strokeOpacity="0.15"
              strokeDasharray="4 4"
            />
          )}
          <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={toX(points.length - 1)} cy={toY(last.balance)} r="4" fill="currentColor" />

          {active && (
            <g>
              <line
                x1={tooltipX}
                x2={tooltipX}
                y1={padding}
                y2={height - padding}
                stroke="currentColor"
                strokeOpacity="0.3"
                strokeWidth="1"
              />
              <circle cx={tooltipX} cy={toY(active.balance)} r="4.5" fill="white" stroke="currentColor" strokeWidth="2.5" />
            </g>
          )}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute top-0"
            style={{ left: `${(tooltipX / width) * 100}%` }}
          >
            <div
              className={`absolute top-0 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-xs text-white shadow-lg ${
                tooltipSide === 'right' ? '-translate-x-full' : ''
              }`}
            >
              <div className="font-semibold">{formatMoney(active.balance)}</div>
              <div className="text-[10px] text-white/70">
                {activeIndex === 0 ? 'Hoje' : formatDate(active.date)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between text-xs text-gray">
        <span>Hoje · {formatMoney(first.balance)}</span>
        <span>{formatDate(last.date)} · {formatMoney(last.balance)}</span>
      </div>
    </div>
  )
}

function availabilityNote({ reserved, invested }) {
  if (reserved <= 0 && invested <= 0) return null
  const apart = reserved + invested
  return `${formatMoney(apart)} em investimentos, gatinhos e saldo separado não entram nesse valor.`
}

function Dashboard({
  accounts,
  transactions,
  goals,
  pockets,
  notifications = [],
  onNotificationClick,
}) {
  const summary = useMemo(() => computeMonthSummary(accounts, transactions), [accounts, transactions])
  const projection = useMemo(() => computeProjection(accounts, transactions, 30), [accounts, transactions])
  const available = useMemo(
    () => computeAvailableBalance(accounts, transactions, goals, pockets),
    [accounts, transactions, goals, pockets],
  )
  const invested = useMemo(
    () => computeInvestedAmount(accounts, transactions),
    [accounts, transactions],
  )
  const reserved = useMemo(
    () => computeGoalsReserved(goals) + computePocketsReserved(pockets),
    [goals, pockets],
  )
  const note = availabilityNote({ reserved, invested })
  const overspendAlert = useMemo(() => overspendAlertInsight(transactions), [transactions])
  const monthComparison = useMemo(() => monthComparisonInsight(transactions), [transactions])

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={<WalletIcon className="text-coral" width={32} height={32} />}
        title="Cadastre uma conta pra começar"
        description="Vá na aba Contas e adicione uma conta ou cartão pra ver seu panorama financeiro aqui."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <InsightNote insight={overspendAlert} />

      <Card className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray">Saldo disponível</span>
        <span className="font-display text-3xl font-bold text-ink">{formatMoney(available)}</span>
        <span className="text-[11px] text-gray">
          {note ?? 'Soma das contas (não conta limite de cartão)'}
        </span>
      </Card>

      <Card className="flex flex-row items-center justify-between gap-2 py-3">
        <span className="text-sm font-medium text-gray">Saldo total</span>
        <span className="font-display text-lg font-semibold text-ink">
          {formatMoney(summary.totalBalance)}
        </span>
      </Card>

      {notifications.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onClick={onNotificationClick} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-sm font-medium text-gray">
            <ArrowUpIcon className="text-mint" /> Entradas
          </span>
          <span className="font-display text-xl font-bold text-ink">{formatMoney(summary.income)}</span>
          <span className="text-xs text-gray">Este mês</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-sm font-medium text-gray">
            <ArrowDownIcon className="text-rose" /> Saídas
          </span>
          <span className="font-display text-xl font-bold text-ink">{formatMoney(summary.expense)}</span>
          <span className="text-xs text-gray">Este mês</span>
        </Card>
      </div>

      <Card className="flex flex-col gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Projeção 30 dias</h2>
          <p className="text-xs text-gray">Baseada nos lançamentos marcados como recorrentes</p>
        </div>
        <ProjectionChart points={projection} />
      </Card>

      <InsightNote insight={monthComparison} />
    </div>
  )
}

export default Dashboard
