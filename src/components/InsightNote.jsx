const toneClasses = {
  positive: 'bg-coral/10',
  warning: 'bg-rose/15',
  neutral: 'bg-ink/5',
}

// Nota compacta de insight, reaproveitada dentro de cada tela (Dashboard,
// Contas, Lançamentos, Caixa de entrada, Gatinhos) pra mostrar uma
// observação contextual sobre os dados daquela tela específica.
function InsightNote({ insight }) {
  if (!insight) return null

  return (
    <div
      className={`flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm text-ink ${toneClasses[insight.tone] ?? toneClasses.neutral}`}
    >
      <span className="text-base leading-none">{insight.emoji}</span>
      <span>{insight.text}</span>
    </div>
  )
}

export default InsightNote
