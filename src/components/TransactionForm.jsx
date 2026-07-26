import { useState } from 'react'
import { Field, TextInput, Select, PrimaryButton, GhostButton, Card } from './ui'
import { CloseIcon } from './icons'
import { todayIso } from '../lib/constants'

function emptyForm(accounts) {
  return {
    description: '',
    amount: '',
    type: 'saida',
    date: todayIso(),
    accountId: accounts[0]?.id ?? '',
    recurring: false,
  }
}

function TransactionForm({ accounts, initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ?? emptyForm(accounts))
  const [applyToGroup, setApplyToGroup] = useState(true)
  const isGrouped = Boolean(initial?.groupId)

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.description.trim() || form.amount === '' || !form.accountId) return
    onSave({ ...form, amount: Number(form.amount), applyToGroup: isGrouped && applyToGroup })
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">
          {initial ? 'Editar lançamento' : 'Novo lançamento'}
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
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Ex: Mercado, Salário, Uber"
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <Select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
            </Select>
          </Field>

          <Field label="Valor">
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
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <TextInput
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </Field>

          <Field label="Conta / cartão">
            <Select
              value={form.accountId}
              onChange={(e) => setForm({ ...form, accountId: e.target.value })}
              required
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-gray">
          <input
            type="checkbox"
            checked={form.recurring}
            onChange={(e) => setForm({ ...form, recurring: e.target.checked })}
            className="h-4 w-4 rounded border-ink/20 accent-coral"
          />
          É recorrente (se repete todo mês)
        </label>

        {isGrouped && (
          <label className="flex items-center gap-2 text-sm font-medium text-gray">
            <input
              type="checkbox"
              checked={applyToGroup}
              onChange={(e) => setApplyToGroup(e.target.checked)}
              className="h-4 w-4 rounded border-ink/20 accent-coral"
            />
            Aplicar esse nome às outras ocorrências dessa assinatura/parcela
          </label>
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

export default TransactionForm
