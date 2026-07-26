import { useState } from 'react'
import { Field, TextInput, Select, PrimaryButton, GhostButton, Card } from './ui'
import { CloseIcon } from './icons'
import { todayIso } from '../lib/constants'

function emptyForm(accounts) {
  return {
    name: '',
    type: 'saida',
    amount: '',
    variableAmount: false,
    recurring: true,
    dueDay: '10',
    dueDate: todayIso(),
    accountId: accounts[0]?.id ?? '',
    category: '',
    person: '',
    installmentsEnabled: false,
    installmentsCount: '3',
  }
}

// A bill salva não tem `installmentsEnabled`/`installmentsCount` (só
// `installments`) — reconstrói esses campos auxiliares do form a partir dela.
function formFrom(bill, accounts) {
  if (!bill) return emptyForm(accounts)
  return {
    ...bill,
    amount: bill.amount ?? '',
    dueDay: bill.dueDay ?? '10',
    dueDate: bill.dueDate ?? todayIso(),
    category: bill.category ?? '',
    person: bill.person ?? '',
    installmentsEnabled: Boolean(bill.installments),
    installmentsCount: bill.installments ? String(bill.installments) : '3',
  }
}

function BillForm({ accounts, categories = [], initial, onSave, onCancel }) {
  const payableAccounts = accounts.filter((a) => a.type !== 'cartao')
  const [form, setForm] = useState(() => formFrom(initial, payableAccounts))

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.accountId) return
    if (!form.variableAmount && form.amount === '') return
    const { installmentsEnabled, installmentsCount, ...rest } = form
    onSave({
      ...rest,
      amount: form.amount === '' ? null : Number(form.amount),
      dueDay: form.recurring ? Number(form.dueDay) : null,
      dueDate: form.recurring ? null : form.dueDate,
      category: form.category || undefined,
      person: form.person.trim() || undefined,
      installments: !form.recurring && installmentsEnabled ? Number(installmentsCount) : null,
      active: true,
    })
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">
          {initial ? 'Editar conta a pagar/receber' : 'Nova conta a pagar/receber'}
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
        <Field label="Descrição">
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Aluguel, Água, Energia, Assinatura cliente"
            required
          />
        </Field>

        <Field label="Tipo">
          <div className="flex gap-2">
            {[
              { id: 'saida', label: 'A pagar' },
              { id: 'entrada', label: 'A receber' },
            ].map((option) => {
              const active = form.type === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setForm({ ...form, type: option.id })}
                  className={`flex-1 rounded-2xl px-4 py-2.5 text-sm font-medium transition active:scale-[0.98] ${
                    active ? 'bg-coral text-surface' : 'bg-ink/5 text-ink hover:bg-coral/15'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </Field>

        <Field label="Pessoa (opcional)">
          <TextInput
            value={form.person}
            onChange={(e) => setForm({ ...form, person: e.target.value })}
            placeholder="Ex: Joana, Paula"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm font-medium text-gray">
          <input
            type="checkbox"
            checked={form.variableAmount}
            onChange={(e) => setForm({ ...form, variableAmount: e.target.checked })}
            className="h-4 w-4 rounded border-ink/20 accent-coral"
          />
          Valor muda todo mês (ex: água, energia)
        </label>

        <Field label={form.variableAmount ? 'Valor estimado (opcional)' : 'Valor'}>
          <TextInput
            type="number"
            step="0.01"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="0,00"
            required={!form.variableAmount}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm font-medium text-gray">
          <input
            type="checkbox"
            checked={form.recurring}
            onChange={(e) =>
              setForm({ ...form, recurring: e.target.checked, installmentsEnabled: false })
            }
            className="h-4 w-4 rounded border-ink/20 accent-coral"
          />
          É recorrente (vence todo mês)
        </label>

        {!form.recurring && (
          <label className="flex items-center gap-2 text-sm font-medium text-gray">
            <input
              type="checkbox"
              checked={form.installmentsEnabled}
              onChange={(e) => setForm({ ...form, installmentsEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-ink/20 accent-coral"
            />
            Parcelar em várias vezes
          </label>
        )}

        {form.installmentsEnabled && (
          <Field label="Número de parcelas">
            <TextInput
              type="number"
              min="2"
              max="360"
              value={form.installmentsCount}
              onChange={(e) => setForm({ ...form, installmentsCount: e.target.value })}
              required
            />
          </Field>
        )}

        {form.recurring ? (
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
        ) : (
          <Field label={form.installmentsEnabled ? 'Data da 1ª parcela' : 'Data de vencimento'}>
            <TextInput
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
            />
          </Field>
        )}

        <Field
          label={
            form.type === 'entrada'
              ? 'Conta em que o valor costuma entrar'
              : 'Conta de onde costuma sair o pagamento'
          }
        >
          <Select
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            required
          >
            {payableAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>

        {categories.length > 0 && (
          <Field label="Categoria (opcional)">
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </Select>
          </Field>
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

export default BillForm
