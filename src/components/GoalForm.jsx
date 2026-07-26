import { useState } from 'react'
import { GOAL_TYPES } from '../lib/constants'
import { Field, TextInput, PrimaryButton, GhostButton, Card } from './ui'
import { CloseIcon } from './icons'

const emptyForm = { name: '', type: GOAL_TYPES[0].id, target: '', deadline: '' }

function GoalForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(
    initial ? { name: initial.name, type: initial.type, target: initial.target, deadline: initial.deadline ?? '' } : emptyForm,
  )

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || form.target === '') return
    onSave({ ...form, target: Number(form.target) })
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">
          {initial ? 'Editar gatinho' : 'Novo gatinho'}
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
        <Field label="Nome da meta">
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Viagem pra praia, Casa nova"
            required
          />
        </Field>

        <Field label="Tipo">
          <div className="flex flex-wrap gap-2">
            {GOAL_TYPES.map((t) => {
              const active = form.type === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.id })}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition active:scale-95 ${
                    active ? 'bg-coral text-surface' : 'bg-ink/5 text-ink hover:bg-coral/15'
                  }`}
                >
                  <span>{t.emoji}</span>
                  {t.label}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor alvo">
            <TextInput
              type="number"
              step="0.01"
              inputMode="decimal"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })}
              placeholder="0,00"
              required
            />
          </Field>

          <Field label="Data alvo (opcional)">
            <TextInput
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />
          </Field>
        </div>

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

export default GoalForm
