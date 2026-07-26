// Gatinho da meta: mesmo Finny (gato preto, óculos e sacola noutras telas),
// mas aqui ele "engorda" ou "emagrece" conforme o progresso da meta (0 a
// 100%) e ganha um acessório diferente pra cada tipo de meta — mala pra
// viagem, casinha pra casa nova, esmalte pra manicure, etc.

const INK = '#1E1E1E'
const SURFACE = '#FBFBFB'
const CORAL = '#F9876F'
const ROSE = '#E38C92'

function clamp01(n) {
  return Math.max(0, Math.min(1, n))
}

function Cushion() {
  return <rect x="14" y="190" width="172" height="24" rx="12" fill={ROSE} opacity="0.35" />
}

function Tail({ fatness }) {
  // Cauda mais enroladinha (curta) quando gordo, mais esticada quando magro.
  const curl = 30 - fatness * 14
  return (
    <path
      d={`M158 176 q${28 + curl} -6 ${18 + curl} -34`}
      fill="none"
      stroke={INK}
      strokeWidth="13"
      strokeLinecap="round"
    />
  )
}

function Body({ fatness }) {
  const rx = 40 + fatness * 30
  const ry = 38 + fatness * 22
  const cy = 158 - fatness * 10
  return <ellipse cx="100" cy={cy} rx={rx} ry={ry} fill={INK} />
}

function BellyCrease({ fatness }) {
  if (fatness < 0.45) return null
  const cy = 158 - fatness * 10
  const opacity = clamp01((fatness - 0.45) / 0.55)
  return (
    <path
      d={`M${100 - 22 - fatness * 8} ${cy + 4} Q100 ${cy + 20} ${100 + 22 + fatness * 8} ${cy + 4}`}
      fill="none"
      stroke="#000"
      strokeOpacity={0.18 * opacity}
      strokeWidth="4"
      strokeLinecap="round"
    />
  )
}

function Paws({ fatness }) {
  const spread = 26 + fatness * 10
  const y = 178
  return (
    <>
      <ellipse cx={100 - spread} cy={y} rx={15 + fatness * 4} ry="13" fill={INK} />
      <ellipse cx={100 + spread} cy={y} rx={15 + fatness * 4} ry="13" fill={INK} />
    </>
  )
}

function Ears() {
  return (
    <>
      <path d="M62 46 L50 8 L96 34 Z" fill={INK} />
      <path d="M138 46 L150 8 L104 34 Z" fill={INK} />
    </>
  )
}

function Head({ mood = 'happy', fatness }) {
  const r = 38 + fatness * 4
  return (
    <>
      <circle cx="100" cy="72" r={r} fill={INK} />
      {/* bochechas, mais cheinhas quando gordo */}
      {fatness > 0.5 && (
        <>
          <ellipse cx={100 - r + 6} cy="82" rx={8 + fatness * 5} ry={6 + fatness * 3} fill={INK} />
          <ellipse cx={100 + r - 6} cy="82" rx={8 + fatness * 5} ry={6 + fatness * 3} fill={INK} />
        </>
      )}
      <Eyes mood={mood} />
      <NoseAndWhiskers />
    </>
  )
}

function Eyes({ mood }) {
  if (mood === 'sad') {
    return (
      <g stroke={SURFACE} strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M64 68 q10 10 20 0" />
        <path d="M116 68 q10 10 20 0" />
      </g>
    )
  }
  if (mood === 'joy') {
    return (
      <g stroke={SURFACE} strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M64 70 q10 -12 20 0" />
        <path d="M116 70 q10 -12 20 0" />
      </g>
    )
  }
  return (
    <>
      <circle cx="76" cy="68" r="12" fill={SURFACE} />
      <circle cx="124" cy="68" r="12" fill={SURFACE} />
      <circle cx="78" cy="70" r="5.5" fill={INK} />
      <circle cx="126" cy="70" r="5.5" fill={INK} />
    </>
  )
}

function NoseAndWhiskers() {
  return (
    <>
      <path d="M100 80 L94 87 L106 87 Z" fill={CORAL} />
      <g stroke="#636363" strokeWidth="1.6" strokeLinecap="round" opacity="0.6">
        <line x1="66" y1="84" x2="30" y2="80" />
        <line x1="66" y1="90" x2="30" y2="96" />
        <line x1="134" y1="84" x2="170" y2="80" />
        <line x1="134" y1="90" x2="170" y2="96" />
      </g>
    </>
  )
}

function Sparkles() {
  return (
    <g fill={CORAL}>
      <path d="M30 40 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" opacity="0.9" />
      <path d="M172 100 l2.5 6.5 6.5 2.5 -6.5 2.5 -2.5 6.5 -2.5 -6.5 -6.5 -2.5 6.5 -2.5 Z" opacity="0.8" />
    </g>
  )
}

function AccessoryViagem() {
  // maleta de viagem apoiada ao lado do gato
  return (
    <g transform="translate(146 150)">
      <rect x="0" y="10" width="40" height="32" rx="6" fill={CORAL} />
      <rect x="14" y="2" width="12" height="10" rx="3" fill="none" stroke={CORAL} strokeWidth="3" />
      <line x1="0" y1="26" x2="40" y2="26" stroke={SURFACE} strokeWidth="2.5" opacity="0.7" />
      <rect x="16" y="20" width="8" height="12" rx="2" fill={SURFACE} opacity="0.7" />
    </g>
  )
}

function AccessoryCasa() {
  // silhueta de casinha de gato atrás do bicho
  return (
    <g transform="translate(126 4)" opacity="0.9">
      <path d="M0 30 L34 0 L68 30 Z" fill={ROSE} />
      <rect x="10" y="30" width="48" height="30" fill={ROSE} opacity="0.6" />
      <path d="M28 60 L28 42 Q34 34 40 42 L40 60 Z" fill={INK} opacity="0.85" />
    </g>
  )
}

function AccessoryManicure() {
  // patinha erguida segurando um vidrinho de esmalte + coraçãozinho
  return (
    <g transform="translate(132 96)">
      <ellipse cx="10" cy="30" rx="12" ry="10" fill={INK} />
      <rect x="18" y="-6" width="14" height="20" rx="4" fill={ROSE} />
      <rect x="21" y="-12" width="8" height="8" rx="2" fill={CORAL} />
      <path d="M-6 6 c0 -6 9 -6 9 0 c0 -6 9 -6 9 0 c0 5 -9 10 -9 10 c0 0 -9 -5 -9 -10 Z" fill={CORAL} />
    </g>
  )
}

function AccessoryEletronico() {
  // celular apoiado com um raio de "carregado/novo"
  return (
    <g transform="translate(140 140)">
      <rect x="0" y="0" width="30" height="46" rx="6" fill={INK} stroke={CORAL} strokeWidth="2.5" />
      <rect x="6" y="8" width="18" height="26" rx="2" fill={CORAL} opacity="0.35" />
      <path d="M17 12 L10 24 L15 24 L13 34 L22 20 L16 20 Z" fill={CORAL} />
    </g>
  )
}

function AccessoryPresente() {
  // caixa de presente apoiada no colo/entre as patas
  return (
    <g transform="translate(80 150)">
      <rect x="0" y="10" width="40" height="28" rx="4" fill={ROSE} />
      <rect x="0" y="18" width="40" height="8" fill={SURFACE} opacity="0.8" />
      <rect x="16" y="10" width="8" height="28" fill={SURFACE} opacity="0.8" />
      <path d="M12 10 q-6 -14 8 -12 q4 8 0 12 Z" fill={ROSE} />
      <path d="M28 10 q6 -14 -8 -12 q-4 8 0 12 Z" fill={ROSE} />
    </g>
  )
}

function AccessoryEmergencia() {
  // guarda-chuva de proteção acima da cabeça
  return (
    <g transform="translate(122 -6)">
      <path
        d="M0 34 A34 30 0 0 1 68 34 Q34 20 0 34 Z"
        fill={CORAL}
      />
      <line x1="34" y1="34" x2="34" y2="66" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M34 66 q0 8 8 6" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
    </g>
  )
}

function AccessoryOutro() {
  // moedinha "guardada", estilo cofrinho clássico — usado quando o nome da
  // meta não bate com nenhum tema conhecido.
  return (
    <g transform="translate(150 150)" opacity="0.9">
      <circle cx="14" cy="14" r="14" fill="none" stroke={CORAL} strokeWidth="3.5" />
      <line x1="14" y1="6" x2="14" y2="10" stroke={CORAL} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="14" y1="18" x2="14" y2="22" stroke={CORAL} strokeWidth="3.5" strokeLinecap="round" />
    </g>
  )
}

// --- Temas "Outro": o desenho é escolhido a partir de palavras-chave no
// nome que a pessoa deu pra meta (ex: "Barraquinha de cachorro-quente" vira
// um gato com um hot dog na pata). Sem nenhum termo reconhecido, cai no
// cofrinho padrão acima.

function AccessoryHotDog() {
  return (
    <g transform="translate(134 152)">
      <path d="M0 20 Q4 0 26 0 Q48 0 52 20 Q48 32 26 32 Q4 32 0 20 Z" fill="#E8C79A" />
      <ellipse cx="26" cy="17" rx="21" ry="8.5" fill="#C1553D" />
      <path d="M8 14 Q17 7 26 14 T44 14" fill="none" stroke="#F4D35E" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  )
}

function AccessoryPet() {
  // pegada de patinha, pra metas de adotar/cuidar de um bichinho
  return (
    <g transform="translate(140 148)">
      <ellipse cx="16" cy="22" rx="16" ry="12" fill={ROSE} />
      <circle cx="5" cy="10" r="5.5" fill={ROSE} />
      <circle cx="27" cy="10" r="5.5" fill={ROSE} />
      <circle cx="-2" cy="20" r="4" fill={ROSE} />
      <circle cx="34" cy="20" r="4" fill={ROSE} />
    </g>
  )
}

function AccessoryCarro() {
  return (
    <g transform="translate(128 162)">
      <path d="M6 12 L14 -2 H42 L50 12 Z" fill={CORAL} />
      <rect x="0" y="12" width="56" height="14" rx="6" fill={CORAL} />
      <circle cx="13" cy="28" r="6.5" fill={INK} />
      <circle cx="43" cy="28" r="6.5" fill={INK} />
    </g>
  )
}

function AccessoryFesta() {
  return (
    <g transform="translate(140 128)">
      <path d="M10 42 L20 0 L30 42 Z" fill={ROSE} />
      <circle cx="20" cy="4" r="4.5" fill={CORAL} />
      <g fill={CORAL}>
        <circle cx="-2" cy="20" r="2.5" />
        <circle cx="40" cy="10" r="2.5" />
        <circle cx="2" cy="36" r="2" />
      </g>
    </g>
  )
}

function AccessoryBebe() {
  return (
    <g transform="translate(142 150)">
      <circle cx="14" cy="14" r="14" fill={ROSE} />
      <circle cx="14" cy="14" r="6" fill={SURFACE} opacity="0.85" />
      <rect x="11" y="26" width="6" height="14" rx="3" fill={ROSE} />
    </g>
  )
}

function AccessoryEstudo() {
  // capelo de formatura
  return (
    <g transform="translate(128 150)">
      <path d="M0 10 L28 0 L56 10 L28 20 Z" fill={INK} />
      <rect x="10" y="10" width="36" height="6" fill={CORAL} opacity="0.7" />
      <line x1="56" y1="10" x2="56" y2="26" stroke={INK} strokeWidth="2.5" />
      <circle cx="56" cy="28" r="2.5" fill={INK} />
    </g>
  )
}

function AccessoryAcademia() {
  return (
    <g transform="translate(128 160)">
      <rect x="0" y="8" width="10" height="16" rx="3" fill={INK} />
      <rect x="46" y="8" width="10" height="16" rx="3" fill={INK} />
      <rect x="10" y="13" width="36" height="6" rx="3" fill={CORAL} />
    </g>
  )
}

function AccessoryMusica() {
  return (
    <g transform="translate(148 132)">
      <circle cx="6" cy="42" r="7" fill={CORAL} />
      <rect x="11" y="4" width="3.5" height="38" fill={INK} />
      <path d="M14.5 4 Q28 0 28 13 Q21 8 14.5 15 Z" fill={INK} />
    </g>
  )
}

function AccessorySaude() {
  return (
    <g transform="translate(142 150)">
      <rect x="8" y="0" width="12" height="30" rx="3" fill={ROSE} />
      <rect x="0" y="8" width="28" height="12" rx="3" fill={ROSE} />
    </g>
  )
}

function stripAccents(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

const OUTRO_THEMES = [
  {
    keywords: ['cachorro-quente', 'cachorro quente', 'hot dog', 'hotdog', 'lanchonete', 'lanche', 'barraquinha', 'barraca', 'food truck', 'pastel', 'churrasco'],
    Accessory: AccessoryHotDog,
  },
  {
    keywords: ['cachorro', 'cachorrinho', 'gatinho de estimacao', 'adocao', 'petshop', 'veterinari', 'pet '],
    Accessory: AccessoryPet,
  },
  { keywords: ['carro', 'moto', 'automovel', 'veiculo'], Accessory: AccessoryCarro },
  { keywords: ['casamento', 'noivado', 'festa', 'aniversario', 'formatura'], Accessory: AccessoryFesta },
  { keywords: ['bebe', 'enxoval', 'gravidez'], Accessory: AccessoryBebe },
  { keywords: ['curso', 'faculdade', 'intercambio', 'pos-graduacao', 'pos graduacao', 'mba'], Accessory: AccessoryEstudo },
  { keywords: ['academia', 'gym', 'fitness', 'musculacao'], Accessory: AccessoryAcademia },
  { keywords: ['violao', 'guitarra', 'instrumento musical', 'piano', 'bateria'], Accessory: AccessoryMusica },
  { keywords: ['cirurgia', 'hospital', 'tratamento', 'dentista'], Accessory: AccessorySaude },
]

function detectOutroAccessory(name) {
  const normalized = stripAccents((name || '').toLowerCase())
  const match = OUTRO_THEMES.find(({ keywords }) =>
    keywords.some((keyword) => normalized.includes(stripAccents(keyword))),
  )
  return match?.Accessory ?? AccessoryOutro
}

const ACCESSORIES = {
  viagem: AccessoryViagem,
  casa: AccessoryCasa,
  manicure: AccessoryManicure,
  eletronico: AccessoryEletronico,
  presente: AccessoryPresente,
  emergencia: AccessoryEmergencia,
}

// progress: 0 a 100. type: um dos ids de GOAL_TYPES (lib/constants.js).
// name: nome da meta — só é usado quando type === 'outro', pra escolher um
// acessório temático (ver detectOutroAccessory).
export function GoalCat({ type = 'outro', progress = 0, name = '', className = '' }) {
  const fatness = clamp01(progress / 100)
  const mood = progress >= 100 ? 'joy' : progress < 15 ? 'sad' : 'happy'
  const Accessory = type === 'outro' ? detectOutroAccessory(name) : ACCESSORIES[type] ?? AccessoryOutro

  return (
    <svg
      viewBox="0 0 200 220"
      className={className}
      role="img"
      aria-label={`Gatinho da meta, ${Math.round(progress)}% guardado`}
    >
      <Cushion />
      <Tail fatness={fatness} />
      <Body fatness={fatness} />
      <BellyCrease fatness={fatness} />
      <Paws fatness={fatness} />
      <Ears />
      <Head mood={mood} fatness={fatness} />
      <Accessory />
      {progress >= 100 && <Sparkles />}
    </svg>
  )
}

export default GoalCat
