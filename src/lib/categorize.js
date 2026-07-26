// Chuta a categoria de uma compra pelo nome do estabelecimento (a fatura
// não diz a categoria, só o nome). É só um palpite inicial — quando não
// reconhece nada, cai em "diversos" e a pessoa corrige na Caixa de entrada.
const KEYWORD_CATEGORIES = [
  [
    'alimentacao',
    [
      'IFOOD',
      'RAPPI',
      'MERCADO',
      'SUPERMERCADO',
      'HORTIFRUTI',
      'ACOUGUE',
      'PADARIA',
      'RESTAURANTE',
      'PIZZARIA',
      'PIZZA',
      'LANCHONETE',
      'HAMBURGUERIA',
      'BURGER',
      'MCDONALD',
      'HABIBS',
      'SUBWAY',
      'STARBUCKS',
      'CAFE',
      'PADOCA',
      'EMPORIO',
      'DELIVERY',
      'BAR ',
      'BEBIDA',
      'SORVETERIA',
    ],
  ],
  [
    'transporte',
    [
      'UBER',
      '99APP',
      '99POP',
      'TAXI',
      'POSTO',
      'COMBUSTIVEL',
      'ESTACIONAMENTO',
      'PEDAGIO',
      'SEM PARAR',
      'METRO',
      'ONIBUS',
      'LOCALIZA',
      'MOVIDA',
      'UNIDAS',
      'BILHETE UNICO',
    ],
  ],
  [
    'lazer',
    [
      'NETFLIX',
      'SPOTIFY',
      'DISNEY',
      'HBO',
      'PRIME VIDEO',
      'AMAZON PRIME',
      'YOUTUBE PREMIUM',
      'DEEZER',
      'CINEMA',
      'INGRESSO',
      'STEAM',
      'PLAYSTATION',
      'XBOX',
      'NINTENDO',
      'TEATRO',
      'SHOW',
      'BALADA',
    ],
  ],
  [
    'contas-fixas',
    [
      'ENERGIA',
      'ELETRICA',
      'SANEAMENTO',
      'AGUA E ESGOTO',
      'INTERNET',
      'TELEFONIA',
      'CLARO',
      'VIVO',
      'TIM ',
      'OI FIBRA',
      'ALUGUEL',
      'CONDOMINIO',
      'ACADEMIA',
      'SMARTFIT',
      'SEGURO',
      'PLANO DE SAUDE',
      'MENSALIDADE',
    ],
  ],
]

// `normalizedDescription` já vem em maiúsculas/sem acento (ver
// invoiceParser.normalizeDescription). `categories` é a lista de categorias
// da pessoa — só sugere um id que exista de fato nessa lista.
export function guessCategory(normalizedDescription, categories) {
  const availableIds = new Set((categories ?? []).map((c) => c.id))

  for (const [categoryId, keywords] of KEYWORD_CATEGORIES) {
    if (!availableIds.has(categoryId)) continue
    if (keywords.some((keyword) => normalizedDescription.includes(keyword))) {
      return categoryId
    }
  }

  return availableIds.has('diversos') ? 'diversos' : null
}
