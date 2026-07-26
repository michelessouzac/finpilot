import { useState } from 'react'
import { Field, TextInput, Select, PrimaryButton, GhostButton, Card, EmptyState } from './ui'
import { CloseIcon, UploadIcon, RepeatIcon, CardIcon } from './icons'
import { formatMoney, todayIso } from '../lib/constants'
import { extractPdfLines } from '../lib/pdfText'
import {
  parseInvoiceLines,
  parseInvoiceMetadata,
  reconcilesWithInvoiceMetadata,
  ISSUER_DISPLAY_NAMES,
} from '../lib/invoiceParser'
import { extractInvoiceWithAI } from '../lib/aiInvoiceParser'
import { matchAgainstExisting } from '../lib/importMatch'

// Campos do cadastro do cartão que a fatura consegue sugerir sozinha —
// a pessoa só confirma (ou ajusta) em vez de digitar tudo de novo.
function CardInfoBanner({ info, card, onApply, applied }) {
  const fields = [
    info.issuer && { label: 'Emissor identificado', value: info.issuer },
    info.totalLimit !== null && { label: 'Limite do cartão', value: formatMoney(info.totalLimit) },
    info.closingDay !== null && { label: 'Fechamento', value: `Dia ${info.closingDay}` },
    info.dueDay !== null && { label: 'Vencimento', value: `Dia ${info.dueDay}` },
  ].filter(Boolean)

  if (fields.length === 0) return null

  return (
    <Card className="flex flex-col gap-3 bg-coral/5">
      <div className="flex items-center gap-2">
        <CardIcon className="text-coral" width={18} height={18} />
        <h3 className="font-display text-sm font-semibold text-ink">
          Detectamos dados de {card?.name ?? 'cartão'} nessa fatura
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {fields.map((f) => (
          <div key={f.label} className="flex flex-col gap-0.5">
            <span className="text-xs text-gray">{f.label}</span>
            <span className="text-sm font-semibold text-ink">{f.value}</span>
          </div>
        ))}
      </div>
      {applied ? (
        <p className="text-xs font-medium text-mint">Cadastro do cartão atualizado com esses dados.</p>
      ) : (
        <GhostButton type="button" onClick={onApply} className="text-xs">
          Atualizar cadastro do cartão com esses dados
        </GhostButton>
      )}
    </Card>
  )
}

function defaultRefMonth() {
  return todayIso().slice(0, 7)
}

const AUTO_DETECT = '__auto__'

// Acha uma conta de cartão já cadastrada com esse nome (evita criar
// "Nubank" duplicado se a pessoa já tem um cartão com esse nome, mesmo que
// tenha cadastrado escrevendo diferente, ex: "nubank" ou "Nu Bank").
function findAccountByIssuerName(accounts, displayName) {
  const target = displayName.toLowerCase().replace(/\s+/g, '')
  return accounts.find(
    (a) => a.type === 'cartao' && a.name.toLowerCase().replace(/\s+/g, '') === target,
  )
}

function CandidateRow({ candidate, categories, onChange }) {
  const badge = candidate.isDuplicate
    ? { text: 'já lançado', className: 'bg-ink/10 text-gray' }
    : candidate.installment
      ? { text: `parcela ${candidate.installment.index}/${candidate.installment.total}`, className: 'bg-rose/15 text-rose' }
      : candidate.isContinuation
        ? { text: 'assinatura reconhecida', className: 'bg-coral/15 text-coral' }
        : null

  return (
    <Card className={`flex flex-col gap-3 ${candidate.isDuplicate ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <label className="flex flex-1 items-start gap-3">
          <input
            type="checkbox"
            checked={candidate.include}
            onChange={(e) => onChange({ ...candidate, include: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-ink/20 accent-coral"
          />
          <div className="flex flex-1 flex-col gap-2">
            <TextInput
              value={candidate.description}
              onChange={(e) => onChange({ ...candidate, description: e.target.value })}
              placeholder="Descrição"
            />
            <p className="text-xs text-gray">
              Original: {candidate.rawDescription}
            </p>
          </div>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 pl-7">
        <Field label="Valor">
          <TextInput
            type="number"
            step="0.01"
            inputMode="decimal"
            value={candidate.amount}
            onChange={(e) => onChange({ ...candidate, amount: Number(e.target.value) })}
          />
        </Field>
        <Field label="Data">
          <TextInput
            type="date"
            value={candidate.date}
            onChange={(e) => onChange({ ...candidate, date: e.target.value })}
          />
        </Field>
      </div>

      <div className="pl-7">
        <Field label="Categoria">
          <Select
            value={candidate.category ?? ''}
            onChange={(e) => onChange({ ...candidate, category: e.target.value })}
          >
            <option value="">Sem categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-7">
        {badge && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>
            {candidate.isContinuation && <RepeatIcon />} {badge.text}
          </span>
        )}
        <span
          className={`text-xs font-semibold ${candidate.type === 'entrada' ? 'text-coral' : 'text-ink'}`}
        >
          {candidate.type === 'entrada' ? '+ entrada' : '- saída'}
        </span>
        <label className="ml-auto flex items-center gap-1.5 text-xs font-medium text-gray">
          <input
            type="checkbox"
            checked={candidate.recurring}
            onChange={(e) => onChange({ ...candidate, recurring: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-ink/20 accent-coral"
          />
          recorrente
        </label>
      </div>
    </Card>
  )
}

function ImportInvoice({
  accounts,
  transactions,
  categories,
  onImport,
  onUpdateCardInfo,
  onCreateAccount,
  onCancel,
}) {
  const cardAccounts = accounts.filter((a) => a.type === 'cartao')
  const [step, setStep] = useState('setup')
  const [accountId, setAccountId] = useState(AUTO_DETECT)
  const [refMonth, setRefMonth] = useState(defaultRefMonth())
  const [loading, setLoading] = useState(false)
  const [loadingLabel, setLoadingLabel] = useState('Lendo o PDF...')
  const [error, setError] = useState('')
  const [candidates, setCandidates] = useState([])
  const [rawLines, setRawLines] = useState(null)
  const [cardInfo, setCardInfo] = useState(null)
  const [cardInfoApplied, setCardInfoApplied] = useState(false)
  const [autoDetectNote, setAutoDetectNote] = useState('')
  const [pendingBankPrompt, setPendingBankPrompt] = useState(null)
  const [manualBankName, setManualBankName] = useState('')
  const [reconcileWarning, setReconcileWarning] = useState(false)

  // Quando a pessoa deixa em "detectar automaticamente", acha o emissor pelo
  // texto da fatura e resolve pra uma conta já cadastrada com esse nome ou,
  // se não existir nenhuma, cria uma nova sozinho — assim ninguém precisa
  // passar pela aba Contas antes de importar a primeira fatura de um banco.
  // Algumas faturas (o Nubank é um caso real) nunca imprimem o nome do banco
  // no texto — nesse caso devolve `needsPrompt` e quem chamou pergunta pra
  // pessoa ali mesmo, em vez de travar pedindo pra voltar e escolher.
  function resolveAccount(metadata) {
    if (accountId !== AUTO_DETECT) return { id: accountId }

    const displayName = metadata.issuer ? ISSUER_DISPLAY_NAMES[metadata.issuer] ?? metadata.issuer : null
    if (!displayName) return { needsPrompt: true }

    const existing = findAccountByIssuerName(accounts, displayName)
    if (existing) {
      setAutoDetectNote(`Identificamos ${displayName} e usamos o cartão que já estava cadastrado com esse nome.`)
      return { id: existing.id }
    }

    const newId = onCreateAccount?.({
      name: displayName,
      type: 'cartao',
      amount: metadata.totalLimit ?? 0,
      closingDay: metadata.closingDay ?? 25,
      dueDay: metadata.dueDay ?? 10,
      paymentAccountId: null,
    })
    setAutoDetectNote(`Identificamos ${displayName} e cadastramos o cartão automaticamente.`)
    return { id: newId }
  }

  // Tenta primeiro o reconhecimento rápido (regex); se ele não achar nenhum
  // lançamento, cai automaticamente pra leitura via IA, sem a pessoa precisar
  // clicar em nada nem saber que existem dois modos por trás — só o rótulo
  // do carregamento muda, pra sinalizar que está demorando um pouco mais.
  async function processLines(lines, metadata, resolvedAccountId) {
    setAccountId(resolvedAccountId)
    const [year, month] = refMonth.split('-').map(Number)
    const reference = { year, month }

    let parsed = parseInvoiceLines(lines, reference)

    // Se o regex não achou nada, ou achou algo que não bate com o total já
    // impresso na fatura (sinal de que leu errado, mesmo que "plausível"),
    // cai pra IA automaticamente — sem exigir que a pessoa perceba o erro.
    if (parsed.length === 0 || !reconcilesWithInvoiceMetadata(parsed, metadata)) {
      setLoadingLabel('Quase lá, analisando com mais detalhe...')
      try {
        const aiParsed = await extractInvoiceWithAI(lines, reference)
        if (aiParsed.length > 0) parsed = aiParsed
      } catch {
        // mantém o resultado do regex como último recurso — a tela de
        // revisão ainda deixa a pessoa conferir/ajustar cada lançamento.
      }
    }

    if (parsed.length === 0) {
      setError('Não consegui reconhecer lançamentos nesse PDF. Você pode lançar manualmente na aba Lançamentos.')
      setRawLines(lines)
      return
    }

    // Mesmo depois da IA, o total pode continuar sem bater com o que a
    // própria fatura imprime — nesse caso a pessoa precisa saber antes de
    // importar, em vez de confiar cegamente na lista.
    setReconcileWarning(!reconcilesWithInvoiceMetadata(parsed, metadata))

    const matched = matchAgainstExisting(parsed, transactions, resolvedAccountId, categories)
    setCandidates(matched)
    setStep('review')
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setLoadingLabel('Lendo o PDF...')
    setError('')
    setRawLines(null)
    setCardInfo(null)
    setCardInfoApplied(false)
    setAutoDetectNote('')
    setPendingBankPrompt(null)
    setReconcileWarning(false)
    try {
      const lines = await extractPdfLines(file)
      const metadata = parseInvoiceMetadata(lines)
      setCardInfo(metadata)

      const resolved = resolveAccount(metadata)
      if (resolved.needsPrompt) {
        setPendingBankPrompt({ lines, metadata })
        return
      }

      await processLines(lines, metadata, resolved.id)
    } catch {
      setError('Não consegui ler esse PDF. Confira se o arquivo não está protegido por senha.')
    } finally {
      setLoading(false)
    }
  }

  // A pessoa digitou o nome do banco porque não deu pra detectar sozinho —
  // cadastra o cartão com esse nome e retoma o processamento de onde parou,
  // sem precisar escolher o PDF de novo.
  async function handleConfirmManualBank() {
    if (!pendingBankPrompt || !manualBankName.trim()) return
    const { lines, metadata } = pendingBankPrompt
    const name = manualBankName.trim()

    const newId = onCreateAccount?.({
      name,
      type: 'cartao',
      amount: metadata.totalLimit ?? 0,
      closingDay: metadata.closingDay ?? 25,
      dueDay: metadata.dueDay ?? 10,
      paymentAccountId: null,
    })
    setAutoDetectNote(`Cadastramos o cartão "${name}" automaticamente.`)
    setPendingBankPrompt(null)

    setLoading(true)
    setLoadingLabel('Analisando a fatura...')
    try {
      await processLines(lines, metadata, newId)
    } finally {
      setLoading(false)
    }
  }

  function handleApplyCardInfo() {
    if (!cardInfo) return
    onUpdateCardInfo?.(accountId, cardInfo)
    setCardInfoApplied(true)
  }

  function updateCandidate(index, next) {
    setCandidates(candidates.map((c, i) => (i === index ? next : c)))
  }

  function handleConfirmImport() {
    const toImport = candidates.filter((c) => c.include)
    onImport(accountId, toImport)
  }

  const includedCount = candidates.filter((c) => c.include).length

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">Importar fatura (PDF)</h2>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-1.5 text-gray hover:bg-ink/5"
          aria-label="Fechar"
        >
          <CloseIcon />
        </button>
      </div>

      {step === 'setup' && (
        <div className="flex flex-col gap-4">
          <Field label="Cartão">
            <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value={AUTO_DETECT}>Detectar automaticamente pelo banco da fatura</option>
              {cardAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Mês de referência da fatura">
            <TextInput type="month" value={refMonth} onChange={(e) => setRefMonth(e.target.value)} />
          </Field>

          <PrimaryButton type="button" onClick={() => setStep('upload')}>
            Continuar
          </PrimaryButton>
        </div>
      )}

      {step === 'upload' && pendingBankPrompt && (
        <div className="flex flex-col gap-4">
          <p className="rounded-2xl bg-ink/5 px-4 py-3 text-sm text-ink">
            Não conseguimos identificar o banco emissor automaticamente nesse PDF. Qual o nome desse cartão? Vamos
            cadastrar ele pra você.
          </p>
          <Field label="Nome do cartão/banco">
            <TextInput
              value={manualBankName}
              onChange={(e) => setManualBankName(e.target.value)}
              placeholder="Ex: Nubank, Itaú, Bradesco"
              autoFocus
            />
          </Field>
          <PrimaryButton
            type="button"
            onClick={handleConfirmManualBank}
            disabled={!manualBankName.trim() || loading}
          >
            {loading ? loadingLabel : 'Continuar'}
          </PrimaryButton>
          <GhostButton type="button" onClick={() => setPendingBankPrompt(null)}>
            Voltar
          </GhostButton>
        </div>
      )}

      {step === 'upload' && !pendingBankPrompt && (
        <div className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-ink/15 px-6 py-10 text-center hover:border-coral/50">
            <UploadIcon className="text-coral" width={28} height={28} />
            <span className="font-display font-semibold text-ink">
              {loading ? loadingLabel : 'Toque para escolher o PDF da fatura'}
            </span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={loading}
              onChange={handleFile}
            />
          </label>

          {error && <p className="rounded-2xl bg-rose/10 px-4 py-3 text-sm text-ink">{error}</p>}

          {rawLines && rawLines.length > 0 && (
            <details className="rounded-2xl bg-ink/5 px-4 py-3 text-xs text-gray">
              <summary className="cursor-pointer font-medium text-ink">
                Ver texto extraído do PDF (pra ajudar a ajustar o reconhecimento)
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words">
                {rawLines.join('\n')}
              </pre>
            </details>
          )}

          <GhostButton type="button" onClick={() => setStep('setup')}>
            Voltar
          </GhostButton>
        </div>
      )}

      {step === 'review' && (
        <div className="flex flex-col gap-4">
          {autoDetectNote && (
            <p className="rounded-2xl bg-mint/10 px-4 py-3 text-sm text-ink">{autoDetectNote}</p>
          )}

          {reconcileWarning && (
            <p className="rounded-2xl bg-rose/10 px-4 py-3 text-sm text-ink">
              O total dos lançamentos que reconhecemos não bate com o total impresso nessa fatura — pode ter
              algum lançamento que não conseguimos ler do PDF. Confira com atenção antes de importar, e
              compare com o total da fatura de verdade.
            </p>
          )}

          {cardInfo && (
            <CardInfoBanner
              info={cardInfo}
              card={cardAccounts.find((a) => a.id === accountId)}
              onApply={handleApplyCardInfo}
              applied={cardInfoApplied}
            />
          )}

          {candidates.length === 0 ? (
            <EmptyState
              icon={<UploadIcon className="text-coral" width={28} height={28} />}
              title="Nada pra importar"
              description="Não encontramos lançamentos nesse PDF."
            />
          ) : (
            <>
              <p className="text-sm text-gray">
                Confira os lançamentos antes de importar. Itens marcados como "já lançado" não serão
                importados de novo — desmarque a caixinha se quiser forçar.
              </p>
              <div className="flex flex-col gap-3">
                {candidates.map((candidate, index) => (
                  <CandidateRow
                    key={`${candidate.date}-${candidate.rawDescription}-${index}`}
                    candidate={candidate}
                    categories={categories}
                    onChange={(next) => updateCandidate(index, next)}
                  />
                ))}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-1">
            <PrimaryButton type="button" className="flex-1" disabled={includedCount === 0} onClick={handleConfirmImport}>
              Importar {includedCount > 0 ? `${includedCount} lançamento${includedCount > 1 ? 's' : ''}` : ''}
            </PrimaryButton>
            <GhostButton type="button" onClick={onCancel}>
              Cancelar
            </GhostButton>
          </div>
        </div>
      )}
    </Card>
  )
}

export default ImportInvoice
