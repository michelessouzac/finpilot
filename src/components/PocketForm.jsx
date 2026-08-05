import { useState } from 'react'
import { Field, TextInput, PrimaryButton, GhostButton, Card } from './ui'
import { CloseIcon } from './icons'

const emptyForm = { name: '' }

function PocketForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial ? { name: initial.name } : emptyForm)

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">
          {initial ? 'Editar saldo separado' : 'Novo saldo separado'}
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
        <Field label="Nome">
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Aluguel, Reserva de emergência"
            autoFocus
            required
          />
        </Field>

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

export default PocketForm
