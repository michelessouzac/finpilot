// Push notifications "de verdade" (chegam mesmo com o app fechado).
// Passo 1: permissão do navegador. Passo 2: inscrição salva no Supabase.
// Passo 3 preenche VITE_VAPID_PUBLIC_KEY — até lá, subscribeToPush() não
// faz nada (fica pronta pra ligar assim que a chave existir).

import { supabase } from './supabaseClient.js'

export function pushSupported() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

// Só chama o prompt nativo do navegador se o usuário ainda não decidiu
// (`default`). Se já disse "sim" ou "não" antes, o navegador nem mostraria
// de novo — mas deixamos explícito aqui pra não depender disso.
export async function requestPushPermission() {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

// A chave pública VAPID identifica ESTE app pros servidores de push do
// navegador (Google/Mozilla/Apple) — sem ela o navegador recusa a
// inscrição. urlBase64ToUint8Array converte o formato texto (que copiamos
// do terminal no Passo 3) pro formato binário que a API pede.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

// Inscreve este navegador/dispositivo pra receber push e salva a
// inscrição no Supabase, associada ao usuário logado. Chamar de novo é
// seguro: `getSubscription()` reaproveita a inscrição existente e o
// upsert (por `endpoint`) evita duplicar linha no banco.
export async function subscribeToPush(userId) {
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!pushSupported() || Notification.permission !== 'granted' || !vapidPublicKey) return null

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })
  }

  const { endpoint, keys } = subscription.toJSON()
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, endpoint, p256dh: keys.p256dh, auth_key: keys.auth }, { onConflict: 'endpoint' })
  if (error) console.error('Falha ao salvar inscrição de push:', error)

  return subscription
}
