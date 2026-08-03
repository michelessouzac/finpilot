// Gera o connect_token que o widget Pluggy Connect precisa pra abrir.
// O CLIENT_SECRET da Pluggy só existe aqui (nunca no front) — a pessoa logada
// só recebe de volta um token de curta duração, específico pra ela.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

  // itemId opcional: só vem preenchido quando é pra reconectar uma conexão
  // que expirou/deu erro, em vez de criar uma conexão nova do zero.
  let itemId: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.itemId === "string") itemId = body.itemId;
  } catch {
    // corpo vazio é válido (fluxo de primeira conexão)
  }

  const clientId = Deno.env.get("PLUGGY_CLIENT_ID");
  const clientSecret = Deno.env.get("PLUGGY_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return jsonResponse({ error: "missing_pluggy_credentials" }, 500);
  }

  const authResponse = await fetch("https://api.pluggy.ai/auth", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!authResponse.ok) {
    console.error("pluggy_auth_failed", authResponse.status, await authResponse.text());
    return jsonResponse({ error: "pluggy_auth_failed" }, 502);
  }
  const { apiKey } = await authResponse.json();

  const tokenResponse = await fetch("https://api.pluggy.ai/connect_token", {
    method: "POST",
    headers: { "content-type": "application/json", "X-API-KEY": apiKey },
    body: JSON.stringify({
      ...(itemId ? { itemId } : {}),
      options: { clientUserId: userId },
    }),
  });
  if (!tokenResponse.ok) {
    console.error("pluggy_connect_token_failed", tokenResponse.status, await tokenResponse.text());
    return jsonResponse({ error: "pluggy_connect_token_failed" }, 502);
  }
  const { accessToken } = await tokenResponse.json();

  return jsonResponse({ connectToken: accessToken });
});
