import { supabase } from './supabaseClient'

export function generateId() {
  return crypto.randomUUID()
}

// Tabelas "simples": chave é um uuid (id), e o resto do item vira a coluna
// `data` (jsonb) — assim nenhum campo do app se perde na troca de formato,
// mesmo os mais soltos (parcelas, dados de importação de fatura etc).
async function loadJsonTable(table) {
  const { data, error } = await supabase.from(table).select('id, data')
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, ...row.data }))
}

async function saveJsonTable(table, userId, items) {
  const { data: existing, error: selectError } = await supabase.from(table).select('id')
  if (selectError) throw selectError

  const existingIds = new Set((existing ?? []).map((row) => row.id))
  const currentIds = new Set(items.map((item) => item.id))
  const toDelete = [...existingIds].filter((id) => !currentIds.has(id))

  if (toDelete.length > 0) {
    const { error } = await supabase.from(table).delete().in('id', toDelete)
    if (error) throw error
  }

  if (items.length > 0) {
    const rows = items.map(({ id, ...rest }) => ({ id, user_id: userId, data: rest }))
    const { error } = await supabase.from(table).upsert(rows)
    if (error) throw error
  }
}

export const loadAccounts = () => loadJsonTable('accounts')
export const saveAccounts = (userId, items) => saveJsonTable('accounts', userId, items)

export const loadTransactions = () => loadJsonTable('transactions')
export const saveTransactions = (userId, items) => saveJsonTable('transactions', userId, items)

export const loadGoals = () => loadJsonTable('goals')
export const saveGoals = (userId, items) => saveJsonTable('goals', userId, items)

export const loadBills = () => loadJsonTable('bills')
export const saveBills = (userId, items) => saveJsonTable('bills', userId, items)

export const loadBillPayments = () => loadJsonTable('bill_payments')
export const saveBillPayments = (userId, items) => saveJsonTable('bill_payments', userId, items)

// Categorias: o "id" é o slug (ex: "alimentacao"), não um uuid — a chave no
// banco é o par (user_id, id), pra cada pessoa poder ter seus próprios slugs.
export async function loadCategories() {
  const { data, error } = await supabase.from('categories').select('id, data')
  if (error) throw error
  return (data ?? []).map((row) => ({ id: row.id, ...row.data }))
}

export async function saveCategories(userId, items) {
  const { data: existing, error: selectError } = await supabase.from('categories').select('id')
  if (selectError) throw selectError

  const existingIds = new Set((existing ?? []).map((row) => row.id))
  const currentIds = new Set(items.map((item) => item.id))
  const toDelete = [...existingIds].filter((id) => !currentIds.has(id))

  if (toDelete.length > 0) {
    const { error } = await supabase.from('categories').delete().in('id', toDelete)
    if (error) throw error
  }

  if (items.length > 0) {
    const rows = items.map(({ id, ...rest }) => ({ id, user_id: userId, data: rest }))
    const { error } = await supabase.from('categories').upsert(rows, { onConflict: 'user_id,id' })
    if (error) throw error
  }
}

// Notificações dispensadas: só um conjunto de ids (texto), sem outros dados.
export async function loadDismissedNotifications() {
  const { data, error } = await supabase.from('dismissed_notifications').select('id')
  if (error) throw error
  return (data ?? []).map((row) => row.id)
}

export async function loadProfile() {
  const { data, error } = await supabase.from('profiles').select('name, gender, avatar_url').maybeSingle()
  if (error) throw error
  return data ? { name: data.name ?? '', gender: data.gender ?? '', avatarUrl: data.avatar_url ?? '' } : null
}

export async function saveProfile(userId, { name, gender, avatarUrl }) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: userId, name, gender, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
  if (error) throw error
}

// Guarda a foto em avatars/{userId}/avatar.<ext> — sempre o mesmo caminho, pra
// cada troca de foto substituir a anterior em vez de acumular arquivos soltos.
export async function uploadAvatar(userId, file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}

export async function deleteAccountForever() {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  const { error } = await supabase.functions.invoke('delete-account', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (error) throw error
}

export async function saveDismissedNotifications(userId, ids) {
  const { data: existing, error: selectError } = await supabase
    .from('dismissed_notifications')
    .select('id')
  if (selectError) throw selectError

  const existingIds = new Set((existing ?? []).map((row) => row.id))
  const currentIds = new Set(ids)
  const toDelete = [...existingIds].filter((id) => !currentIds.has(id))
  const toAdd = ids.filter((id) => !existingIds.has(id))

  if (toDelete.length > 0) {
    const { error } = await supabase.from('dismissed_notifications').delete().in('id', toDelete)
    if (error) throw error
  }

  if (toAdd.length > 0) {
    const rows = toAdd.map((id) => ({ id, user_id: userId }))
    const { error } = await supabase
      .from('dismissed_notifications')
      .upsert(rows, { onConflict: 'user_id,id' })
    if (error) throw error
  }
}
