import { formatMoney } from '../lib/constants'

// Cor por tipo de evento (a receber vs a pagar) — não por urgência — pra não
// confundir com os badges de status (vencida/paga) que já usam vermelho.
const typeClasses = {
  entrada: 'bg-coral/10 text-ink hover:bg-coral/20',
  saida: 'bg-rose/10 text-ink hover:bg-rose/20',
}

const amountClasses = {
  entrada: 'text-coral',
  saida: 'text-rose',
}

function NotificationItem({ notification, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(notification)}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs transition active:scale-[0.99] ${
        typeClasses[notification.billType] ?? typeClasses.saida
      }`}
    >
      <span className="text-sm leading-none">{notification.emoji}</span>
      <span className="flex-1 leading-snug">{notification.message}</span>
      <span className={`shrink-0 font-display text-xs font-semibold ${amountClasses[notification.billType] ?? amountClasses.saida}`}>
        {formatMoney(notification.amount)}
      </span>
    </button>
  )
}

export default NotificationItem
