import { useRef, useState } from 'react'
import { TrashIcon } from './icons'

const ACTION_WIDTH = 76

// Arrastar pra esquerda revela o botão de apagar por baixo do card; soltar
// além da metade do botão "trava" aberto, além de 1.6x já apaga direto.
function SwipeToDelete({ onDelete, deleteLabel = 'Apagar', children }) {
  const [dragX, setDragX] = useState(0)
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const startX = useRef(0)
  const startDragX = useRef(0)
  const pointerId = useRef(null)
  // Depois de um mousedown+mouseup com movimento, o navegador ainda dispara
  // um "click" — sem isso, esse click "fantasma" reabria o onClickCapture
  // logo abaixo e fechava o card na hora que ele acabava de abrir.
  const didDragRef = useRef(false)

  function handlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Sem isso, arrastar com o mouse por cima do texto do card seleciona o
    // texto em vez de (ou junto com) disparar o swipe.
    if (e.pointerType === 'mouse') e.preventDefault()
    pointerId.current = e.pointerId
    startX.current = e.clientX
    startDragX.current = dragX
    didDragRef.current = false
    setDragging(true)
  }

  function handlePointerMove(e) {
    if (pointerId.current !== e.pointerId) return
    const delta = e.clientX - startX.current
    if (Math.abs(delta) > 4) didDragRef.current = true
    const next = Math.min(0, Math.max(-ACTION_WIDTH - 24, startDragX.current + delta))
    setDragX(next)
  }

  function endDrag(e) {
    if (pointerId.current !== e.pointerId) return
    pointerId.current = null
    setDragging(false)
    if (dragX <= -ACTION_WIDTH * 1.6) {
      onDelete()
      setDragX(0)
      setOpen(false)
      return
    }
    if (dragX <= -ACTION_WIDTH / 2) {
      setDragX(-ACTION_WIDTH)
      setOpen(true)
    } else {
      setDragX(0)
      setOpen(false)
    }
  }

  function closeAndDelete() {
    onDelete()
    setDragX(0)
    setOpen(false)
  }

  return (
    <div className="relative overflow-hidden rounded-[1.75rem]">
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center"
        style={{ width: ACTION_WIDTH }}
      >
        <button
          type="button"
          aria-label={deleteLabel}
          onClick={closeAndDelete}
          className="flex h-full w-full items-center justify-center bg-rose text-surface"
        >
          <TrashIcon width={20} height={20} />
        </button>
      </div>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={(e) => {
          if (didDragRef.current) {
            e.preventDefault()
            e.stopPropagation()
            didDragRef.current = false
            return
          }
          if (open) {
            e.preventDefault()
            e.stopPropagation()
            setDragX(0)
            setOpen(false)
          }
        }}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
          touchAction: 'pan-y',
          userSelect: dragging ? 'none' : undefined,
          WebkitUserSelect: dragging ? 'none' : undefined,
        }}
        className="relative"
      >
        {children}
      </div>
    </div>
  )
}

export default SwipeToDelete
