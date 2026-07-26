// Confere se saiu uma versão nova do app e recarrega a página sozinho.
// Necessário porque PWAs instalados na tela do celular costumam só "acordar"
// a página que já estava aberta ao reabrir, em vez de buscar a versão nova —
// sem isso, quem tem o app instalado ficaria preso na versão antiga até
// fechar o app de vez manualmente.
export function watchForNewVersion() {
  async function checkVersion() {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) return
      const { version } = await res.json()
      if (version && version !== __APP_VERSION__) {
        window.location.reload()
      }
    } catch {
      // Sem internet ou dev server sem version.json: só ignora e tenta de novo depois.
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkVersion()
  })
  window.addEventListener('focus', checkVersion)
}
