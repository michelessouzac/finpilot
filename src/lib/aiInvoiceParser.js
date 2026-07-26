import { supabase } from './supabaseClient'
import { buildCandidatesFromStructured } from './invoiceParser'

// Fallback pra quando o parser de regex não reconhece nenhum lançamento:
// manda o texto já extraído do PDF (não o arquivo) pra Edge Function, que
// pede pra Claude extrair os lançamentos em formato estruturado. Devolve
// candidatos no mesmo formato de `parseInvoiceLines`, prontos pra passar
// por `matchAgainstExisting` e pela tela de revisão de sempre.
export async function extractInvoiceWithAI(lines, reference) {
  const { data, error } = await supabase.functions.invoke('parse-invoice', {
    body: { lines, referenceYear: reference.year, referenceMonth: reference.month },
  })

  if (error) throw error
  return buildCandidatesFromStructured(data?.transactions ?? [])
}
