// Busca (na Pluggy) as contas e transações de um item conectado e grava no
// Supabase. Chamada pelo front logo depois que a pessoa conecta o banco no
// widget, e também pode ser chamada de novo (botão "Sincronizar") a qualquer
// momento. Sincroniza contas do tipo BANK (corrente/poupança) como conta
// normal, e CREDIT (cartão) como conta tipo "cartao" — o fechamento de
// fatura em si continua sendo o mesmo efeito automático que já existe pra
// cartão manual/importado (App.jsx: fatura fechada vira conta a pagar
// sozinha, a partir de accounts.closingDay/dueDay + transactions), então
// aqui só precisamos gravar a conta e os lançamentos certos.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { guessCategory, normalizeDescription } from "./categorize.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function pluggyFetch(path: string, apiKey: string) {
  const response = await fetch(`https://api.pluggy.ai${path}`, {
    headers: { "X-API-KEY": apiKey },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`pluggy_request_failed:${path}:${response.status}:${body}`);
  }
  return response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }
  const userId = userData.user.id;

  let itemId: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.itemId === "string") itemId = body.itemId;
  } catch {
    // corpo ausente/ inválido -> cai no 400 abaixo
  }
  if (!itemId) {
    return jsonResponse({ error: "missing_item_id" }, 400);
  }

  const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
  const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return jsonResponse({ error: "missing_pluggy_credentials" }, 500);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let apiKey: string;
  try {
    const authResponse = await fetch("https://api.pluggy.ai/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    if (!authResponse.ok) throw new Error(await authResponse.text());
    apiKey = (await authResponse.json()).apiKey;
  } catch (err) {
    console.error("pluggy_auth_failed", err);
    return jsonResponse({ error: "pluggy_auth_failed" }, 502);
  }

  let item: { connector?: { name?: string; imageUrl?: string }; status?: string };
  let pluggyAccounts: any[];
  try {
    item = await pluggyFetch(`/items/${itemId}`, apiKey);
    const accountsData = await pluggyFetch(`/accounts?itemId=${itemId}`, apiKey);
    pluggyAccounts = accountsData.results ?? [];
  } catch (err) {
    console.error("pluggy_fetch_failed", err);
    return jsonResponse({ error: "pluggy_fetch_failed" }, 502);
  }

  // Item pertence à pessoa logada — cria na primeira sincronização, ou só
  // atualiza status/última sincronização se já existir.
  const { error: itemUpsertError } = await admin.from("open_finance_items").upsert(
    {
      user_id: userId,
      item_id: itemId,
      connector_name: item.connector?.name ?? null,
      connector_image_url: item.connector?.imageUrl ?? null,
      status: item.status ?? "UPDATED",
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "item_id" },
  );
  if (itemUpsertError) {
    console.error("open_finance_items_upsert_failed", itemUpsertError);
    return jsonResponse({ error: "database_error" }, 500);
  }

  const bankAccounts = pluggyAccounts.filter((a) => a.type === "BANK");
  const creditAccounts = pluggyAccounts.filter((a) => a.type === "CREDIT");

  const [{ data: existingAccounts }, { data: categoryRows }] = await Promise.all([
    admin.from("accounts").select("id, data").eq("user_id", userId),
    admin.from("categories").select("id, data").eq("user_id", userId),
  ]);
  const categories = (categoryRows ?? []).map((r) => ({ id: r.id, ...r.data }));

  let accountsCreated = 0;
  let transactionsInserted = 0;

  // Busca (com paginação por cursor) e grava as transações novas de uma
  // conta, pulando as que já foram importadas antes (via
  // openFinanceTransactionId). Serve pra conta banco e cartão, mas o sinal do
  // valor tem convenção OPOSTA entre os dois na Pluggy: num extrato de banco
  // negativo é saída de dinheiro; numa fatura de cartão negativo é
  // pagamento/estorno (ou seja, o que reduz a fatura, "entrada" no sentido do
  // FinPilot) e positivo é compra nova ("saida").
  async function syncAccountTransactions(
    pluggyAccountId: string,
    localAccountId: string,
    accountKind: "BANK" | "CREDIT",
  ) {
    const pluggyTransactions: any[] = [];
    let cursor: string | undefined;
    do {
      const query = new URLSearchParams({ accountId: pluggyAccountId });
      if (cursor) query.set("cursor", cursor);
      let txData;
      try {
        txData = await pluggyFetch(`/v2/transactions?${query.toString()}`, apiKey);
      } catch (err) {
        console.error("pluggy_transactions_failed", err);
        break;
      }
      pluggyTransactions.push(...(txData.results ?? []));
      cursor = txData.next ?? undefined;
    } while (cursor);

    const { data: existingTx } = await admin
      .from("transactions")
      .select("data")
      .eq("user_id", userId)
      .eq("data->>accountId", localAccountId);
    const existingIds = new Set(
      (existingTx ?? []).map((t) => t.data?.openFinanceTransactionId).filter(Boolean),
    );

    const newRows = pluggyTransactions
      .filter((t) => !existingIds.has(t.id))
      .map((t) => {
        const description = t.description || "Lançamento";
        const normalized = normalizeDescription(description);
        const negative = Number(t.amount) < 0;
        const type = accountKind === "CREDIT" ? (negative ? "entrada" : "saida") : negative ? "saida" : "entrada";
        const installmentNumber = t.creditCardMetadata?.installmentNumber;
        const totalInstallments = t.creditCardMetadata?.totalInstallments;
        const installment =
          installmentNumber && totalInstallments && totalInstallments > 1
            ? { index: installmentNumber, total: totalInstallments }
            : null;
        return {
          id: crypto.randomUUID(),
          user_id: userId,
          data: {
            description,
            amount: Math.abs(Number(t.amount) || 0),
            type,
            date: String(t.date).slice(0, 10),
            accountId: localAccountId,
            recurring: false,
            installment,
            category: guessCategory(normalized, categories),
            source: "open_finance",
            openFinanceTransactionId: t.id,
          },
        };
      });

    if (newRows.length === 0) return 0;
    const { error } = await admin.from("transactions").insert(newRows);
    if (error) {
      console.error("transactions_insert_failed", error);
      return 0;
    }
    return newRows.length;
  }

  for (const pAccount of bankAccounts) {
    let accountId = (existingAccounts ?? []).find(
      (a) => a.data?.openFinance?.accountId === pAccount.id,
    )?.id;

    if (!accountId) {
      accountId = crypto.randomUUID();
      const { error } = await admin.from("accounts").insert({
        id: accountId,
        user_id: userId,
        data: {
          name: pAccount.name || item.connector?.name || "Conta conectada",
          type: "corrente",
          amount: 0,
          source: "open_finance",
          openFinance: { itemId, accountId: pAccount.id },
        },
      });
      if (error) {
        console.error("account_insert_failed", error);
        continue;
      }
      accountsCreated++;
    }

    transactionsInserted += await syncAccountTransactions(pAccount.id, accountId, "BANK");

    // Recalibra o "saldo de partida" da conta pra que
    // amount + soma(lançamentos) bata com o saldo real informado pela Pluggy
    // agora — assim o saldo mostrado no FinPilot fica sempre igual ao do
    // banco, mesmo sem ter o histórico completo desde a abertura da conta.
    const { data: allTxForAccount } = await admin
      .from("transactions")
      .select("data")
      .eq("user_id", userId)
      .eq("data->>accountId", accountId);
    const net = (allTxForAccount ?? []).reduce((sum, t) => {
      const amount = Number(t.data?.amount) || 0;
      return sum + (t.data?.type === "entrada" ? amount : -amount);
    }, 0);
    const calibratedAmount = (Number(pAccount.balance) || 0) - net;

    const currentData = (existingAccounts ?? []).find((a) => a.id === accountId)?.data ?? {};
    await admin
      .from("accounts")
      .update({
        data: {
          ...currentData,
          name: pAccount.name || currentData.name || item.connector?.name || "Conta conectada",
          type: "corrente",
          amount: calibratedAmount,
          source: "open_finance",
          openFinance: { itemId, accountId: pAccount.id },
        },
      })
      .eq("id", accountId);
  }

  for (const pAccount of creditAccounts) {
    let accountId = (existingAccounts ?? []).find(
      (a) => a.data?.openFinance?.accountId === pAccount.id,
    )?.id;

    const creditData = pAccount.creditData ?? {};
    // A Pluggy manda a data completa do fechamento/vencimento da fatura em
    // aberto agora — só o dia do mês interessa aqui, porque é isso que o
    // FinPilot usa pra calcular qualquer período de fatura, passado ou
    // futuro (ver invoicePeriod em lib/invoices.js), não só o atual.
    const closeDay = creditData.balanceCloseDate ? new Date(creditData.balanceCloseDate).getUTCDate() : null;
    const dueDay = creditData.balanceDueDate ? new Date(creditData.balanceDueDate).getUTCDate() : null;

    if (!accountId) {
      accountId = crypto.randomUUID();
      const { error } = await admin.from("accounts").insert({
        id: accountId,
        user_id: userId,
        data: {
          name: pAccount.name || item.connector?.name || "Cartão conectado",
          type: "cartao",
          amount: creditData.creditLimit ?? 0,
          closingDay: closeDay ?? 25,
          dueDay: dueDay ?? 10,
          // A Pluggy não informa de qual conta sai o pagamento da fatura —
          // isso fica em branco até a pessoa escolher manualmente (editar o
          // cartão); só a partir daí o FinPilot fecha a fatura sozinho.
          paymentAccountId: null,
          source: "open_finance",
          openFinance: { itemId, accountId: pAccount.id },
        },
      });
      if (error) {
        console.error("card_account_insert_failed", error);
        continue;
      }
      accountsCreated++;
    }

    transactionsInserted += await syncAccountTransactions(pAccount.id, accountId, "CREDIT");

    const currentData = (existingAccounts ?? []).find((a) => a.id === accountId)?.data ?? {};
    await admin
      .from("accounts")
      .update({
        data: {
          ...currentData,
          name: pAccount.name || currentData.name || item.connector?.name || "Cartão conectado",
          type: "cartao",
          amount: creditData.creditLimit ?? currentData.amount ?? 0,
          closingDay: closeDay ?? currentData.closingDay ?? 25,
          dueDay: dueDay ?? currentData.dueDay ?? 10,
          source: "open_finance",
          openFinance: { itemId, accountId: pAccount.id },
        },
      })
      .eq("id", accountId);
  }

  return jsonResponse({
    ok: true,
    accountsSynced: bankAccounts.length,
    cardsSynced: creditAccounts.length,
    accountsCreated,
    transactionsInserted,
    accountsSkipped: pluggyAccounts.length - bankAccounts.length - creditAccounts.length,
  });
});
