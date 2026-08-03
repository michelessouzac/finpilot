// Cópia enxuta de src/lib/categorize.js + normalizeDescription
// (src/lib/invoiceParser.js) pro runtime Deno da Edge Function — mesmo
// critério usado pra sugerir categoria na importação de fatura em PDF, agora
// aplicado às transações que chegam via Open Finance.

function stripDiacritics(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizeDescription(text: string) {
  return stripDiacritics(text.toUpperCase())
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const KEYWORD_CATEGORIES: [string, string[]][] = [
  [
    "alimentacao",
    [
      "IFOOD", "RAPPI", "MERCADO", "SUPERMERCADO", "HORTIFRUTI", "ACOUGUE", "PADARIA",
      "RESTAURANTE", "PIZZARIA", "PIZZA", "LANCHONETE", "HAMBURGUERIA", "BURGER",
      "MCDONALD", "HABIBS", "SUBWAY", "STARBUCKS", "CAFE", "PADOCA", "EMPORIO",
      "DELIVERY", "BAR ", "BEBIDA", "SORVETERIA",
    ],
  ],
  [
    "transporte",
    [
      "UBER", "99APP", "99POP", "TAXI", "POSTO", "COMBUSTIVEL", "ESTACIONAMENTO",
      "PEDAGIO", "SEM PARAR", "METRO", "ONIBUS", "LOCALIZA", "MOVIDA", "UNIDAS",
      "BILHETE UNICO",
    ],
  ],
  [
    "lazer",
    [
      "NETFLIX", "SPOTIFY", "DISNEY", "HBO", "PRIME VIDEO", "AMAZON PRIME",
      "YOUTUBE PREMIUM", "DEEZER", "CINEMA", "INGRESSO", "STEAM", "PLAYSTATION",
      "XBOX", "NINTENDO", "TEATRO", "SHOW", "BALADA",
    ],
  ],
  [
    "contas-fixas",
    [
      "ENERGIA", "ELETRICA", "SANEAMENTO", "AGUA E ESGOTO", "INTERNET", "TELEFONIA",
      "CLARO", "VIVO", "TIM ", "OI FIBRA", "ALUGUEL", "CONDOMINIO", "ACADEMIA",
      "SMARTFIT", "SEGURO", "PLANO DE SAUDE", "MENSALIDADE",
    ],
  ],
];

export function guessCategory(
  normalizedDescription: string,
  categories: { id: string }[],
): string | null {
  const availableIds = new Set((categories ?? []).map((c) => c.id));

  for (const [categoryId, keywords] of KEYWORD_CATEGORIES) {
    if (!availableIds.has(categoryId)) continue;
    if (keywords.some((keyword) => normalizedDescription.includes(keyword))) {
      return categoryId;
    }
  }

  return availableIds.has("diversos") ? "diversos" : null;
}
