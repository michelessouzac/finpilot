// Cópia da leitura antiga (localStorage) — usada só uma vez, pra oferecer a
// migração dos dados de teste pro Supabase quando a pessoa loga pela
// primeira vez com o banco de verdade já conectado.
const KEYS = {
  accounts: 'finpilot:accounts',
  transactions: 'finpilot:transactions',
  categories: 'finpilot:categories',
  goals: 'finpilot:goals',
  bills: 'finpilot:bills',
  billPayments: 'finpilot:billPayments',
  dismissedNotifications: 'finpilot:dismissedNotifications',
}

function load(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function readLocalBackup() {
  return {
    accounts: load(KEYS.accounts),
    transactions: load(KEYS.transactions),
    categories: load(KEYS.categories),
    goals: load(KEYS.goals),
    bills: load(KEYS.bills),
    billPayments: load(KEYS.billPayments),
    dismissedNotifications: load(KEYS.dismissedNotifications),
  }
}

export function hasLocalBackupData() {
  const backup = readLocalBackup()
  return Object.values(backup).some((list) => list.length > 0)
}

export function clearLocalBackup() {
  for (const key of Object.values(KEYS)) {
    localStorage.removeItem(key)
  }
}
