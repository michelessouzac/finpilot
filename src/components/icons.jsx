const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export function WalletIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M3 10h18" />
      <path d="M15 14.5h3" />
    </svg>
  )
}

export function ListIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  )
}

export function PlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} strokeWidth={2.4} {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

export function PencilIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}

export function TrashIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

export function CloseIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} strokeWidth={2.2} {...props}>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}

export function ArrowUpIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} strokeWidth={2.2} {...props}>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </svg>
  )
}

export function ArrowDownIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} strokeWidth={2.2} {...props}>
      <path d="M12 5v14" />
      <path d="M6 13l6 6 6-6" />
    </svg>
  )
}

export function ChartIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <path d="M4 19h16" />
      <path d="M7 19v-6" />
      <path d="M12 19V7" />
      <path d="M17 19v-9" />
    </svg>
  )
}

export function InboxIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <path d="M4 12h4l2 3h4l2-3h4" />
      <path d="M5.5 5h13l2 7v6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-6z" />
    </svg>
  )
}

export function ChevronDownIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} strokeWidth={2.2} {...props}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function CheckIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} strokeWidth={2.4} {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export function CatIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <path d="M6 3 L9 9 L12 6.5 L15 9 L18 3 Q21 6 20 13 Q19 20 12 21 Q5 20 4 13 Q3 6 6 3 Z" />
      <path d="M5 12 L-1 10.5" />
      <path d="M5 13.5 L-1 13.5" />
      <path d="M5 15 L-1 17" />
      <path d="M19 12 L25 10.5" />
      <path d="M19 13.5 L25 13.5" />
      <path d="M19 15 L25 17" />
    </svg>
  )
}

export function MinusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} strokeWidth={2.4} {...props}>
      <path d="M5 12h14" />
    </svg>
  )
}

export function QuestionIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 2-2.4 3.7" />
      <path d="M12 17.5h.01" />
    </svg>
  )
}

export function SparkleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="M12 8a4 4 0 0 0 4 4 4 4 0 0 0-4 4 4 4 0 0 0-4-4 4 4 0 0 0 4-4Z" />
    </svg>
  )
}

export function UploadIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" {...base} {...props}>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  )
}

export function ReceiptIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3Z" />
      <path d="M9 8h6" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  )
}

export function BellIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...base} {...props}>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}

export function BankIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <path d="M2 10 12 4l10 6" />
      <path d="M4 10v10" />
      <path d="M20 10v10" />
      <path d="M8 10v10" />
      <path d="M16 10v10" />
      <path d="M2 20h20" />
    </svg>
  )
}

export function CardIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 9.5h18" />
      <path d="M6 14.5h4" />
    </svg>
  )
}

export function MenuIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  )
}

export function UserIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.6 4.4-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </svg>
  )
}

export function DollarIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...base} {...props}>
      <path d="M12 2v20" />
      <path d="M16.5 6.5c0-1.7-2-2.5-4.5-2.5s-4.5 1-4.5 3 2 2.8 4.5 3.2 4.5 1.2 4.5 3.3-2 3-4.5 3-4.5-.9-4.5-2.6" />
    </svg>
  )
}

export function RepeatIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" {...base} strokeWidth={2} {...props}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}
