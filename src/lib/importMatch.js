import { generateId } from './storage'
import { guessCategory } from './categorize'

function buildMatchKey(accountId, normalizedDescription, installment) {
  return installment
    ? `${accountId}::${normalizedDescription}::${installment.total}`
    : `${accountId}::${normalizedDescription}`
}

function withinTolerance(a, b, tolerance = 0.15) {
  if (a === 0 || b === 0) return a === b
  return Math.abs(a - b) / Math.max(a, b) <= tolerance
}

// Compara os candidatos extraídos do PDF com as transações já lançadas
// (dessa mesma conta) pra decidir, pra cada um: se já foi importado antes
// (duplicata exata), se é a continuação de uma assinatura/parcela já
// reconhecida (herda nome, grupo e categoria já corrigida), ou se é algo
// novo (aí a categoria é só um palpite, pra pessoa corrigir depois).
export function matchAgainstExisting(candidates, existingTransactions, accountId, categories = []) {
  const sameAccount = existingTransactions.filter((t) => t.accountId === accountId)

  return candidates.map((candidate) => {
    const matchKey = buildMatchKey(accountId, candidate.normalizedDescription, candidate.installment)

    const exactDuplicate = sameAccount.find(
      (t) => t.matchKey === matchKey && t.date === candidate.date && Number(t.amount) === candidate.amount,
    )

    if (exactDuplicate) {
      return {
        ...candidate,
        matchKey,
        groupId: exactDuplicate.groupId ?? exactDuplicate.id,
        isDuplicate: true,
        include: false,
        category: exactDuplicate.category,
        recurring: Boolean(exactDuplicate.recurring),
      }
    }

    const previousOccurrences = sameAccount
      .filter((t) => t.matchKey === matchKey && t.date !== candidate.date)
      .sort((a, b) => (a.date < b.date ? 1 : -1))

    const previous = previousOccurrences.find((t) => withinTolerance(Number(t.amount), candidate.amount))

    if (previous) {
      return {
        ...candidate,
        matchKey,
        groupId: previous.groupId ?? previous.id,
        isDuplicate: false,
        include: true,
        isContinuation: true,
        description: previous.description || candidate.description,
        category: previous.category ?? guessCategory(candidate.normalizedDescription, categories),
        recurring: true,
      }
    }

    return {
      ...candidate,
      matchKey,
      groupId: generateId(),
      isDuplicate: false,
      include: true,
      isContinuation: false,
      category: guessCategory(candidate.normalizedDescription, categories),
      recurring: Boolean(candidate.installment),
    }
  })
}
