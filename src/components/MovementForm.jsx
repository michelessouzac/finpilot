import { useState } from 'react'
import { TextInput, PrimaryButton, GhostButton } from './ui'

// Formulário de "guardar/retirar" valor, usado tanto pelas metas (Gatinhos)
// quanto pelo saldo separado — a mecânica de mover dinheiro é idêntica.
function MovementForm({ mode, max, onConfirm, onCancel }) {
  const [value, setValue] = useState('')
  const isWithdraw = mode === 'retirar'

  function handleSubmit(e) {
    e.preventDefault()
    const amount = Number(value)
    if (!amount || amount <= 0) return
    onConfirm(isWithdraw ? -amount : amount)
  }

  return (
    <form className="flex items-center gap-2" onSubmit={handleSubmit}>
      <TextInput
        type="number"
        step="0.01"
        inputMode="decimal"
        min="0"
        max={isWithdraw ? max : undefined}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0,00"
        className="flex-1"
      />
      <PrimaryButton type="submit" className="px-4 py-2.5 text-sm">
        {isWithdraw ? 'Retirar' : 'Guardar'}
      </PrimaryButton>
      <GhostButton type="button" onClick={onCancel} className="px-3 py-2.5 text-sm">
        Cancelar
      </GhostButton>
    </form>
  )
}

export default MovementForm
