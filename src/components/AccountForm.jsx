import { useState } from 'react'
import { ACCOUNT_TYPES, accountTypeMeta } from '../lib/constants'
import { Field, TextInput, Select, PrimaryButton, GhostButton, Card } from './ui'
import { CloseIcon } from './icons'

const emptyForm = {
  name: '',
  type: 'corrente',
  amount: '',
  closingDay: '25',
  dueDay: '5',
  paymentAccountId: '',
}

function AccountForm({ accounts = [], initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? emptyForm)
  const meta = accountTypeMeta(form.type)
  const isCard = form.type === 'cartao'
  const paymentAccounts = accounts.filter((a) => a.type !== 'cartao')

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || form.amount === '') return
    onSave({
      ...form,
      amount: Number(form.amount),
      closingDay: isCard ? Number(form.closingDay) : null,
      dueDay: isCard ? Number(form.dueDay) : null,
      paymentAccountId: isCard ? form.paymentAccountId || null : null,
    })
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">
          {initial ? 'Editar conta' : 'Nova conta'}
        </h2>
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
        <Field label="Nome da conta ou cartão">
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Nubank, Carteira, XP Investimentos"
            required
          />
        </Field>

        <Field label="Tipo">
          <Select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={meta.amountLabel}>
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

        {isCard && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dia do fechamento">
                <TextInput
                  type="number"
                  min="1"
                  max="31"
                  value={form.closingDay}
                  onChange={(e) => setForm({ ...form, closingDay: e.target.value })}
                  required
                />
              </Field>
              <Field label="Dia do vencimento">
                <TextInput
                  type="number"
                  min="1"
                  max="31"
                  value={form.dueDay}
                  onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                  required
                />
              </Field>
            </div>

            {paymentAccounts.length > 0 && (
              <Field label="Conta que paga a fatura">
                <Select
                  value={form.paymentAccountId}
                  onChange={(e) => setForm({ ...form, paymentAccountId: e.target.value })}
                >
                  <option value="">Escolher na hora de pagar</option>
                  {paymentAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </>
        )}

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

export default AccountForm
