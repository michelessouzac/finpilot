import { useState } from 'react'
import { PluggyConnect } from 'react-pluggy-connect'
import { PrimaryButton, GhostButton, Card, EmptyState } from './ui'
import { BankIcon, CloseIcon } from './icons'
import { requestConnectToken, syncOpenFinanceItem } from '../lib/openFinance'

const STATUS_LABEL = {
  UPDATED: { text: 'Conectado', className: 'bg-mint/15 text-mint' },
  UPDATING: { text: 'Sincronizando...', className: 'bg-coral/15 text-coral' },
  LOGIN_ERROR: { text: 'Login expirado — reconecte', className: 'bg-rose/15 text-rose' },
  OUTDATED: { text: 'Desatualizado — reconecte', className: 'bg-rose/15 text-rose' },
  WAITING_USER_ACTION: { text: 'Precisa de ação no banco', className: 'bg-rose/15 text-rose' },
}

function statusMeta(status) {
  return STATUS_LABEL[status] ?? { text: status ?? 'Conectado', className: 'bg-ink/10 text-gray' }
}

function ConnectedItemRow({ item, onSync, onReconnect, syncing }) {
  const meta = statusMeta(item.status)
  const needsReconnect = item.status === 'LOGIN_ERROR' || item.status === 'OUTDATED'

  return (
    <Card className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-coral/15 text-coral">
          {item.connector_image_url ? (
            <img src={item.connector_image_url} alt="" className="h-7 w-7 rounded-md object-contain" />
          ) : (
            <BankIcon width={20} height={20} />
          )}
        </div>
        <div>
          <p className="font-display font-semibold text-ink">{item.connector_name ?? 'Banco conectado'}</p>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}>
            {meta.text}
          </span>
        </div>
      </div>
      <GhostButton
        type="button"
        disabled={syncing}
        onClick={() => (needsReconnect ? onReconnect(item) : onSync(item))}
      >
        {syncing ? 'Sincronizando...' : needsReconnect ? 'Reconectar' : 'Sincronizar'}
      </GhostButton>
    </Card>
  )
}

function ConnectBankScreen({ items, onClose, onConnected }) {
  const [connectToken, setConnectToken] = useState(null)
  const [loadingToken, setLoadingToken] = useState(false)
  const [syncingItemId, setSyncingItemId] = useState(null)
  const [error, setError] = useState('')
  const [lastSyncMessage, setLastSyncMessage] = useState('')

  async function openWidget(itemId) {
    setError('')
    setLoadingToken(true)
    try {
      const token = await requestConnectToken(itemId)
      setConnectToken(token)
    } catch (err) {
      setError(`Não conseguimos abrir a conexão com o banco (${err.message}).`)
    } finally {
      setLoadingToken(false)
    }
  }

  async function runSync(itemId) {
    setError('')
    setSyncingItemId(itemId)
    try {
      const result = await syncOpenFinanceItem(itemId)
      setLastSyncMessage(
        `${result.transactionsInserted} lançamento(s) novo(s) · ${result.accountsSynced} conta(s) do tipo banco encontrada(s) (${result.accountsCreated} criada(s) agora) · ${result.skippedNonBankAccounts} conta(s) ignorada(s) por não ser tipo banco.`,
      )
      onConnected?.()
    } catch (err) {
      setError(`Não conseguimos sincronizar esse banco (${err.message}).`)
    } finally {
      setSyncingItemId(null)
    }
  }

  function handleSuccess(itemData) {
    setConnectToken(null)
    const itemId = itemData?.item?.id
    if (itemId) runSync(itemId)
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold text-ink">Conectar banco</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-1.5 text-gray hover:bg-ink/5"
          aria-label="Fechar"
        >
          <CloseIcon />
        </button>
      </div>

      <p className="text-sm text-gray">
        Conecte sua conta bancária via Open Finance pra suas contas e lançamentos entrarem sozinhos, sem
        precisar digitar nada. Por enquanto sincronizamos contas correntes e poupança — cartão de crédito
        continua pela importação de fatura em PDF.
      </p>

      {error && <p className="rounded-2xl bg-rose/10 px-4 py-3 text-sm text-ink">{error}</p>}
      {lastSyncMessage && (
        <p className="rounded-2xl bg-mint/10 px-4 py-3 text-sm text-ink">{lastSyncMessage}</p>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon={<BankIcon className="text-coral" width={28} height={28} />}
          title="Nenhum banco conectado"
          description="Toque abaixo pra conectar sua primeira conta."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <ConnectedItemRow
              key={item.item_id}
              item={item}
              onSync={(i) => runSync(i.item_id)}
              onReconnect={(i) => openWidget(i.item_id)}
              syncing={syncingItemId === item.item_id}
            />
          ))}
        </div>
      )}

      <PrimaryButton type="button" disabled={loadingToken} onClick={() => openWidget()}>
        {loadingToken ? 'Abrindo...' : 'Conectar novo banco'}
      </PrimaryButton>

      {connectToken && (
        <PluggyConnect
          connectToken={connectToken}
          includeSandbox
          onSuccess={handleSuccess}
          onError={() => setError('A conexão com o banco não foi concluída.')}
          onClose={() => setConnectToken(null)}
        />
      )}
    </Card>
  )
}

export default ConnectBankScreen
