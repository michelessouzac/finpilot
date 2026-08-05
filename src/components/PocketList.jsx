import { useState } from 'react'
import { formatMoney } from '../lib/constants'
import { computeSaved } from '../lib/goals'
import { Card, EmptyState, PrimaryButton, GhostButton } from './ui'
import MovementForm from './MovementForm'
import { PencilIcon, TrashIcon, PlusIcon, MinusIcon, PocketIcon } from './icons'

function PocketCard({ pocket, onEdit, onDelete, onMove }) {
  const [openForm, setOpenForm] = useState(null) // 'guardar' | 'retirar' | null
  const saved = computeSaved(pocket)

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral/15 text-coral">
            <PocketIcon width={20} height={20} />
          </span>
          <h3 className="font-display text-lg font-semibold text-ink">{pocket.name}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(pocket)}
            className="rounded-full p-2 text-gray hover:bg-ink/5 hover:text-ink"
            aria-label={`Editar ${pocket.name}`}
          >
            <PencilIcon />
          </button>
          <button
            type="button"
            onClick={() => onDelete(pocket.id)}
            className="rounded-full p-2 text-gray hover:bg-rose/15 hover:text-rose"
            aria-label={`Apagar ${pocket.name}`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <span className="font-display text-2xl font-bold text-ink">{formatMoney(saved)}</span>

      {openForm ? (
        <MovementForm
          mode={openForm}
          max={saved}
          onConfirm={(amount) => {
            onMove(pocket.id, amount)
            setOpenForm(null)
          }}
          onCancel={() => setOpenForm(null)}
        />
      ) : (
        <div className="flex gap-3">
          <PrimaryButton className="flex-1" onClick={() => setOpenForm('guardar')}>
            <PlusIcon /> Guardar
          </PrimaryButton>
          <GhostButton
            className="flex-1"
            onClick={() => setOpenForm('retirar')}
            disabled={saved <= 0}
          >
            <MinusIcon /> Retirar
          </GhostButton>
        </div>
      )}
    </Card>
  )
}

function PocketList({ pockets, onEdit, onDelete, onMove }) {
  if (pockets.length === 0) {
    return (
      <EmptyState
        icon={<PocketIcon className="text-coral" width={32} height={32} />}
        title="Nenhum saldo separado ainda"
        description="Guarde valores à parte pra usar quando precisar — sem meta nem prazo, diferente dos gatinhos."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {pockets.map((pocket) => (
        <PocketCard key={pocket.id} pocket={pocket} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
      ))}
    </div>
  )
}

export default PocketList
