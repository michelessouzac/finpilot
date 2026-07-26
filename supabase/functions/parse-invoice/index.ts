import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXTRACT_TOOL = {
  name: "extract_transactions",
  description: "Registra os lançamentos encontrados na fatura de cartão de crédito.",
  input_schema: {
    type: "object",
    properties: {
      transactions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string", description: "Data no formato YYYY-MM-DD" },
            description: { type: "string", description: "Descrição do lançamento, como impressa na fatura" },
            amount: { type: "number", description: "Valor sempre positivo, em reais" },
            type: {
              type: "string",
              enum: ["entrada", "saida"],
              description: "'saida' para compras/débitos, 'entrada' para estornos/pagamentos/créditos",
            },
          },
          required: ["date", "description", "amount", "type"],
        },
      },
    },
    required: ["transactions"],
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  let payload: { lines?: unknown; referenceYear?: unknown; referenceMonth?: unknown };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json_body" }, 400);
  }

  const lines = Array.isArray(payload.lines) ? payload.lines.filter((l) => typeof l === "string") : [];
  const referenceYear = Number(payload.referenceYear);
  const referenceMonth = Number(payload.referenceMonth);

  if (lines.length === 0) {
    return jsonResponse({ error: "no_text_extracted" }, 400);
  }
  if (!Number.isInteger(referenceYear) || !Number.isInteger(referenceMonth)) {
    return jsonResponse({ error: "invalid_reference_month" }, 400);
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "missing_anthropic_api_key" }, 500);
  }

  const text = lines.join("\n");
  const referenceLabel = `${String(referenceMonth).padStart(2, "0")}/${referenceYear}`;

  const systemPrompt = [
    "Você extrai lançamentos de faturas de cartão de crédito brasileiras a partir do texto bruto extraído de um PDF.",
    "O texto pode vir com colunas desalinhadas, quebras estranhas ou em qualquer banco emissor (Nubank, Itaú, Bradesco, Santander, Caixa, Banco do Brasil, C6, Inter, etc).",
    `A fatura de referência é ${referenceLabel}. Linhas com dia/mês sem ano pertencem a esse mês ou aos ~30 dias antes do fechamento.`,
    "Ignore linhas que não são lançamentos: saldo anterior, limite disponível/total, total da fatura, subtotal, valor mínimo, cabeçalhos, rodapés, números de página.",
    "Pagamentos recebidos e estornos são 'entrada'; compras e demais débitos são 'saida'. Valor sempre positivo.",
    "Se um lançamento for parcela (ex: '3/10' ou 'Parcela 3 de 10'), mantenha essa marcação dentro da própria descrição.",
    "Use a ferramenta extract_transactions para registrar sua resposta. Se não encontrar nenhum lançamento, chame a ferramenta com uma lista vazia.",
  ].join(" ");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Texto extraído da fatura:\n\n${text}`,
        },
      ],
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extract_transactions" },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("anthropic_error", response.status, errorBody);
    return jsonResponse({ error: "anthropic_request_failed" }, 502);
  }

  const data = await response.json();
  const toolUse = (data.content ?? []).find((block: { type: string }) => block.type === "tool_use");
  const transactions = toolUse?.input?.transactions;

  if (!Array.isArray(transactions)) {
    return jsonResponse({ error: "unexpected_model_response" }, 502);
  }

  return jsonResponse({ transactions });
});
