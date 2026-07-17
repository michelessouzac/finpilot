import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Target, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [{ title: "Metas — FinPilot" }] }),
  component: Goals,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Goals() {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [open, setOpen] = useState(false);
  const [fundOpen, setFundOpen] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState("");

  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("saving_goals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const t = parseFloat(target.replace(",", "."));
      if (!title.trim() || !t || t <= 0) throw new Error("Preencha corretamente");
      const { error } = await supabase.from("saving_goals").insert({
        user_id: user.id, title, target_amount: t, deadline: deadline || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meta criada");
      setTitle(""); setTarget(""); setDeadline(""); setOpen(false);
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: e => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const addFunds = useMutation({
    mutationFn: async ({ id, amount, current }: { id: string; amount: number; current: number }) => {
      const { error } = await supabase.from("saving_goals").update({ current_amount: current + amount }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fundos adicionados");
      setFundOpen(null); setFundAmount("");
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saving_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Meta excluída"); qc.invalidateQueries({ queryKey: ["goals"] }); },
  });

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Metas de economia"
        subtitle="Defina objetivos e acompanhe seu progresso"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" />Nova meta</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova meta</DialogTitle></DialogHeader>
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); create.mutate(); }}>
                <div className="space-y-2"><Label>Título</Label><Input value={title} onChange={e => setTitle(e.target.value)} required placeholder="Viagem para o Japão" /></div>
                <div className="space-y-2"><Label>Valor alvo (R$)</Label><Input type="number" step="0.01" value={target} onChange={e => setTarget(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Prazo (opcional)</Label><Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></div>
                <DialogFooter><Button type="submit" disabled={create.isPending}>Criar meta</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {goals.length === 0 ? (
        <Card className="p-12 text-center">
          <Target className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Você ainda não tem metas</h3>
          <p className="text-sm text-muted-foreground">Crie sua primeira meta para começar a economizar com propósito.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(g => {
            const cur = Number(g.current_amount);
            const tgt = Number(g.target_amount);
            const pct = Math.min(100, (cur / tgt) * 100);
            return (
              <Card key={g.id} className="p-6">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{g.title}</h3>
                    {g.deadline && <p className="text-xs text-muted-foreground">Até {format(new Date(g.deadline), "dd/MM/yyyy")}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(g.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{brl(cur)}</span>
                    <span className="text-muted-foreground">{brl(tgt)}</span>
                  </div>
                  <Progress value={pct} />
                  <p className="text-xs text-muted-foreground mt-1">{pct.toFixed(0)}% concluído</p>
                </div>
                <Dialog open={fundOpen === g.id} onOpenChange={o => setFundOpen(o ? g.id : null)}>
                  <DialogTrigger asChild><Button variant="outline" className="w-full">Adicionar fundos</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Adicionar fundos a "{g.title}"</DialogTitle></DialogHeader>
                    <form className="space-y-4" onSubmit={e => {
                      e.preventDefault();
                      const a = parseFloat(fundAmount.replace(",", "."));
                      if (!a || a <= 0) return toast.error("Valor inválido");
                      addFunds.mutate({ id: g.id, amount: a, current: cur });
                    }}>
                      <div className="space-y-2"><Label>Valor (R$)</Label><Input type="number" step="0.01" value={fundAmount} onChange={e => setFundAmount(e.target.value)} required autoFocus /></div>
                      <DialogFooter><Button type="submit" disabled={addFunds.isPending}>Adicionar</Button></DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
