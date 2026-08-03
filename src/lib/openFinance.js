import { supabase } from './supabaseClient'

// supabase-js só devolve um erro genérico ("Edge Function returned a
// non-2xx status code") quando a função responde com erro — o corpo JSON de
// verdade (com o motivo específico) vem em error.context, e precisa ser lido
// à parte.
async function describeFunctionError(error) {
  try {
    const body = await error?.context?.json?.()
    if (body?.error) return body.error
  } catch {
    // corpo não era JSON — cai no fallback abaixo
  }
  return error?.message ?? 'erro_desconhecido'
}

// open_finance_items tem colunas de verdade (não o padrão {id, data jsonb}
// das outras tabelas) porque é escrita principalmente pela Edge Function,
// não por formulário — aqui é só leitura pra listar na tela.
export async function loadOpenFinanceItems() {
  const { data, error } = await supabase
    .from('open_finance_items')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

// itemId só é passado ao reconectar uma conexão existente que expirou/deu erro.
export async function requestConnectToken(itemId) {
  const { data, error } = await supabase.functions.invoke('open-finance-connect', {
    body: itemId ? { itemId } : {},
  })
  if (error) throw new Error(await describeFunctionError(error))
  return data.connectToken
}

// Busca contas e transações na Pluggy e grava no Supabase. Chamada logo após
// conectar (onSuccess do widget) e de novo sempre que a pessoa tocar em
// "Sincronizar".
export async function syncOpenFinanceItem(itemId) {
  const { data, error } = await supabase.functions.invoke('open-finance-sync', {
    body: { itemId },
  })
  if (error) throw new Error(await describeFunctionError(error))
  return data
}
