import { useState } from 'react'
import { Field, TextInput, Select, PrimaryButton, GhostButton, Card } from './ui'
import CategorySelect from './CategorySelect'
import { CloseIcon } from './icons'
import { todayIso, formatMoney, formatDate } from '../lib/constants'
import {
  periodKeyForDate,
  invoiceDueDate,
  invoiceMonthLabel,
  installmentSchedule,
} from '../lib/invoices'

const MODES = [
  { id: 'avista', label: 'À vista' },
  { id: 'parcelado', label: 'Parcelado' },
  { id: 'assinatura', label: 'Assinatura' },
]

function emptyForm() {
  return {
    description: '',
    amount: '',
    date: todayIso(),
    category: '',
    mode: 'avista',
    installmentsTotal: '2',
    currentInstallment: '1',
    chargeDay: String(Number(todayIso().slice(-2))),
  }
}

// Prévia do que vai ser criado — o ponto mais fácil de errar aqui é a fatura
// em que a compra cai (depende do fechamento do cartão, não do mês da compra),
// então ela é mostrada antes de salvar em vez de virar surpresa depois.
function Preview({ form, card }) {
  const amount = Number(form.amount) || 0

  if (form.mode === 'assinatura') {
    const day = Number(form.chargeDay) || 1
    const periodKey = periodKeyForDate(form.date, card)
    return (
      <p className="rounded-2xl bg-ink/5 px-4 py-3 text-xs text-gray">
        Vai cobrar {formatMoney(amount)} todo dia {day}, entrando em toda fatura a partir da de{' '}
        {invoiceMonthLabel(card, periodKey)} — até você interromper.
      </p>
    )
  }

  if (form.mode === 'parcelado') {
    const total = Number(form.installmentsTotal) || 1
    const current = Number(form.currentInstallment) || 1
    const schedule = installmentSchedule(form.date, current, total)
    if (schedule.length === 0) return null
    const last = schedule[schedule.length - 1]
    return (
      <p className="rounded-2xl bg-ink/5 px-4 py-3 text-xs text-gray">
        Vai lançar {schedule.length} parcela{schedule.length > 1 ? 's' : ''} de{' '}
        {formatMoney(amount)} (da {current}ª à {total}ª), da fatura de{' '}
        {invoiceMonthLabel(card, periodKeyForDate(schedule[0].date, card))} até a de{' '}
        {invoiceMonthLabel(card, periodKeyForDate(last.date, card))}. Total de{' '}
        {formatMoney(amount * schedule.length)} segurando limite.
        {current > 1 && ` As ${current - 1} primeiras não são lançadas — já caíram em faturas anteriores.`}
      </p>
    )
  }

  const periodKey = periodKeyForDate(form.date, card)
  return (
    <p className="rounded-2xl bg-ink/5 px-4 py-3 text-xs text-gray">
      Entra na fatura de {invoiceMonthLabel(card, periodKey)}, que vence em{' '}
      {formatDate(invoiceDueDate(card, periodKey))}.
    </p>
  )
}

function CardPurchaseForm({ card, categories = [], onSave, onCancel, onAddCategory }) {
  const [form, setForm] = useState(emptyForm)

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim() || form.amount === '') return
    onSave({
      ...form,
      amount: Number(form.amount),
      category: form.category || undefined,
      installmentsTotal: Number(form.installmentsTotal),
      currentInstallment: Number(form.currentInstallment),
      chargeDay: Number(form.chargeDay),
    })
  }

  const isParcelado = form.mode === 'parcelado'
  const isAssinatura = form.mode === 'assinatura'

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">Nova compra no {card.name}</h2>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-1.5 text-gray hover:bg-ink/5"
          aria-label="Fechar"
        >
          <CloseIcon />
        </button>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <Field label="Descrição">
          <TextInput
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ex: Livro, Mercado, Netflix"
            required
          />
        </Field>

        <Field label="Como foi a compra">
          <div className="flex gap-2">
            {MODES.map((option) => {
              const active = form.mode === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setForm({ ...form, mode: option.id })}
                  className={`flex-1 rounded-2xl px-3 py-2.5 text-sm font-medium transition active:scale-[0.98] ${
                    active ? 'bg-coral text-surface' : 'bg-ink/5 text-ink hover:bg-coral/15'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label={isParcelado ? 'Valor da parcela' : isAssinatura ? 'Valor por mês' : 'Valor'}
          >
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

          <Field label={isAssinatura ? 'Início da assinatura' : 'Data da compra'}>
            <TextInput
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </Field>
        </div>

        {isParcelado && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total de parcelas">
              <TextInput
                type="number"
                min="2"
                max="360"
                value={form.installmentsTotal}
                onChange={(e) => setForm({ ...form, installmentsTotal: e.target.value })}
                required
              />
            </Field>
            <Field label="Qual parcela está caindo agora">
              <TextInput
                type="number"
                min="1"
                max={form.installmentsTotal || undefined}
                value={form.currentInstallment}
                onChange={(e) => setForm({ ...form, currentInstallment: e.target.value })}
                required
              />
            </Field>
          </div>
        )}

        {isAssinatura && (
          <Field label="Dia da cobrança">
            <TextInput
              type="number"
              min="1"
              max="31"
              value={form.chargeDay}
              onChange={(e) => setForm({ ...form, chargeDay: e.target.value })}
              required
            />
          </Field>
        )}

        <CategorySelect
          categories={categories}
          value={form.category}
          onChange={(category) => setForm({ ...form, category })}
          onAddCategory={onAddCategory}
        />

        {form.amount !== '' && <Preview form={form} card={card} />}

        <div className="flex gap-3 pt-1">
          <PrimaryButton type="submit" className="flex-1">
            Salvar
          </PrimaryButton>
          <GhostButton type="button" onClick={onCancel}>
            Cancelar
          </GhostButton>
        </div>
      </form>
    </Card>
  )
}

export default CardPurchaseForm
