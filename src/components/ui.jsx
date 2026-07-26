export function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-left">
      <span className="text-sm font-medium text-gray">{label}</span>
      {children}
    </label>
  )
}

const fieldClasses =
  'w-full rounded-2xl border border-ink/10 bg-surface px-4 py-3 text-ink placeholder:text-gray/60 outline-none focus:border-coral focus:ring-2 focus:ring-coral/25 transition'

export function TextInput(props) {
  return <input {...props} className={fieldClasses} />
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={fieldClasses}>
      {children}
    </select>
  )
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-coral px-5 py-3 font-semibold text-surface shadow-[0_10px_20px_-8px_rgba(249,135,111,0.6)] transition hover:brightness-105 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  )
}

export function GhostButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-ink/5 px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-ink/10 active:scale-[0.98] ${className}`}
    >
      {children}
    </button>
  )
}

export function DangerLink({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`text-sm font-medium text-rose transition hover:text-coral ${className}`}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div
      className={`rounded-[1.75rem] bg-surface p-5 shadow-[0_12px_30px_-16px_rgba(30,30,30,0.25)] ${className}`}
    >
      {children}
    </div>
  )
}

export function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-dashed border-ink/15 px-6 py-12 text-center">
      {icon}
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      <p className="text-sm text-gray">{description}</p>
    </div>
  )
}
