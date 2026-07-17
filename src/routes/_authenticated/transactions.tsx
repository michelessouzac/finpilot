import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/transactions")({
  head: () => ({ meta: [{ title: "Lançamentos — FinPilot" }] }),
  component: Transactions,
});

const CATEGORIES = ["Moradia", "Alimentação", "Transporte", "Lazer", "Salário", "Saúde", "Educação", "Outros"];
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Transactions() {
  const qc = useQueryClient();
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Outros");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const { data: txs = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false }).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const parsed = parseFloat(amount.replace(",", "."));
      if (!parsed || parsed <= 0) throw new Error("Valor inválido");
      const { error } = await supabase.from("transactions").insert({
        user_id: user.id, type, category, amount: parsed, date, description: description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lançamento salvo");
      setAmount(""); setDescription("");
      qc.invalidateQueries();
    },
    onError: e => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Excluído"); qc.invalidateQueries(); },
  });

  const filtered = txs.filter(t => filter === "all" || t.type === filter);

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      <PageHeader title="Lançamentos" subtitle="Registre receitas e despesas" />

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        <Card className="p-6 h-fit">
          <h2 className="font-semibold mb-4">Novo lançamento</h2>
          <form className="space-y-4" onSubmit={e => { e.preventDefault(); addMut.mutate(); }}>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setType("expense")}
                className={`p-3 rounded-lg border text-sm font-medium transition ${type === "expense" ? "bg-destructive/15 border-destructive text-destructive" : "border-border text-muted-foreground"}`}>
                Despesa
              </button>
              <button type="button" onClick={() => setType("income")}
                className={`p-3 rounded-lg border text-sm font-medium transition ${type === "income" ? "bg-primary/15 border-primary text-primary" : "border-border text-muted-foreground"}`}>
                Receita
              </button>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" required value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} maxLength={200} />
            </div>
            <Button type="submit" className="w-full" disabled={addMut.isPending}>Salvar lançamento</Button>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold">Histórico</h2>
            <div className="flex gap-1 p-1 bg-muted rounded-lg text-xs">
              {(["all", "income", "expense"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded font-medium ${filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {f === "all" ? "Todos" : f === "income" ? "Receitas" : "Despesas"}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}
            {!isLoading && filtered.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">Nenhum lançamento.</div>}
            {filtered.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/60 transition">
                <div className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 ${t.type === "income" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                  {t.type === "income" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{t.category}{t.description ? ` · ${t.description}` : ""}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(t.date), "dd/MM/yyyy")}</div>
                </div>
                <div className={`font-semibold shrink-0 ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                  {t.type === "income" ? "+" : "−"}{brl(Number(t.amount))}
                </div>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => delMut.mutate(t.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
