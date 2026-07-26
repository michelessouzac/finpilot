// Service worker mínimo: só existe pra permitir showNotification() (mais
// confiável em Android/PWA instalado que new Notification() direto na página)
// e pra levar o usuário de volta ao app quando ele toca na notificação.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Chega aqui quando a Edge Function manda um push de verdade (mesmo com o
// app fechado). O payload é o JSON que a função montou com { title, body }.
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'FinPilot', {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/')
    }),
  )
})
