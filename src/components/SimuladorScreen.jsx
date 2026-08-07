import { useEffect, useState } from 'react'
import { Card, Field, TextInput, Select, PrimaryButton, GhostButton, EmptyState } from './ui'
import { QuestionIcon, ArrowDownIcon, ClockIcon } from './icons'
import { formatMoney, formatDate, formatWorkHours, todayIso } from '../lib/constants'
import { simulatePurchase, simulateGoalImpact, hoursToBuy } from '../lib/simulator'
import { loadProfile, saveProfile } from '../lib/storage'

const emptyForm = { description: '', amount: '', date: todayIso(), method: 'avista', cardId: '', installments: '1' }

function SimuladorScreen({
  accounts,
  transactions,
  goals,
  bills = [],
  billPayments = [],
  subscriptions = [],
  userId,
}) {
  const [form, setForm] = useState(emptyForm)
  const [result, setResult] = useState(null)
  const cards = accounts.filter((a) => a.type === 'cartao')

  const [profile, setProfile] = useState(null)
  const [salaryInput, setSalaryInput] = useState('')
  const [editingSalary, setEditingSalary] = useState(false)
  const [savingSalary, setSavingSalary] = useState(false)

  useEffect(() => {
    let cancelled = false
    loadProfile().then((p) => {
      if (cancelled) return
      const loaded = p ?? { name: '', gender: '', avatarUrl: '', grossSalary: '' }
      setProfile(loaded)
      setSalaryInput(loaded.grossSalary ? String(loaded.grossSalary) : '')
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSaveSalary(e) {
    e.preventDefault()
    const grossSalary = Number(salaryInput)
    if (!grossSalary || grossSalary <= 0) return

    setSavingSalary(true)
    try {
      await saveProfile(userId, { ...profile, grossSalary })
      setProfile((p) => ({ ...p, grossSalary }))
      setEditingSalary(false)
    } finally {
      setSavingSalary(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const amount = Number(form.amount)
    if (!form.description.trim() || !amount || amount <= 0 || !form.date) return
    if (form.method === 'cartao' && !form.cardId) return

    const installments = form.method === 'cartao' ? Math.max(1, Number(form.installments) || 1) : 1
    const purchase = {
      description: form.description.trim(),
      amount,
      date: form.date,
      installments,
      cardId: form.method === 'cartao' ? form.cardId : null,
    }
    const projection = simulatePurchase(accounts, transactions, purchase, {
      bills,
      billPayments,
      subscriptions,
    })
    const goalImpacts = (goals ?? [])
      .map((goal) => ({ goal, impact: simulateGoalImpact(goal, amount) }))
      .filter((g) => g.impact)

    setResult({ purchase, projection, goalImpacts })
  }

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={<QuestionIcon className="text-coral" width={32} height={32} />}
        title="Cadastre uma conta pra simular"
        description="Vá na aba Contas e adicione uma conta pra poder simular o impacto de uma compra futura."
      />
    )
  }

  const whatIfPoints = result?.projection.whatIf
  const last = whatIfPoints?.[whatIfPoints.length - 1]
  const baselineLast = result?.projection.baseline[result.projection.baseline.length - 1]
  const goesNegative = result && result.projection.lowest.balance < 0
  const cardCheck = result?.projection.cardCheck
  const overspend = result?.projection.overspend

  const hourlyWage = profile?.grossSalary ? Number(profile.grossSalary) / 220 : null

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ClockIcon className="text-coral" width={20} height={20} />
          <h3 className="font-display text-base font-semibold text-ink">Seu salário bruto</h3>
        </div>

        {!editingSalary && hourlyWage && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray">
              {formatMoney(profile.grossSalary)}/mês · {formatMoney(hourlyWage)}/hora (÷ 220h)
            </p>
            <GhostButton type="button" onClick={() => setEditingSalary(true)}>
              Editar
            </GhostButton>
          </div>
        )}

        {!editingSalary && !hourlyWage && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray">
              Cadastre pra ver quantas horas de trabalho cada compra custa.
            </p>
            <GhostButton type="button" onClick={() => setEditingSalary(true)}>
              Cadastrar
            </GhostButton>
          </div>
        )}

        {editingSalary && (
          <form className="flex items-end gap-2" onSubmit={handleSaveSalary}>
            <Field label="Salário bruto mensal">
              <TextInput
                type="number"
                step="0.01"
                inputMode="decimal"
                value={salaryInput}
                onChange={(e) => setSalaryInput(e.target.value)}
                placeholder="0,00"
                autoFocus
                required
              />
            </Field>
            <PrimaryButton type="submit" disabled={savingSalary}>
              {savingSalary ? 'Salvando...' : 'Salvar'}
            </PrimaryButton>
            {hourlyWage && (
              <GhostButton type="button" onClick={() => setEditingSalary(false)}>
                Cancelar
              </GhostButton>
            )}
          </form>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Simular compra futura</h2>
          <p className="text-xs text-gray">Veja o impacto antes de decidir, sem mexer nos seus dados</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Field label="O que você quer comprar">
            <TextInput
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Ex: Notebook novo"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor total">
              <TextInput
                type="number"
                step="0.01"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0,00"
                required
              />
            </Field>

            <Field label="Data da compra">
              <TextInput
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </Field>
          </div>

          <Field label="Forma de pagamento">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'avista', label: 'À vista' },
                { id: 'cartao', label: 'Cartão de crédito' },
              ].map((option) => {
                const active = form.method === option.id
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setForm({ ...form, method: option.id })}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                      active ? 'bg-coral text-surface' : 'bg-ink/5 text-ink hover:bg-coral/15'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </Field>

          {form.method === 'cartao' && cards.length === 0 && (
            <p className="rounded-2xl bg-rose/10 px-4 py-3 text-sm text-ink">
              Cadastre um cartão de crédito primeiro, na aba <strong>Contas</strong>.
            </p>
          )}

          {form.method === 'cartao' && cards.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cartão">
                <Select
                  value={form.cardId}
                  onChange={(e) => setForm({ ...form, cardId: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    Escolha
                  </option>
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Parcelas">
                <TextInput
                  type="number"
                  min="1"
                  max="24"
                  step="1"
                  value={form.installments}
                  onChange={(e) => setForm({ ...form, installments: e.target.value })}
                />
              </Field>
            </div>
          )}

          <PrimaryButton type="submit">Simular impacto</PrimaryButton>
        </form>
      </Card>

      {result && (
        <>
          {cardCheck && (
            <Card className="flex flex-col gap-2">
              <h3 className="font-display text-lg font-semibold text-ink">Limite do cartão</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray">{cardCheck.cardName} · limite disponível</span>
                <span className="font-semibold text-ink">{formatMoney(cardCheck.availableLimit)}</span>
              </div>
              {cardCheck.fits ? (
                <p className="rounded-2xl bg-coral/10 px-4 py-3 text-sm text-ink">
                  ✅ Dá pra fazer essa compra, cabe no limite disponível.
                </p>
              ) : (
                <p className="rounded-2xl bg-rose/10 px-4 py-3 text-sm text-ink">
                  ⚠️ Não cabe no limite disponível — faltam {formatMoney(cardCheck.missing)}.
                </p>
              )}
            </Card>
          )}

          <Card className="flex flex-col gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-ink">
                Impacto no saldo projetado
              </h3>
              <p className="text-xs text-gray">
                {result.projection.installments > 1
                  ? `"${result.purchase.description}" parcelado em ${result.projection.installments}x de ${formatMoney(result.projection.installmentAmount)}, a partir de ${formatDate(result.purchase.date)}`
                  : `Comprando "${result.purchase.description}" em ${formatDate(result.purchase.date)}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-gray">Sem a compra</span>
                <span className="font-display text-xl font-bold text-ink">
                  {formatMoney(baselineLast.balance)}
                </span>
                <span className="text-xs text-gray">em {formatDate(baselineLast.date)}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-1.5 text-sm font-medium text-gray">
                  <ArrowDownIcon className="text-rose" /> Com a compra
                </span>
                <span className="font-display text-xl font-bold text-ink">{formatMoney(last.balance)}</span>
                <span className="text-xs text-gray">em {formatDate(last.date)}</span>
              </div>
            </div>

            {goesNegative && (
              <p className="rounded-2xl bg-rose/10 px-4 py-3 text-sm text-ink">
                ⚠️ Com essa compra, seu saldo projetado fica negativo em{' '}
                {formatDate(result.projection.lowest.date)} ({formatMoney(result.projection.lowest.balance)}).
              </p>
            )}

            {overspend && (
              <p className="rounded-2xl bg-rose/10 px-4 py-3 text-sm text-ink">
                ⚠️ A parcela de {formatMoney(overspend.installmentAmount)} é maior que sua sobra mensal atual
                ({formatMoney(overspend.monthlyNet)}) — durante {overspend.months}{' '}
                {overspend.months === 1 ? 'mês' : 'meses'} você vai gastar mais do que ganha.
              </p>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ClockIcon className="text-coral" width={20} height={20} />
              <h3 className="font-display text-lg font-semibold text-ink">Horas de trabalho</h3>
            </div>

            {hourlyWage ? (
              <>
                <p className="text-sm text-gray">
                  Ao valor da sua hora ({formatMoney(hourlyWage)}), "{result.purchase.description}"
                  custa
                </p>
                <span className="font-display text-2xl font-bold text-ink">
                  {formatWorkHours(hoursToBuy(result.purchase.amount, profile.grossSalary))}
                </span>
                {result.projection.installments > 1 && (
                  <p className="text-xs text-gray">
                    {formatWorkHours(hoursToBuy(result.projection.installmentAmount, profile.grossSalary))}{' '}
                    de trabalho por parcela
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray">
                Cadastre seu salário bruto acima pra ver quantas horas de trabalho essa compra
                custa.
              </p>
            )}
          </Card>

          <Card className="flex flex-col gap-3">
            <h3 className="font-display text-lg font-semibold text-ink">Impacto nos gatinhos</h3>

            {result.goalImpacts.length === 0 && (
              <p className="text-sm text-gray">
                Nenhuma meta com previsão ativa seria afetada por essa compra.
              </p>
            )}

            {result.goalImpacts.map(({ goal, impact }) => (
              <div key={goal.id} className="flex items-center justify-between gap-3 rounded-2xl bg-rose/10 px-4 py-3">
                <span className="text-sm font-medium text-ink">{goal.name}</span>
                <span className="text-right text-xs text-gray">
                  atrasa {impact.extraDays} {impact.extraDays === 1 ? 'dia' : 'dias'}
                  <br />
                  {formatDate(impact.originalDate)} → {formatDate(impact.newDate)}
                </span>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  )
}

export default SimuladorScreen
