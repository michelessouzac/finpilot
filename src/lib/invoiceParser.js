// Fatura de cartão vem em formatos bem diferentes de banco pra banco, então
// esse parser é propositalmente heurístico: ele tenta alguns formatos de
// linha comuns e devolve candidatos — quem decide de verdade o que entra é
// a tela de revisão, não esse parser.

const NOISE_PREFIXES = [
  'SALDO ANTERIOR',
  'SALDO FATURA ANTERIOR',
  'PAGAMENTO EFETUADO',
  'PAGTO EFETUADO',
  'PAGAMENTO RECEBIDO',
  'LIMITE DISPONIVEL',
  'LIMITE TOTAL',
  'LIMITE DE CREDITO',
  'LIMITE CREDITO',
  'TOTAL DESTA FATURA',
  'TOTAL DA FATURA',
  'TOTAL FATURA',
  'TOTAL CARTAO',
  'SUBTOTAL',
  'VALOR MINIMO',
  'PROXIMA FATURA',
  'DATA MOVIMENTACAO',
]

const MONTH_ABBR_PT = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12,
}

function stripDiacritics(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Descrição "crua" -> forma padronizada usada pra comparar entre faturas de
// meses diferentes (ex: "Netflix.com   BR" e "NETFLIX.COM" viram a mesma
// coisa).
export function normalizeDescription(text) {
  return stripDiacritics(text.toUpperCase())
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Detecta o padrão de parcela em dois formatos comuns: sufixo "3/10" no fim
// da descrição, ou "(Parcela 3 de 10)" em qualquer parte dela.
export function extractInstallment(description) {
  const parenMatch = description.match(/\(\s*parcela\s+(\d{1,2})\s+de\s+(\d{1,2})\s*\)/i)
  if (parenMatch) {
    const index = Number(parenMatch[1])
    const total = Number(parenMatch[2])
    if (index >= 1 && total >= 2 && index <= total) {
      return {
        installment: { index, total },
        rest: description.slice(0, parenMatch.index).trim() + ' ' + description.slice(parenMatch.index + parenMatch[0].length).trim(),
      }
    }
  }

  const suffixMatch = description.match(/(?:^|\s)(\d{1,2})\s*\/\s*(\d{1,2})\s*$/)
  if (suffixMatch) {
    const index = Number(suffixMatch[1])
    const total = Number(suffixMatch[2])
    if (index >= 1 && total >= 2 && index <= total) {
      return {
        installment: { index, total },
        rest: description.slice(0, suffixMatch.index).trim(),
      }
    }
  }

  return { installment: null, rest: description }
}

// "Pagamento em 12 JUN" (Nubank e parecidos): é o pagamento que quita a
// fatura ANTERIOR, listado dentro da seção de transações do PDF. Não é um
// gasto do período dessa fatura — importar isso como "entrada" faria a
// soma da fatura parecer bem menor do que o total real de compras do mês.
const PAYMENT_LINE_RE = /^PAGAMENTO EM \d{1,2} [A-Z]{3,4}$/

function isNoiseLine(normalized) {
  return NOISE_PREFIXES.some((prefix) => normalized.startsWith(prefix)) || PAYMENT_LINE_RE.test(normalized)
}

// Uma linha de fatura só tem dia/mês (ex: "05/01"), sem ano — assume o ano
// de referência da fatura, corrigindo a virada de ano quando o mês da linha
// é bem diferente do mês de referência (fatura de janeiro com compra de
// dezembro, por exemplo).
function resolveYear(lineMonth, referenceYear, referenceMonth) {
  const diff = lineMonth - referenceMonth
  if (diff > 6) return referenceYear - 1
  if (diff < -6) return referenceYear + 1
  return referenceYear
}

function toIsoDate(day, month, year) {
  const y = String(year).padStart(4, '0')
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseAmountDigits(digits) {
  const numeric = Number(digits.replace(/\./g, '').replace(',', '.'))
  return Number.isNaN(numeric) ? null : numeric
}

// Formato "05/01  DESCRIÇÃO  39,90" (Nubank e a maioria dos bancos) — o
// valor pode vir negativo (estorno/pagamento), marcado de formas diferentes
// por banco: sinal antes do valor, hífen depois, valor entre parênteses
// (Itaú/Bradesco) ou sufixo de letra "D"/"C" (débito/crédito, comum em
// extratos de cartão). Dia/mês aceitam um ou dois dígitos.
const SHORT_DATE_RE =
  /^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?\s+(.+?)\s+(-?\s?R?\$?\s?-?\(?[\d.]*\d,\d{2}\)?)\s*([-DdCc])?$/

function parseShortDateLine(line, reference) {
  const match = line.match(SHORT_DATE_RE)
  if (!match) return null

  const [, day, month, description, rawAmount, trailingMark] = match
  const trimmedAmount = rawAmount.trim()
  const isParenNegative = /^\(.*\)$/.test(trimmedAmount)
  const isCreditMark = trailingMark === 'C' || trailingMark === 'c'
  const negative = /^-/.test(trimmedAmount) || trailingMark === '-' || isParenNegative || isCreditMark
  const digits = rawAmount.replace(/[^\d,]/g, '')
  const amount = parseAmountDigits(digits)
  if (amount === null) return null

  const monthNum = Number(month)
  return {
    day: Number(day),
    month: monthNum,
    year: resolveYear(monthNum, reference.year, reference.month),
    description: description.trim(),
    amount,
    type: negative ? 'entrada' : 'saida',
  }
}

// Formato "16 de jun. 2026  DESCRIÇÃO [Beneficiário]  R$ 42,59" (Banco
// Inter e outros que escrevem a data por extenso, abreviada ou por completo
// — "jun." ou "junho"). O valor só tem sinal explícito quando é um crédito
// ("+ R$ ..."); sem sinal é saída. O "R$" é opcional pois alguns bancos
// imprimem só o número.
const LONG_DATE_RE =
  /^(\d{1,2})\s+de\s+([a-zç]+)\.?\s+(?:de\s+)?(\d{4})\s+(.+?)\s*(?:-\s+)?([+-])?\s?(?:R\$\s?)?([\d.]*\d,\d{2})$/i

function parseLongDateLine(line, reference) {
  const match = line.match(LONG_DATE_RE)
  if (!match) return null

  const [, day, monthWord, year, description, sign, digits] = match
  const month = MONTH_ABBR_PT[monthWord.toLowerCase().slice(0, 3)]
  if (!month) return null

  const amount = parseAmountDigits(digits)
  if (amount === null) return null

  return {
    day: Number(day),
    month,
    year: Number(year),
    description: description.trim(),
    amount,
    type: sign === '+' ? 'entrada' : 'saida',
    reference,
  }
}

// Formato "05 JUN •••• 4495 Amazon - Parcela 11/12 R$ 21,58" (fatura mensal
// do Nubank e parecidos): dia + mês abreviado em maiúsculas, sem barra e
// sem ano, às vezes com os 4 últimos dígitos do cartão mascarados no meio
// da linha ("•••• 4495"). O sinal de negativo desses extratos costuma vir
// como um "menos" tipográfico (−, U+2212), não o hífen comum (-).
const DAY_MONTH_ABBR_RE =
  /^(\d{1,2})\s+([A-Za-zç]{3})\s+(?:•+\s*\d+\s+)?(.+?)\s+([-−]?\s?R\$\s?[\d.]*\d,\d{2})$/

function parseDayMonthAbbrLine(line, reference) {
  const match = line.match(DAY_MONTH_ABBR_RE)
  if (!match) return null

  const [, day, monthWord, description, rawAmount] = match
  const month = MONTH_ABBR_PT[monthWord.toLowerCase().slice(0, 3)]
  if (!month) return null

  const negative = /^[-−]/.test(rawAmount.trim())
  const digits = rawAmount.replace(/[^\d,]/g, '')
  const amount = parseAmountDigits(digits)
  if (amount === null) return null

  return {
    day: Number(day),
    month,
    year: resolveYear(month, reference.year, reference.month),
    description: description.trim(),
    amount,
    type: negative ? 'entrada' : 'saida',
  }
}

const LINE_PARSERS = [parseLongDateLine, parseDayMonthAbbrLine, parseShortDateLine]

const KNOWN_ISSUERS = [
  'NUBANK',
  'ITAU',
  'ITAUCARD',
  'BRADESCO',
  'SANTANDER',
  'BANCO INTER',
  'INTER',
  'CAIXA',
  'BANCO DO BRASIL',
  'C6 BANK',
  'C6',
  'XP',
  'WILL BANK',
  'PICPAY',
  'NEON',
  'NEXT',
  'BTG',
  'PAN',
  'PORTO',
  'ORIGINAL',
  'SICOOB',
  'SICREDI',
]

// Nome bonito pra exibir/cadastrar automaticamente quando `issuer` (chave
// crua de KNOWN_ISSUERS) é detectado na fatura — várias chaves apontam pro
// mesmo banco (ex: "ITAU"/"ITAUCARD", "C6"/"C6 BANK").
export const ISSUER_DISPLAY_NAMES = {
  NUBANK: 'Nubank',
  ITAU: 'Itaú',
  ITAUCARD: 'Itaú',
  BRADESCO: 'Bradesco',
  SANTANDER: 'Santander',
  'BANCO INTER': 'Banco Inter',
  INTER: 'Banco Inter',
  CAIXA: 'Caixa',
  'BANCO DO BRASIL': 'Banco do Brasil',
  'C6 BANK': 'C6 Bank',
  C6: 'C6 Bank',
  XP: 'XP',
  'WILL BANK': 'Will Bank',
  PICPAY: 'PicPay',
  NEON: 'Neon',
  NEXT: 'Next',
  BTG: 'BTG',
  PAN: 'Pan',
  PORTO: 'Porto',
  ORIGINAL: 'Original',
  SICOOB: 'Sicoob',
  SICREDI: 'Sicredi',
}

const MONEY_RE = /(-|−)?\s?R?\$?\s?([\d.]*\d,\d{2})/

// `normalized` só serve pra checar o prefixo (ignorando acento/maiúscula);
// o valor em si precisa vir do `rawLine` original, porque `normalizeDescription`
// remove vírgula e ponto — rodar o MONEY_RE em cima do texto normalizado
// nunca acha nada.
function findAmountNear(normalized, rawLine, keywords) {
  for (const keyword of keywords) {
    if (!normalized.startsWith(keyword)) continue
    const match = rawLine.match(MONEY_RE)
    if (!match) continue
    const amount = parseAmountDigits(match[2])
    if (amount === null) continue
    return match[1] ? -amount : amount
  }
  return null
}

// "10/07" ou "10/07/2026" -> { day, month, year? } — usado pra ler datas de
// vencimento/fechamento impressas no cabeçalho ou rodapé da fatura.
function findDateNear(line, keywords) {
  const normalized = normalizeDescription(line)
  if (!keywords.some((k) => normalized.includes(k))) return null
  const match = line.match(/(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  return { day, month, year: match[3] ? Number(match[3]) : null }
}

// Varre o texto extraído em busca de metadados do cartão em si (emissor,
// limite total, limite disponível informado na fatura, total da fatura,
// dia de fechamento/vencimento) — informações que `parseInvoiceLines`
// descarta como "ruído" por não serem lançamentos. A tela de importação usa
// isso só como sugestão pra preencher o cadastro do cartão; a pessoa sempre
// pode revisar antes de aplicar.
export function parseInvoiceMetadata(lines) {
  const info = {
    issuer: null,
    totalLimit: null,
    availableLimit: null,
    invoiceTotal: null,
    periodPurchasesTotal: null,
    closingDay: null,
    dueDay: null,
  }

  for (const rawLine of lines) {
    const normalized = normalizeDescription(rawLine)
    if (!normalized) continue

    if (!info.issuer) {
      const issuer = KNOWN_ISSUERS.find((name) => normalized.includes(name))
      if (issuer) info.issuer = issuer
    }

    if (info.totalLimit === null) {
      const amount = findAmountNear(normalized, rawLine, ['LIMITE TOTAL', 'LIMITE DE CREDITO', 'LIMITE CREDITO'])
      if (amount !== null) info.totalLimit = Math.abs(amount)
    }

    if (info.availableLimit === null) {
      const amount = findAmountNear(normalized, rawLine, ['LIMITE DISPONIVEL'])
      if (amount !== null) info.availableLimit = Math.abs(amount)
    }

    // "Total a pagar"/"total da fatura" costuma somar compras do período +
    // saldo residual da fatura anterior — não dá pra comparar 1 pra 1 com os
    // lançamentos desse período (pode ter saldo rotativo). Serve só como
    // sinal fraco na reconciliação.
    if (info.invoiceTotal === null) {
      const amount = findAmountNear(normalized, rawLine, [
        'TOTAL DESTA FATURA',
        'TOTAL DA FATURA',
        'TOTAL FATURA',
        'TOTAL CARTAO',
        'TOTAL A PAGAR',
        'VALOR TOTAL DA FATURA',
      ])
      if (amount !== null) info.invoiceTotal = Math.abs(amount)
    }

    // "Total de compras" (quando o banco imprime separado do total a pagar)
    // é o número mais confiável pra bater com a soma dos lançamentos dessa
    // fatura, já que exclui saldo residual de faturas anteriores.
    if (info.periodPurchasesTotal === null) {
      const amount = findAmountNear(normalized, rawLine, ['TOTAL DE COMPRAS'])
      if (amount !== null) info.periodPurchasesTotal = Math.abs(amount)
    }

    if (info.dueDay === null) {
      const date = findDateNear(rawLine, ['VENCIMENTO'])
      if (date) info.dueDay = date.day
    }

    if (info.closingDay === null) {
      const date = findDateNear(rawLine, ['FECHAMENTO', 'MELHOR DIA'])
      if (date) info.closingDay = date.day
    }
  }

  return info
}

// Monta um candidato de lançamento a partir de campos já resolvidos
// (descrição, valor, tipo, data ISO) — usado tanto pelo parser de regex
// quanto pelo fallback de IA, pra garantir que os dois produzam exatamente
// o mesmo formato de candidato pra tela de revisão.
function buildCandidate(rawDescription, isoDate, amount, type) {
  const normalizedFull = normalizeDescription(rawDescription)
  if (!normalizedFull) return null
  if (isNoiseLine(normalizedFull)) return null
  if (amount === 0) return null

  const { installment, rest } = extractInstallment(rawDescription)
  const description = rest.replace(/\s+/g, ' ').trim() || rawDescription

  return {
    rawDescription,
    description,
    normalizedDescription: normalizeDescription(description),
    date: isoDate,
    amount: Math.abs(amount),
    type,
    installment,
  }
}

// Transforma as linhas de texto extraídas do PDF em candidatos de
// lançamento. `reference` é { year, month } — o mês/ano da fatura, usado
// como base pra resolver datas que só têm dia/mês.
export function parseInvoiceLines(lines, reference) {
  const candidates = []

  for (const line of lines) {
    let parsedLine = null
    for (const parse of LINE_PARSERS) {
      parsedLine = parse(line, reference)
      if (parsedLine) break
    }
    if (!parsedLine) continue

    const isoDate = toIsoDate(parsedLine.day, parsedLine.month, parsedLine.year)
    const candidate = buildCandidate(parsedLine.description, isoDate, parsedLine.amount, parsedLine.type)
    if (candidate) candidates.push(candidate)
  }

  return candidates
}

// Mesma lógica de limpeza/normalização de `parseInvoiceLines`, mas a partir
// de lançamentos já estruturados (ex: retorno da extração por IA), que já
// vêm com data ISO, valor e tipo resolvidos — só falta filtrar ruído,
// separar parcelamento e normalizar a descrição.
export function buildCandidatesFromStructured(items) {
  const candidates = []

  for (const item of items) {
    if (!item || typeof item.description !== 'string') continue
    if (!/^\d{4}-\d{2}-\d{2}$/.test(item.date ?? '')) continue
    const amount = Number(item.amount)
    if (!Number.isFinite(amount)) continue
    const type = item.type === 'entrada' ? 'entrada' : 'saida'

    const candidate = buildCandidate(item.description, item.date, amount, type)
    if (candidate) candidates.push(candidate)
  }

  return candidates
}

export function candidatesNetTotal(candidates) {
  return candidates.reduce((sum, c) => sum + (c.type === 'saida' ? c.amount : -c.amount), 0)
}

// Rede de segurança contra o regex ter extraído algo plausível-mas-errado
// (ex: ter contado um pagamento de fatura anterior como se fosse lançamento
// dessa fatura — exatamente o tipo de erro silencioso que não dá zero
// candidatos, então não cairia no fallback de "não achei nada"). Compara a
// soma dos candidatos com o total já impresso na própria fatura: se a
// diferença for grande demais pra ser só arredondamento/saldo residual, o
// resultado do regex não é confiável e vale mandar pra IA em vez de importar
// silenciosamente um valor errado — sem depender de banco nenhum específico.
export function reconcilesWithInvoiceMetadata(candidates, metadata) {
  const sum = candidatesNetTotal(candidates)

  if (metadata?.periodPurchasesTotal != null) {
    // Tolerância apertada: "total de compras" deveria bater quase exatamente
    // com a soma dos lançamentos dessa fatura — uma diferença maior que isso
    // é sinal forte de linha(s) que o regex não reconheceu.
    const tolerance = Math.max(1, metadata.periodPurchasesTotal * 0.01)
    return Math.abs(sum - metadata.periodPurchasesTotal) <= tolerance
  }

  if (metadata?.invoiceTotal != null) {
    // Tolerância mais larga aqui: "total a pagar" pode legitimamente incluir
    // saldo rotativo de faturas anteriores, então diferença grande não é
    // necessariamente erro de leitura — mas ainda precisa ser apertada o
    // bastante pra pegar lançamentos perdidos silenciosamente.
    const tolerance = Math.max(5, metadata.invoiceTotal * 0.08)
    return Math.abs(sum - metadata.invoiceTotal) <= tolerance
  }

  return true
}
