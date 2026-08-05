import { useEffect, useMemo, useRef, useState } from 'react'
import { CatMascotPeek, CatMascotGlasses, CatMascotSpending, CatMascotSparkle } from './CatMascot.jsx'
import AccountForm from './components/AccountForm.jsx'
import AccountList from './components/AccountList.jsx'
import TransactionForm from './components/TransactionForm.jsx'
import CardsScreen from './components/CardsScreen.jsx'
import Dashboard from './components/Dashboard.jsx'
import Inbox from './components/Inbox.jsx'
import GoalForm from './components/GoalForm.jsx'
import GoalList from './components/GoalList.jsx'
import PocketForm from './components/PocketForm.jsx'
import PocketList from './components/PocketList.jsx'
import SimuladorScreen from './components/SimuladorScreen.jsx'
import Insights from './components/Insights.jsx'
import BillForm from './components/BillForm.jsx'
import BillList from './components/BillList.jsx'
import OpenInvoicesSummary from './components/OpenInvoicesSummary.jsx'
import NotificationsPanel from './components/NotificationsPanel.jsx'
import MoreMenu from './components/MoreMenu.jsx'
import ProfileScreen from './components/ProfileScreen.jsx'
import AuthScreen from './components/AuthScreen.jsx'
import { supabase } from './lib/supabaseClient.js'
import { PrimaryButton, GhostButton, Card } from './components/ui.jsx'
import {
  PlusIcon,
  BankIcon,
  DollarIcon,
  ChartIcon,
  InboxIcon,
  CatIcon,
  QuestionIcon,
  SparkleIcon,
  CardIcon,
  BellIcon,
  MenuIcon,
  UserIcon,
} from './components/icons.jsx'
import { DEFAULT_CATEGORIES, todayIso } from './lib/constants.js'
import { monthKeyOffset, currentMonthKey } from './lib/bills.js'
import { buildNotifications } from './lib/notifications.js'
import {
  registerServiceWorker,
  requestNotificationPermission,
  showDeviceNotification,
  loadNotifiedIds,
  saveNotifiedIds,
} from './lib/deviceNotifications.js'
import { requestPushPermission, subscribeToPush } from './lib/pushNotifications.js'
import {
  periodKeyForDate,
  invoicePeriod,
  invoiceTotal,
  invoiceDueDate,
  projectFutureInstallments,
} from './lib/invoices.js'
import {
  loadAccounts,
  saveAccounts,
  loadTransactions,
  saveTransactions,
  loadCategories,
  saveCategories,
  loadGoals,
  saveGoals,
  loadPockets,
  savePockets,
  loadBills,
  saveBills,
  loadBillPayments,
  saveBillPayments,
  loadDismissedNotifications,
  saveDismissedNotifications,
  generateId,
} from './lib/storage.js'
import { hasLocalBackupData, readLocalBackup, clearLocalBackup } from './lib/localBackup.js'

const TABS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: ChartIcon,
    mascot: CatMascotGlasses,
    subtitle: 'Seu panorama financeiro',
  },
  {
    id: 'contas',
    label: 'Contas',
    icon: BankIcon,
    mascot: CatMascotPeek,
    subtitle: 'Suas contas e cartões, sempre à mão',
  },
  {
    id: 'cartoes',
    label: 'Cartões',
    icon: CardIcon,
    mascot: CatMascotPeek,
    subtitle: 'Faturas, fechamento e gastos no crédito',
  },
  {
    id: 'lancamentos',
    label: 'Lançamentos',
    icon: DollarIcon,
    mascot: CatMascotSpending,
    subtitle: 'Entradas, saídas e contas a pagar/receber',
  },
  {
    id: 'caixa',
    label: 'Caixa de entrada',
    icon: InboxIcon,
    mascot: CatMascotPeek,
    subtitle: 'Revise e categorize seus lançamentos',
  },
  {
    id: 'porquinhos',
    label: 'Gatinhos',
    icon: CatIcon,
    mascot: CatMascotPeek,
    subtitle: 'Metas de economia e saldo separado',
  },
  {
    id: 'simulador',
    label: 'E se?',
    icon: QuestionIcon,
    mascot: CatMascotGlasses,
    subtitle: 'Simule o impacto de uma compra antes de decidir',
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: SparkleIcon,
    mascot: CatMascotSparkle,
    subtitle: 'O que Finny percebeu nos seus dados',
  },
  {
    id: 'perfil',
    label: 'Perfil',
    icon: UserIcon,
    mascot: CatMascotPeek,
    subtitle: 'Seus dados no FinPilot',
  },
]

// Só essas 4 aparecem fixas na barra inferior — o resto (+ Perfil) mora no
// menu de "mais funcionalidades", aberto pelas três barrinhas à direita.
const MAIN_TAB_IDS = ['contas', 'lancamentos', 'dashboard', 'cartoes']
const MORE_TAB_IDS = ['caixa', 'porquinhos', 'simulador', 'insights', 'perfil']

function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (session === null) return <AuthScreen />

  return <AppContent session={session} />
}

function withDefaultCategories(stored) {
  const base = stored.length ? stored : DEFAULT_CATEGORIES
  const diversos = DEFAULT_CATEGORIES.find((c) => c.id === 'diversos')
  return base.some((c) => c.id === 'diversos') ? base : [...base, diversos]
}

function AppContent({ session }) {
  const userId = session.user.id
  const [tab, setTab] = useState('dashboard')
  const [dataLoaded, setDataLoaded] = useState(false)
  const [migration, setMigration] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [goals, setGoals] = useState([])
  const [pockets, setPockets] = useState([])
  const [bills, setBills] = useState([])
  const [billPayments, setBillPayments] = useState([])
  const [dismissedNotifications, setDismissedNotifications] = useState(new Set())

  // Busca os dados do Supabase assim que a pessoa loga. Se o banco ainda
  // estiver vazio e houver dados de teste salvos no navegador (de antes da
  // conexão com o Supabase), oferece migrar esse conteúdo pro banco de
  // verdade em vez de sobrescrever/ignorar silenciosamente.
  useEffect(() => {
    let cancelled = false

    async function load() {
      const [
        accountsData,
        transactionsData,
        categoriesData,
        goalsData,
        pocketsData,
        billsData,
        billPaymentsData,
        dismissedData,
      ] = await Promise.all([
        loadAccounts(),
        loadTransactions(),
        loadCategories(),
        loadGoals(),
        loadPockets(),
        loadBills(),
        loadBillPayments(),
        loadDismissedNotifications(),
      ])

      if (cancelled) return

      const isRemoteEmpty =
        accountsData.length === 0 &&
        transactionsData.length === 0 &&
        categoriesData.length === 0 &&
        goalsData.length === 0 &&
        billsData.length === 0 &&
        billPaymentsData.length === 0

      if (isRemoteEmpty && hasLocalBackupData()) {
        setMigration(readLocalBackup())
      } else {
        setCategories(withDefaultCategories(categoriesData))
      }

      setAccounts(accountsData)
      setTransactions(transactionsData)
      setGoals(goalsData)
      setPockets(pocketsData)
      setBills(billsData)
      setBillPayments(billPaymentsData)
      setDismissedNotifications(new Set(dismissedData))
      setDataLoaded(true)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  function handleMigrate() {
    setAccounts(migration.accounts)
    setTransactions(migration.transactions)
    setCategories(withDefaultCategories(migration.categories))
    setGoals(migration.goals)
    setPockets([])
    setBills(migration.bills)
    setBillPayments(migration.billPayments)
    setDismissedNotifications(new Set(migration.dismissedNotifications))
    clearLocalBackup()
    setMigration(null)
  }

  function handleSkipMigration() {
    setCategories(withDefaultCategories([]))
    clearLocalBackup()
    setMigration(null)
  }

  const [editingAccount, setEditingAccount] = useState(null)
  const [editingTx, setEditingTx] = useState(null)
  const [editingGoal, setEditingGoal] = useState(null)
  const [editingPocket, setEditingPocket] = useState(null)
  const [editingBill, setEditingBill] = useState(null)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [showTxForm, setShowTxForm] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [showPocketForm, setShowPocketForm] = useState(false)
  const [showBillForm, setShowBillForm] = useState(false)
  const [goalsView, setGoalsView] = useState('metas') // 'metas' | 'separado'
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [highlightBillKey, setHighlightBillKey] = useState(null)
  const [selectedCardId, setSelectedCardId] = useState(null)
  const mainRef = useRef(null)

  // "Limpar" no sininho só esconde o item do próprio sininho — a pendência
  // continua valendo (e aparecendo) no Dashboard até ser de fato resolvida.
  const notifications = useMemo(
    () => buildNotifications(bills, billPayments),
    [bills, billPayments],
  )
  const bellNotifications = useMemo(
    () => notifications.filter((n) => !dismissedNotifications.has(n.id)),
    [notifications, dismissedNotifications],
  )

  // Só sincroniza com o Supabase depois que os dados iniciais já foram
  // carregados — senão o primeiro render (com arrays vazios) apagaria tudo
  // que já estava salvo no banco antes mesmo de ler o que tinha lá.
  useEffect(() => {
    if (dataLoaded) saveAccounts(userId, accounts).catch(console.error)
  }, [dataLoaded, userId, accounts])
  useEffect(() => {
    if (dataLoaded) saveTransactions(userId, transactions).catch(console.error)
  }, [dataLoaded, userId, transactions])
  useEffect(() => {
    if (dataLoaded) saveCategories(userId, categories).catch(console.error)
  }, [dataLoaded, userId, categories])
  useEffect(() => {
    if (dataLoaded) saveGoals(userId, goals).catch(console.error)
  }, [dataLoaded, userId, goals])
  useEffect(() => {
    if (dataLoaded) savePockets(userId, pockets).catch(console.error)
  }, [dataLoaded, userId, pockets])
  useEffect(() => {
    if (dataLoaded) saveBills(userId, bills).catch(console.error)
  }, [dataLoaded, userId, bills])
  useEffect(() => {
    if (dataLoaded) saveBillPayments(userId, billPayments).catch(console.error)
  }, [dataLoaded, userId, billPayments])
  useEffect(() => {
    if (dataLoaded) saveDismissedNotifications(userId, [...dismissedNotifications]).catch(console.error)
  }, [dataLoaded, userId, dismissedNotifications])

  useEffect(() => {
    registerServiceWorker().then(() => {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        subscribeToPush(userId)
      }
    })
  }, [userId])

  // Manda uma notificação de verdade (fora da aba) pra cada pendência nova
  // que ainda não tinha aparecido antes — evita reenviar a mesma toda vez
  // que a lista é recalculada.
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    const seen = loadNotifiedIds()
    const fresh = notifications.filter((n) => !seen.has(n.id))
    if (fresh.length === 0) return
    for (const n of fresh) {
      showDeviceNotification(n.status === 'vencida' ? 'Conta vencida' : 'Vencendo essa semana', {
        body: n.message,
        tag: n.id,
      })
      seen.add(n.id)
    }
    saveNotifiedIds(seen)
  }, [notifications])

  // Sem isso, abrir um formulário enquanto a lista já está rolada pra baixo
  // deixa o topo do form (nome, título) escondido acima da área visível —
  // parece que o campo sumiu, mas só está fora da rolagem.
  useEffect(() => {
    if (showAccountForm || showTxForm || showGoalForm || showPocketForm || showBillForm) {
      mainRef.current?.scrollTo({ top: 0 })
    }
  }, [showAccountForm, showTxForm, showGoalForm, showPocketForm, showBillForm])

  // O destaque vindo de uma notificação some sozinho depois de um tempo,
  // pra não ficar marcado pra sempre depois que a pessoa já viu o card.
  useEffect(() => {
    if (!highlightBillKey) return
    const timer = setTimeout(() => setHighlightBillKey(null), 4000)
    return () => clearTimeout(timer)
  }, [highlightBillKey])

  function handleSaveAccount(data) {
    if (editingAccount) {
      setAccounts(accounts.map((a) => (a.id === editingAccount.id ? { ...a, ...data } : a)))
    } else {
      setAccounts([...accounts, { id: generateId(), ...data }])
    }
    setEditingAccount(null)
    setShowAccountForm(false)
  }

  // Cria a conta do cartão sozinha quando a importação de fatura detecta o
  // banco emissor e não acha (ainda) uma conta cadastrada com esse nome —
  // evita a pessoa precisar ir em Contas cadastrar antes de poder importar.
  function handleCreateAccount(data) {
    const id = generateId()
    setAccounts((prev) => [...prev, { id, ...data }])
    return id
  }

  // A fatura importada pode trazer emissor, limite e datas de
  // fechamento/vencimento do cartão — só grava o que o parser conseguiu
  // achar, sem sobrescrever o que já estava cadastrado com nada.
  function handleUpdateCardInfo(accountId, info) {
    setAccounts(
      accounts.map((a) => {
        if (a.id !== accountId) return a
        const next = { ...a }
        if (info.totalLimit !== null) next.amount = info.totalLimit
        if (info.closingDay !== null) next.closingDay = info.closingDay
        if (info.dueDay !== null) next.dueDay = info.dueDay
        if (info.issuer && !a.name) next.name = info.issuer
        return next
      }),
    )
  }

  function handleDeleteAccount(id) {
    if (!confirm('Apagar essa conta? Os lançamentos ligados a ela vão continuar na lista.')) return
    setAccounts(accounts.filter((a) => a.id !== id))
  }

  function handleSaveTx(data) {
    const { applyToGroup, ...fields } = data
    if (editingTx) {
      const groupId = editingTx.groupId
      setTransactions(
        transactions.map((t) => {
          if (t.id === editingTx.id) return { ...t, ...fields }
          if (applyToGroup && groupId && t.groupId === groupId) {
            return { ...t, description: fields.description }
          }
          return t
        }),
      )
    } else {
      setTransactions([...transactions, { id: generateId(), ...fields }])
    }
    setEditingTx(null)
    setShowTxForm(false)
  }

  function handleDeleteTx(id) {
    if (!confirm('Apagar esse lançamento?')) return
    setTransactions(transactions.filter((t) => t.id !== id))
  }

  // Ao importar uma parcela (ex: "3/10"), além de lançar a parcela em si,
  // já projeta as seguintes (4/10 até 10/10) direto pros meses futuros —
  // assim a compra toda já aparece na fatura de cada mês seguinte, sem
  // precisar subir fatura nova só pra parcela aparecer. Se a fatura real
  // daquele mês futuro for importada depois, ela substitui a projeção
  // (mesmo grupo + mesmo índice de parcela) em vez de duplicar.
  function handleImportTransactions(accountId, items) {
    const imported = items.map((item) => ({
      id: generateId(),
      description: item.description,
      amount: item.amount,
      type: item.type,
      date: item.date,
      accountId,
      recurring: item.recurring,
      category: item.category || undefined,
      source: 'pdf',
      rawDescription: item.rawDescription,
      matchKey: item.matchKey,
      groupId: item.groupId,
      installment: item.installment,
      projected: false,
    }))

    const projectedExtras = imported.flatMap((item) =>
      projectFutureInstallments(item).map((extra) => ({ ...extra, id: generateId() })),
    )

    setTransactions((prev) => {
      const superseded = imported.filter((item) => item.groupId && item.installment)
      const withoutStalePlaceholders = prev.filter(
        (t) =>
          !(
            t.projected &&
            superseded.some(
              (item) => item.groupId === t.groupId && item.installment?.index === t.installment?.index,
            )
          ),
      )
      const next = [...withoutStalePlaceholders, ...imported]
      for (const extra of projectedExtras) {
        const alreadyThere = next.some(
          (t) => t.groupId === extra.groupId && t.installment?.index === extra.installment?.index,
        )
        if (!alreadyThere) next.push(extra)
      }
      return next
    })
  }

  // Categorizar um lançamento que veio de fatura (assinatura ou parcela)
  // também categoriza as outras ocorrências do mesmo grupo — assim, corrigir
  // uma vez ("Millium 03/10" -> "Coisas pra casa") já vale pras parcelas
  // seguintes, sem precisar categorizar todo mês de novo.
  function handleAssignCategory(txId, categoryId) {
    const tx = transactions.find((t) => t.id === txId)
    const groupId = tx?.groupId
    setTransactions(
      transactions.map((t) => {
        if (t.id === txId) return { ...t, category: categoryId }
        if (groupId && t.groupId === groupId) return { ...t, category: categoryId }
        return t
      }),
    )
  }

  function handleAddCategory(category) {
    setCategories([...categories, category])
  }

  function handleSaveGoal(data) {
    if (editingGoal) {
      setGoals(goals.map((g) => (g.id === editingGoal.id ? { ...g, ...data } : g)))
    } else {
      setGoals([...goals, { id: generateId(), movements: [], ...data }])
    }
    setEditingGoal(null)
    setShowGoalForm(false)
  }

  function handleDeleteGoal(id) {
    if (!confirm('Apagar esse gatinho? O histórico de depósitos e retiradas some junto.')) return
    setGoals(goals.filter((g) => g.id !== id))
  }

  function handleMoveGoal(goalId, amount) {
    setGoals(
      goals.map((g) =>
        g.id === goalId
          ? {
              ...g,
              movements: [
                ...(g.movements ?? []),
                { id: generateId(), amount, date: todayIso() },
              ],
            }
          : g,
      ),
    )
  }

  function handleSavePocket(data) {
    if (editingPocket) {
      setPockets(pockets.map((p) => (p.id === editingPocket.id ? { ...p, ...data } : p)))
    } else {
      setPockets([...pockets, { id: generateId(), movements: [], ...data }])
    }
    setEditingPocket(null)
    setShowPocketForm(false)
  }

  function handleDeletePocket(id) {
    if (!confirm('Apagar esse saldo separado? O histórico de guardado e retirado some junto.')) return
    setPockets(pockets.filter((p) => p.id !== id))
  }

  function handleMovePocket(pocketId, amount) {
    setPockets(
      pockets.map((p) =>
        p.id === pocketId
          ? {
              ...p,
              movements: [
                ...(p.movements ?? []),
                { id: generateId(), amount, date: todayIso() },
              ],
            }
          : p,
      ),
    )
  }

  function handleSaveBill(data) {
    if (editingBill) {
      setBills(bills.map((b) => (b.id === editingBill.id ? { ...b, ...data } : b)))
    } else {
      setBills([...bills, { id: generateId(), ...data }])
    }
    setEditingBill(null)
    setShowBillForm(false)
  }

  function handleDeleteBill(id) {
    if (!confirm('Apagar essa conta a pagar? Os pagamentos já feitos continuam nos lançamentos.'))
      return
    setBills(bills.filter((b) => b.id !== id))
    setBillPayments(billPayments.filter((p) => p.billId !== id))
  }

  // Pagar uma conta cria, ao mesmo tempo, o registro de pagamento (pra saber
  // que aquele mês/ocorrência já foi quitado) e um lançamento normal de saída
  // na conta escolhida — assim o saldo da conta corrente debita sozinho,
  // reaproveitando o mesmo cálculo de saldo das transações comuns.
  function handlePayBill(occurrence, { amount, accountId, paidDate }) {
    const paymentId = generateId()
    const txId = generateId()
    const { bill, monthKey } = occurrence
    setBillPayments([
      ...billPayments,
      { id: paymentId, billId: bill.id, monthKey, amount, paidDate, accountId, transactionId: txId },
    ])
    setTransactions([
      ...transactions,
      {
        id: txId,
        description: bill.name,
        amount,
        type: bill.type === 'entrada' ? 'entrada' : 'saida',
        date: paidDate,
        accountId,
        recurring: false,
        category: bill.category,
        billId: bill.id,
        billPaymentId: paymentId,
      },
    ])
  }

  function handleUnpayBill(payment) {
    if (!confirm('Desfazer esse pagamento? O lançamento correspondente também será apagado.')) return
    setBillPayments(billPayments.filter((p) => p.id !== payment.id))
    setTransactions(transactions.filter((t) => t.id !== payment.transactionId))
  }

  // Encerra só as ocorrências futuras de uma conta recorrente (ex: Paula
  // parou de dividir a Netflix) — o mês atual e os já vencidos/pagos
  // continuam no histórico normalmente.
  function handleStopRecurring(bill) {
    setBills(
      bills.map((b) => (b.id === bill.id ? { ...b, recurringEndMonthKey: currentMonthKey() } : b)),
    )
  }

  function handleResumeRecurring(bill) {
    setBills(
      bills.map((b) => (b.id === bill.id ? { ...b, recurringEndMonthKey: null } : b)),
    )
  }

  // Clicar numa notificação leva direto pro card da conta em Lançamentos,
  // já destacado, pra pessoa registrar o pagamento/recebimento na hora.
  function handleClearNotifications() {
    setDismissedNotifications(
      (prev) => new Set([...prev, ...bellNotifications.map((n) => n.id)]),
    )
    setShowNotifications(false)
  }

  function handleNotificationClick(notification) {
    setTab('lancamentos')
    setShowBillForm(false)
    setShowTxForm(false)
    setHighlightBillKey(notification.id)
    setShowNotifications(false)
  }

  // Clicar num cartão em "Faturas em aberto" (Lançamentos) leva direto pra
  // fatura dele em Cartões, já selecionado — sem precisar escolher no menu lá.
  function handleOpenCard(cardId) {
    setSelectedCardId(cardId)
    setTab('cartoes')
  }

  // Assim que uma fatura fecha, ela vira sozinha uma conta a pagar (com
  // vencimento certo, debitando da conta configurada como pagadora do
  // cartão) — sem isso a pessoa teria que lançar a fatura na mão todo mês.
  // Confere as últimas 12 faturas fechadas (não só a mais recente) pra não
  // deixar fatura antiga de fora — ex: parcelas importadas de fatura velha,
  // ou meses em que a pessoa não abriu o app na virada do mês.
  useEffect(() => {
    const cardsWithBilling = accounts.filter(
      (a) => a.type === 'cartao' && a.closingDay && a.dueDay && a.paymentAccountId,
    )
    if (cardsWithBilling.length === 0) return

    const today = todayIso()
    const newBills = []

    for (const card of cardsWithBilling) {
      const openPeriodKey = periodKeyForDate(today, card)

      for (let offset = 1; offset <= 12; offset++) {
        const closedPeriodKey = monthKeyOffset(openPeriodKey, -offset)
        const period = invoicePeriod(card, closedPeriodKey)
        const total = invoiceTotal(transactions, card.id, period)
        if (total <= 0) continue

        const alreadyExists = bills.some(
          (b) => b.cardId === card.id && b.periodKey === closedPeriodKey,
        )
        if (alreadyExists) continue

        newBills.push({
          id: generateId(),
          name: `Fatura ${card.name}`,
          type: 'saida',
          amount: total,
          variableAmount: true,
          recurring: false,
          dueDate: invoiceDueDate(card, closedPeriodKey),
          accountId: card.paymentAccountId,
          category: undefined,
          active: true,
          cardId: card.id,
          periodKey: closedPeriodKey,
        })
      }
    }

    if (newBills.length > 0) setBills((prev) => [...prev, ...newBills])
  }, [accounts, transactions, bills])

  // Compras no cartão já aparecem detalhadas na fatura, em Cartões — aqui em
  // Lançamentos só cabe o saldo total dela (que chega como a conta "Fatura
  // X" gerada automaticamente), senão a mesma compra apareceria duas vezes.
  const cardAccountIds = useMemo(
    () => new Set(accounts.filter((a) => a.type === 'cartao').map((a) => a.id)),
    [accounts],
  )
  const nonCardTransactions = useMemo(
    () => transactions.filter((t) => !cardAccountIds.has(t.accountId)),
    [transactions, cardAccountIds],
  )

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[0]
  const Mascot = activeTab.mascot
  const mainTabs = MAIN_TAB_IDS.map((id) => TABS.find((t) => t.id === id))
  const moreTabs = MORE_TAB_IDS.map((id) => TABS.find((t) => t.id === id))

  function goToTab(id) {
    setTab(id)
    setShowMoreMenu(false)
  }

  if (!dataLoaded) {
    return (
      <div className="flex h-dvh items-center justify-center bg-bg">
        <CatMascotGlasses className="h-16 w-16 animate-pulse" />
      </div>
    )
  }

  if (migration) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-6 px-5 py-10">
        <CatMascotSparkle className="h-20 w-20" />
        <Card className="flex flex-col gap-4 text-center">
          <h2 className="font-display text-xl font-semibold text-ink">
            Achei seus dados de teste
          </h2>
          <p className="text-sm text-gray">
            Antes de conectar o banco de verdade, você já tinha contas, lançamentos ou metas
            salvos neste navegador. Quer migrar esse conteúdo pro banco de verdade, pra não
            perder o que já testou?
          </p>
          <PrimaryButton onClick={handleMigrate}>Migrar meus dados de teste</PrimaryButton>
          <GhostButton onClick={handleSkipMigration}>Começar do zero</GhostButton>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="relative flex shrink-0 items-center gap-3 px-6 pt-8 pb-2">
        <Mascot className="h-16 w-[4.5rem] shrink-0" />
        <div className="flex flex-1 flex-col items-start gap-1">
          <span className="rounded-full bg-rose/25 px-3 py-1 font-display text-lg font-bold tracking-tight text-ink">
            FinPilot
          </span>
          <p className="text-xs text-gray">{activeTab.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            requestNotificationPermission()
            requestPushPermission().then((permission) => {
              if (permission === 'granted') subscribeToPush(userId)
            })
            setShowNotifications((v) => !v)
          }}
          className="relative shrink-0 self-start rounded-full p-2.5 text-ink hover:bg-ink/5"
          aria-label="Notificações"
        >
          <BellIcon />
          {bellNotifications.length > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-semibold text-surface">
              {bellNotifications.length}
            </span>
          )}
        </button>
        {showNotifications && (
          <NotificationsPanel
            notifications={bellNotifications}
            onSelect={handleNotificationClick}
            onClear={handleClearNotifications}
            onClose={() => setShowNotifications(false)}
          />
        )}
      </header>

      <main
        ref={mainRef}
        className="mx-auto flex w-full min-h-0 max-w-md flex-1 flex-col justify-start gap-4 overflow-y-auto px-6 py-4"
      >
        {tab === 'dashboard' && (
          <Dashboard
            accounts={accounts}
            transactions={transactions}
            goals={goals}
            pockets={pockets}
            bills={bills}
            billPayments={billPayments}
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
          />
        )}

        {tab === 'contas' && (
          <>
            {!showAccountForm && (
              <PrimaryButton
                onClick={() => {
                  setEditingAccount(null)
                  setShowAccountForm(true)
                }}
              >
                <PlusIcon /> Nova conta
              </PrimaryButton>
            )}

            {showAccountForm && (
              <AccountForm
                accounts={accounts}
                initial={editingAccount}
                onSave={handleSaveAccount}
                onCancel={() => {
                  setShowAccountForm(false)
                  setEditingAccount(null)
                }}
              />
            )}

            <AccountList
              accounts={accounts}
              transactions={transactions}
              onEdit={(account) => {
                setEditingAccount(account)
                setShowAccountForm(true)
              }}
              onDelete={handleDeleteAccount}
            />
          </>
        )}

        {tab === 'cartoes' && (
          <CardsScreen
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            bills={bills}
            billPayments={billPayments}
            onImport={handleImportTransactions}
            onUpdateCardInfo={handleUpdateCardInfo}
            onCreateAccount={handleCreateAccount}
            selectedCardId={selectedCardId}
            onSelectCard={setSelectedCardId}
          />
        )}

        {tab === 'lancamentos' && (
          <>
            {!showTxForm && !showBillForm && accounts.length > 0 && (
              <div className="flex gap-3">
                <PrimaryButton
                  className="flex-1"
                  onClick={() => {
                    setEditingTx(null)
                    setShowTxForm(true)
                  }}
                >
                  <PlusIcon /> Novo lançamento
                </PrimaryButton>
                <GhostButton
                  className="flex-1"
                  onClick={() => {
                    setEditingBill(null)
                    setShowBillForm(true)
                  }}
                >
                  <PlusIcon /> Conta a pagar/receber
                </GhostButton>
              </div>
            )}

            {accounts.length === 0 && !showTxForm && !showBillForm && (
              <p className="rounded-2xl bg-rose/10 px-4 py-3 text-sm text-ink">
                Cadastre uma conta ou cartão primeiro, na aba <strong>Contas</strong>.
              </p>
            )}

            {showTxForm && (
              <TransactionForm
                accounts={accounts}
                initial={editingTx}
                onSave={handleSaveTx}
                onCancel={() => {
                  setShowTxForm(false)
                  setEditingTx(null)
                }}
              />
            )}

            {showBillForm && (
              <BillForm
                accounts={accounts}
                categories={categories}
                initial={editingBill}
                onSave={handleSaveBill}
                onCancel={() => {
                  setShowBillForm(false)
                  setEditingBill(null)
                }}
              />
            )}

            {!showTxForm && !showBillForm && (
              <OpenInvoicesSummary
                accounts={accounts}
                transactions={transactions}
                onSelectCard={handleOpenCard}
              />
            )}

            <BillList
              bills={bills}
              billPayments={billPayments}
              transactions={nonCardTransactions}
              accounts={accounts}
              categories={categories}
              onEdit={(bill) => {
                setEditingBill(bill)
                setShowBillForm(true)
              }}
              onDelete={handleDeleteBill}
              onPay={handlePayBill}
              onUnpay={handleUnpayBill}
              onStopRecurring={handleStopRecurring}
              onResumeRecurring={handleResumeRecurring}
              onEditTx={(tx) => {
                setEditingTx(tx)
                setShowTxForm(true)
              }}
              onDeleteTx={handleDeleteTx}
              highlightKey={highlightBillKey}
            />
          </>
        )}

        {tab === 'caixa' && (
          <Inbox
            transactions={transactions}
            accounts={accounts}
            categories={categories}
            onAssignCategory={handleAssignCategory}
            onAddCategory={handleAddCategory}
          />
        )}

        {tab === 'porquinhos' && (
          <>
            <div className="flex gap-1 rounded-full bg-ink/5 p-1">
              {[
                { id: 'metas', label: 'Metas' },
                { id: 'separado', label: 'Saldo separado' },
              ].map((view) => {
                const active = goalsView === view.id
                return (
                  <button
                    key={view.id}
                    type="button"
                    onClick={() => setGoalsView(view.id)}
                    className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition active:scale-[0.98] ${
                      active ? 'bg-surface text-ink shadow-sm' : 'text-gray hover:text-ink'
                    }`}
                  >
                    {view.label}
                  </button>
                )
              })}
            </div>

            {goalsView === 'metas' ? (
              <>
                {!showGoalForm && (
                  <PrimaryButton
                    onClick={() => {
                      setEditingGoal(null)
                      setShowGoalForm(true)
                    }}
                  >
                    <PlusIcon /> Novo gatinho
                  </PrimaryButton>
                )}

                {showGoalForm && (
                  <GoalForm
                    initial={editingGoal}
                    onSave={handleSaveGoal}
                    onCancel={() => {
                      setShowGoalForm(false)
                      setEditingGoal(null)
                    }}
                  />
                )}

                <GoalList
                  goals={goals}
                  onEdit={(goal) => {
                    setEditingGoal(goal)
                    setShowGoalForm(true)
                  }}
                  onDelete={handleDeleteGoal}
                  onMove={handleMoveGoal}
                />
              </>
            ) : (
              <>
                {!showPocketForm && (
                  <PrimaryButton
                    onClick={() => {
                      setEditingPocket(null)
                      setShowPocketForm(true)
                    }}
                  >
                    <PlusIcon /> Novo saldo separado
                  </PrimaryButton>
                )}

                {showPocketForm && (
                  <PocketForm
                    initial={editingPocket}
                    onSave={handleSavePocket}
                    onCancel={() => {
                      setShowPocketForm(false)
                      setEditingPocket(null)
                    }}
                  />
                )}

                <PocketList
                  pockets={pockets}
                  onEdit={(pocket) => {
                    setEditingPocket(pocket)
                    setShowPocketForm(true)
                  }}
                  onDelete={handleDeletePocket}
                  onMove={handleMovePocket}
                />
              </>
            )}
          </>
        )}

        {tab === 'simulador' && (
          <SimuladorScreen accounts={accounts} transactions={transactions} goals={goals} userId={userId} />
        )}

        {tab === 'insights' && (
          <Insights
            accounts={accounts}
            transactions={transactions}
            categories={categories}
            goals={goals}
          />
        )}

        {tab === 'perfil' && (
          <ProfileScreen
            accounts={accounts}
            transactions={transactions}
            goals={goals}
            onNavigate={goToTab}
            userEmail={session.user.email}
            userId={userId}
          />
        )}
      </main>

      <nav className="relative flex shrink-0 items-center justify-center px-4 pb-6 pt-2">
        <div className="flex flex-1 items-center justify-evenly rounded-full bg-surface px-3 py-2 shadow-[0_12px_30px_-16px_rgba(30,30,30,0.3)]">
          {mainTabs.map(({ id, label, icon: Icon }) => {
            const active = tab === id

            if (id === 'dashboard') {
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => goToTab(id)}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  className="flex items-center justify-center p-1"
                >
                  <span className="-translate-y-4 flex h-14 w-14 items-center justify-center rounded-full bg-coral text-surface shadow-[0_10px_20px_-8px_rgba(249,135,111,0.7)] transition active:scale-90">
                    <Icon width={24} height={24} strokeWidth={2.2} />
                  </span>
                </button>
              )
            }

            return (
              <button
                key={id}
                type="button"
                onClick={() => goToTab(id)}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center justify-center rounded-full p-2 transition active:scale-90 ${
                  active ? 'text-coral' : 'text-ink/70 hover:text-ink'
                }`}
              >
                <Icon width={26} height={26} strokeWidth={active ? 2.2 : 1.8} />
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setShowMoreMenu(true)}
            aria-label="Mais funcionalidades"
            className="flex items-center justify-center rounded-full p-2 text-ink/70 transition hover:text-ink active:scale-90"
          >
            <MenuIcon width={26} height={26} strokeWidth={1.8} />
          </button>
        </div>
      </nav>

      {showMoreMenu && (
        <MoreMenu
          items={moreTabs}
          activeTab={tab}
          onSelect={goToTab}
          onClose={() => setShowMoreMenu(false)}
        />
      )}
    </div>
  )
}

export default App
