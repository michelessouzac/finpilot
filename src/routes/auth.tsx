import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Wallet, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — FinPilot" },
      { name: "description", content: "Acesse sua conta FinPilot." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [income, setIncome] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.user) {
          const parsed = parseFloat(income.replace(",", ".")) || 0;
          await supabase.from("profiles").update({ monthly_income: parsed }).eq("id", data.user.id);
        }
        toast.success("Conta criada!");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) { toast.error("Falha no Google Sign-in"); setLoading(false); return; }
    if (!r.redirected) navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 grid place-items-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tight">FinPilot</span>
          </div>
          <p className="text-muted-foreground text-sm">Controle financeiro inteligente</p>
        </div>

        <Card className="p-6 backdrop-blur-sm bg-card/90">
          <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >Entrar</button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >Criar conta</button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="income">Renda mensal (R$)</Label>
                <Input id="income" type="number" step="0.01" value={income} onChange={e => setIncome(e.target.value)} placeholder="5000,00" />
                <p className="text-xs text-muted-foreground">Você pode ajustar isso depois.</p>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              <Wallet className="w-4 h-4 mr-2" />
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={google} disabled={loading}>
            Continuar com Google
          </Button>
        </Card>
      </div>
    </div>
  );
}
