import NotificationItem from './NotificationItem'

function NotificationsPanel({ notifications, onSelect, onClear, onClose }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-4 top-[5.5rem] z-50 flex max-h-[60vh] w-[calc(100%-2rem)] max-w-sm flex-col gap-2 overflow-y-auto rounded-[1.75rem] bg-surface p-3 shadow-[0_20px_40px_-16px_rgba(30,30,30,0.35)]">
        <div className="flex items-center justify-between px-2 pt-1">
          <p className="font-display text-sm font-semibold text-ink">Notificações</p>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-coral transition hover:text-rose"
            >
              Limpar todas
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <p className="px-2 pb-2 text-sm text-gray">Nenhuma pendência por aqui 🎉</p>
        ) : (
          notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onClick={onSelect} />
          ))
        )}
      </div>
    </>
  )
}

export default NotificationsPanel
