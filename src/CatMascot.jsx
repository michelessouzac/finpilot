// Finny, o mascote do FinPilot: gatinho preto e gordinho espiando por cima
// de uma superfície (estilo de referência em aula-2/mascote.PNG). Cada
// variante troca só o "acessório" da pose pra combinar com a tela atual,
// mantendo cabeça, orelhas, bigodes e a superfície sempre iguais.

function Ears() {
  return (
    <>
      <path d="M42 74 L34 34 L78 60 Z" fill="#1E1E1E" />
      <path d="M158 74 L166 34 L122 60 Z" fill="#1E1E1E" />
    </>
  )
}

function Head() {
  return (
    <>
      <ellipse cx="100" cy="96" rx="66" ry="60" fill="#1E1E1E" />
      <ellipse cx="44" cy="112" rx="16" ry="20" fill="#1E1E1E" />
      <ellipse cx="156" cy="112" rx="16" ry="20" fill="#1E1E1E" />
    </>
  )
}

function Eyes() {
  return (
    <>
      <circle cx="76" cy="92" r="16" fill="#FBFBFB" />
      <circle cx="124" cy="92" r="16" fill="#FBFBFB" />
      <circle cx="78.5" cy="94" r="7" fill="#1E1E1E" />
      <circle cx="126.5" cy="94" r="7" fill="#1E1E1E" />
      <circle cx="81.5" cy="91" r="2.2" fill="#FBFBFB" />
      <circle cx="129.5" cy="91" r="2.2" fill="#FBFBFB" />
    </>
  )
}

function NoseAndWhiskers() {
  return (
    <>
      <path d="M100 108 L93 117 L107 117 Z" fill="#F9876F" />
      <g stroke="#636363" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <line x1="62" y1="112" x2="18" y2="106" />
        <line x1="62" y1="120" x2="18" y2="124" />
        <line x1="138" y1="112" x2="182" y2="106" />
        <line x1="138" y1="120" x2="182" y2="124" />
      </g>
    </>
  )
}

function Ledge({ fill = '#F9876F' }) {
  return <rect x="0" y="136" width="200" height="40" rx="16" fill={fill} />
}

function Paws() {
  return (
    <>
      <rect x="52" y="116" width="32" height="34" rx="16" fill="#1E1E1E" />
      <rect x="116" y="116" width="32" height="34" rx="16" fill="#1E1E1E" />
    </>
  )
}

// Pose padrão: só espiando por cima da superfície. Usada em telas mais
// "neutras" como Contas.
export function CatMascotPeek({ className = '' }) {
  return (
    <svg
      viewBox="0 0 200 176"
      className={className}
      role="img"
      aria-label="Finny, o mascote do FinPilot, espiando por cima de uma superfície"
    >
      <Ears />
      <Head />
      <Eyes />
      <NoseAndWhiskers />
      <Ledge />
      <Paws />
    </svg>
  )
}

// Pose de óculos: usada no Dashboard, transmitindo "analisando os números".
export function CatMascotGlasses({ className = '' }) {
  return (
    <svg
      viewBox="0 0 200 176"
      className={className}
      role="img"
      aria-label="Finny, o mascote do FinPilot, usando óculos e analisando o painel financeiro"
    >
      <Ears />
      <Head />
      <Eyes />
      <g fill="none" stroke="#FBFBFB" strokeWidth="3.5">
        <circle cx="76" cy="92" r="21" />
        <circle cx="124" cy="92" r="21" />
        <line x1="97" y1="90" x2="103" y2="90" />
      </g>
      <NoseAndWhiskers />
      <Ledge />
      <Paws />
    </svg>
  )
}

// Pose gastando: usada em Lançamentos, com uma sacolinha de compras e uma
// moeda "caindo" entre as patas, sobre a superfície.
export function CatMascotSpending({ className = '' }) {
  return (
    <svg
      viewBox="0 0 200 176"
      className={className}
      role="img"
      aria-label="Finny, o mascote do FinPilot, segurando uma sacola de compras"
    >
      <Ears />
      <Head />
      <Eyes />
      <NoseAndWhiskers />
      <Ledge />

      {/* moeda "caindo" antes da sacola */}
      <g opacity="0.8">
        <circle cx="100" cy="100" r="8" fill="none" stroke="#E38C92" strokeWidth="2.5" />
        <line x1="100" y1="76" x2="100" y2="86" stroke="#E38C92" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* sacola de compras apoiada na superfície, entre as patas */}
      <path
        d="M89 122 q0 -10 11 -10 q11 0 11 10"
        fill="none"
        stroke="#FBFBFB"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="84" y="120" width="32" height="26" rx="5" fill="#E38C92" />

      <Paws />
    </svg>
  )
}

// Pose de insight: uma lâmpada acesa sobre a cabeça, usada na tela de
// Insights, transmitindo "percebi algo sobre seus dados".
export function CatMascotSparkle({ className = '' }) {
  return (
    <svg
      viewBox="0 0 200 176"
      className={className}
      role="img"
      aria-label="Finny, o mascote do FinPilot, com uma lâmpada acesa sobre a cabeça"
    >
      <Ears />
      <Head />
      <Eyes />
      <NoseAndWhiskers />
      <Ledge />
      <Paws />

      {/* lâmpada acesa flutuando acima da cabeça */}
      <g>
        <circle cx="140" cy="34" r="12" fill="none" stroke="#F9876F" strokeWidth="3" />
        <path
          d="M140 46 v6 M133 54 h14"
          fill="none"
          stroke="#F9876F"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g stroke="#F9876F" strokeWidth="2.4" strokeLinecap="round">
          <line x1="140" y1="14" x2="140" y2="8" />
          <line x1="155" y1="20" x2="160" y2="15" />
          <line x1="161" y1="34" x2="167" y2="34" />
        </g>
      </g>
    </svg>
  )
}

export default CatMascotPeek
