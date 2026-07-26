// Notificações "de verdade" (aparecem na central de notificações do
// celular/computador), via Notification API + Service Worker. Sem servidor
// de push, elas só disparam enquanto o navegador consegue manter o service
// worker vivo (app aberto ou recém em segundo plano) — não chegam com o app
// totalmente fechado/matado, diferente de apps nativos com push do servidor.

const NOTIFIED_KEY = 'finpilot:notifiedIds'

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/sw.js')
  } catch {
    return null
  }
}

export async function showDeviceNotification(title, options = {}) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return
  try {
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null
    if (registration) {
      await registration.showNotification(title, { icon: '/favicon.svg', badge: '/favicon.svg', ...options })
      return
    }
  } catch {
    // segue pro fallback abaixo
  }
  try {
    new Notification(title, { icon: '/favicon.svg', ...options })
  } catch {
    // navegador recusou/sem suporte — ignora, o alerta continua visível no app
  }
}

export function loadNotifiedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY)) ?? [])
  } catch {
    return new Set()
  }
}

export function saveNotifiedIds(ids) {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids]))
}
