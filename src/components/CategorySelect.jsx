import { useId, useState } from 'react'
import { Select, TextInput } from './ui'
import { PlusIcon, CheckIcon, CloseIcon } from './icons'
import { slugify } from '../lib/constants'
import { emojiForLabel } from '../lib/emoji'

// Seletor de categoria com um "+" do lado pra criar uma categoria na hora,
// sem sair do formulário. Antes só dava pra criar categoria na Caixa de
// entrada, então quem estava lançando uma conta precisava salvar, ir pra
// outra tela, criar a categoria e voltar pra editar o lançamento.
function CategorySelect({ categories = [], value, onChange, onAddCategory, label = 'Categoria (opcional)' }) {
  const [creating, setCreating] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  // O botão "+" fica ao lado do campo, então não dá pra envolver os dois num
  // <label> (como faz o `Field`) — o rótulo aponta pro campo pelo id.
  const fieldId = useId()

  function handleCreate() {
    const trimmed = newLabel.trim()
    const id = slugify(trimmed)
    if (!id) return
    // Categoria repetida (mesmo nome, ou nome que vira o mesmo slug) só é
    // selecionada, não duplicada na lista.
    if (!categories.some((c) => c.id === id)) {
      onAddCategory({ id, label: trimmed, emoji: emojiForLabel(trimmed) })
    }
    onChange(id)
    setNewLabel('')
    setCreating(false)
  }

  function handleCancel() {
    setNewLabel('')
    setCreating(false)
  }

  return (
    <div className="flex flex-col gap-1.5 text-left">
      <label htmlFor={fieldId} className="text-sm font-medium text-gray">
        {label}
      </label>

      {creating ? (
        <div className="flex items-stretch gap-2">
          {/* Prévia do emoji escolhido automaticamente pelo nome digitado. */}
          <span
            aria-hidden="true"
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-ink/5 px-3 text-xl leading-none"
          >
            {emojiForLabel(newLabel)}
          </span>
          <div className="min-w-0 flex-1">
            <TextInput
              id={fieldId}
              autoFocus
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              // O campo vive dentro do formulário da conta/lançamento: sem
              // isso, dar Enter aqui salvaria o formulário inteiro em vez de
              // criar a categoria.
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleCreate()
                }
                if (e.key === 'Escape') handleCancel()
              }}
              placeholder="Nome da nova categoria"
            />
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-coral px-3.5 text-surface transition hover:brightness-105 active:scale-95"
            aria-label="Salvar nova categoria"
          >
            <CheckIcon />
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-ink/10 px-3 text-ink transition hover:bg-ink/15 active:scale-95"
            aria-label="Cancelar nova categoria"
          >
            <CloseIcon />
          </button>
        </div>
      ) : (
        <div className="flex items-stretch gap-2">
          <div className="min-w-0 flex-1">
            <Select id={fieldId} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-ink/10 px-3.5 text-ink transition hover:bg-ink/15 active:scale-95"
            aria-label="Criar nova categoria"
            title="Criar nova categoria"
          >
            <PlusIcon />
          </button>
        </div>
      )}
    </div>
  )
}

export default CategorySelect
