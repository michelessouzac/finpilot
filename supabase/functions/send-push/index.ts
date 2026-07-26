// Dispara push de verdade quando um novo lançamento (transação) é criado.
// Chamada por um Database Webhook do Supabase (INSERT em public.transactions),
// não por um usuário logado — por isso a autenticação é por segredo
// compartilhado (WEBHOOK_SECRET), não por JWT de sessão.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

function buildMessage(record) {
  const data = record.data ?? {}
  const isEntrada = data.type === 'entrada'
  const amount = Number(data.amount ?? 0).toFixed(2)
  return {
    title: isEntrada ? 'Nova entrada registrada' : 'Novo lançamento registrado',
    body: `${data.description ?? (isEntrada ? 'Entrada' : 'Saída')} — R$ ${amount}`,
    tag: record.id,
  }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('unauthorized', { status: 401 })
  }

  const payload = await req.json()
  const record = payload.record
  const userId = record?.user_id
  if (!userId) return new Response('ok', { status: 200 })

  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    console.error(error)
    return new Response('error', { status: 500 })
  }

  const message = JSON.stringify(buildMessage(record))

  await Promise.all(
    (subscriptions ?? []).map(async (sub) => {
      const subscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } }
      try {
        await webpush.sendNotification(subscription, message)
      } catch (err) {
        // 404/410 = inscrição expirada (usuário desinstalou, trocou de navegador etc.) — limpa do banco.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        } else {
          console.error('push falhou', err)
        }
      }
    }),
  )

  return new Response('ok', { status: 200 })
})
