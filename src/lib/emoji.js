// Escolhe automaticamente um emoji a partir do nome que a pessoa digitou —
// "Cartão de crédito" vira 💳, "Uber" vira 🚕, "Pet" vira 🐾. Antes toda
// categoria criada na mão nascia com o 🏷️ genérico.
//
// O vocabulário abaixo segue o catálogo Apple (https://smallseotools.com/pt/emojis/apple/),
// que é a referência usada no projeto pra escolher emojis. São caracteres
// Unicode padrão, então o iPhone/Mac renderiza no estilo Apple e os outros
// sistemas no estilo deles. A lista fica embutida de propósito: a página é
// estática (sem API) e a busca precisa funcionar offline, no instante em que
// a pessoa digita.

// Palavras compostas primeiro: "conta de luz" precisa ganhar de "conta".
const COMPOUND_KEYWORDS = {
  'cartao de credito': '💳',
  'cartao de debito': '💳',
  'conta de luz': '💡',
  'conta de agua': '💧',
  'conta de gas': '🔥',
  'plano de saude': '🏥',
  'reserva de emergencia': '🛟',
  'material escolar': '✏️',
  'vale refeicao': '🍽️',
  'vale alimentacao': '🛒',
  'material de limpeza': '🧽',
  'seguro do carro': '🛡️',
  'cesta basica': '🛒',
  'salao de beleza': '💇',
}

const KEYWORDS = {
  // Dinheiro e banco
  cartao: '💳',
  credito: '💳',
  debito: '💳',
  dinheiro: '💵',
  salario: '💰',
  renda: '💰',
  pagamento: '💸',
  pix: '📲',
  boleto: '🧾',
  fatura: '🧾',
  nota: '🧾',
  imposto: '🧾',
  banco: '🏦',
  conta: '🏦',
  investimento: '📈',
  acao: '📈',
  lucro: '📈',
  poupanca: '🐷',
  economia: '🐷',
  reserva: '🛟',
  emergencia: '🚨',
  divida: '📉',
  juros: '📉',
  emprestimo: '🤝',
  financiamento: '🏦',
  meta: '🎯',
  objetivo: '🎯',
  orcamento: '📊',
  grafico: '📊',
  relatorio: '📊',
  planilha: '📊',

  // Casa
  aluguel: '🏠',
  casa: '🏠',
  moradia: '🏠',
  lar: '🏠',
  condominio: '🏢',
  apartamento: '🏢',
  luz: '💡',
  energia: '⚡',
  agua: '💧',
  gas: '🔥',
  internet: '🌐',
  wifi: '📶',
  telefone: '📞',
  celular: '📱',
  tv: '📺',
  streaming: '📺',
  netflix: '🎬',
  spotify: '🎵',
  limpeza: '🧹',
  faxina: '🧹',
  movel: '🛋️',
  decoracao: '🪴',
  reforma: '🔨',
  construcao: '🏗️',
  seguro: '🛡️',
  mudanca: '📦',

  // Alimentação
  alimentacao: '🍽️',
  comida: '🍽️',
  almoco: '🍽️',
  jantar: '🍽️',
  restaurante: '🍽️',
  mercado: '🛒',
  supermercado: '🛒',
  feira: '🥬',
  hortifruti: '🥬',
  padaria: '🥐',
  cafe: '☕',
  lanche: '🍔',
  lanchonete: '🍔',
  hamburguer: '🍔',
  pizza: '🍕',
  sushi: '🍣',
  sorvete: '🍦',
  doce: '🍬',
  bolo: '🍰',
  bebida: '🥤',
  cerveja: '🍺',
  vinho: '🍷',
  churrasco: '🍖',
  delivery: '🛵',
  ifood: '🛵',

  // Transporte e viagem
  transporte: '🚗',
  carro: '🚗',
  ipva: '🚗',
  combustivel: '⛽',
  gasolina: '⛽',
  posto: '⛽',
  uber: '🚕',
  taxi: '🚕',
  onibus: '🚌',
  metro: '🚇',
  trem: '🚆',
  bicicleta: '🚲',
  moto: '🏍️',
  estacionamento: '🅿️',
  pedagio: '🛣️',
  multa: '🚨',
  mecanico: '🔧',
  oficina: '🔧',
  passagem: '🎫',
  aviao: '✈️',
  viagem: '✈️',
  hotel: '🏨',
  ferias: '🏖️',
  praia: '🏖️',
  camping: '🏕️',

  // Saúde e bem-estar
  saude: '🏥',
  hospital: '🏥',
  medico: '🩺',
  consulta: '🩺',
  dentista: '🦷',
  farmacia: '💊',
  remedio: '💊',
  exame: '🧪',
  vacina: '💉',
  psicologo: '🧠',
  terapia: '🧠',
  academia: '🏋️',
  treino: '🏋️',
  yoga: '🧘',
  meditacao: '🧘',
  corrida: '🏃',
  sono: '😴',

  // Beleza e pessoal
  beleza: '💄',
  maquiagem: '💄',
  cabelo: '💇',
  cabeleireiro: '💇',
  salao: '💇',
  manicure: '💅',
  unha: '💅',
  barbeiro: '💈',
  perfume: '🧴',
  roupa: '👕',
  vestuario: '👕',
  sapato: '👟',
  tenis: '👟',
  bolsa: '👜',
  joia: '💍',
  relogio: '⌚',
  oculos: '👓',

  // Educação
  educacao: '🎓',
  faculdade: '🎓',
  formatura: '🎓',
  escola: '🏫',
  curso: '📚',
  livro: '📚',
  estudo: '📚',
  leitura: '📖',
  aula: '📖',
  idioma: '🗣️',

  // Lazer
  lazer: '🎉',
  festa: '🎉',
  cinema: '🎬',
  filme: '🎬',
  show: '🎤',
  musica: '🎵',
  jogo: '🎮',
  game: '🎮',
  presente: '🎁',
  aniversario: '🎂',
  natal: '🎄',
  hobby: '🎨',
  arte: '🎨',
  foto: '📷',
  esporte: '⚽',
  futebol: '⚽',
  bar: '🍻',
  passeio: '🎡',

  // Família e pets
  familia: '👨‍👩‍👧',
  filho: '👶',
  bebe: '👶',
  crianca: '🧒',
  pet: '🐾',
  cachorro: '🐶',
  gato: '🐱',
  veterinario: '🐾',
  racao: '🦴',

  // Trabalho e compras
  trabalho: '💼',
  freela: '💼',
  freelance: '💼',
  escritorio: '🏢',
  empresa: '🏢',
  cliente: '🤝',
  projeto: '📋',
  reuniao: '📅',
  agenda: '📅',
  calendario: '📅',
  email: '📧',
  marketing: '📣',
  compra: '🛍️',
  venda: '🛍️',
  loja: '🏪',
  shopping: '🛍️',
  assinatura: '🔁',
  software: '💻',
  computador: '💻',
  notebook: '💻',
  eletronico: '📱',
  tecnologia: '💻',

  // Rotina e diversos
  tarefa: '✅',
  lembrete: '⏰',
  prazo: '⏰',
  rotina: '🔁',
  habito: '🔁',
  ideia: '💡',
  urgente: '🚨',
  importante: '⭐',
  doacao: '❤️',
  caridade: '❤️',
  igreja: '⛪',
  seguranca: '🔒',
  diversos: '📦',
  outro: '📦',
  geral: '📦',
}

export const FALLBACK_EMOJI = '🏷️'

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Plurais do português não são só "+s": cartões → cartão, viagens → viagem.
// Geramos os candidatos possíveis e testamos todos no dicionário.
function singularCandidates(word) {
  const out = [word]
  if (word.length > 3 && word.endsWith('s')) {
    out.push(word.slice(0, -1))
    if (word.endsWith('oes') || word.endsWith('aes')) out.push(`${word.slice(0, -3)}ao`)
    if (word.endsWith('ais')) out.push(`${word.slice(0, -3)}al`)
    if (word.endsWith('eis')) out.push(`${word.slice(0, -3)}el`)
    if (word.endsWith('ns')) out.push(`${word.slice(0, -2)}m`)
    if (word.length > 4 && word.endsWith('es')) out.push(word.slice(0, -2))
  }
  return out
}

/**
 * Devolve o emoji que combina com o texto ("Cartão de crédito" → 💳).
 * Cai no 🏷️ quando não reconhece nenhuma palavra.
 */
export function emojiForLabel(text, fallback = FALLBACK_EMOJI) {
  const normalized = normalize(text)
  if (!normalized) return fallback

  for (const [keyword, emoji] of Object.entries(COMPOUND_KEYWORDS)) {
    if (normalized.includes(keyword)) return emoji
  }

  for (const token of normalized.split(' ')) {
    for (const candidate of singularCandidates(token)) {
      const emoji = KEYWORDS[candidate]
      if (emoji) return emoji
    }
  }

  return fallback
}

/**
 * Troca o 🏷️ genérico pelo emoji certo nas categorias criadas antes da escolha
 * automática existir. Roda a cada carregamento, mas só mexe em quem está com o
 * genérico (ou sem emoji nenhum) — categoria que já tem emoji próprio fica como
 * está, e o que continua sem correspondência no dicionário segue no 🏷️.
 * Devolve o mesmo array quando não há nada a mudar.
 */
export function upgradeCategoryEmojis(categories) {
  let changed = false
  const next = categories.map((category) => {
    if (category.emoji && category.emoji !== FALLBACK_EMOJI) return category
    const emoji = emojiForLabel(category.label)
    if (emoji === category.emoji) return category
    changed = true
    return { ...category, emoji }
  })
  return changed ? next : categories
}
