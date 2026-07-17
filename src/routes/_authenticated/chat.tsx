import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "FinPilot AI — FinPilot" }] }),
  component: Chat,
});

function simulate(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("economizar") || q.includes("economia")) {
    return "Uma boa regra é 50/30/20: 50% em essenciais, 30% em desejos e 20% em poupança e investimentos. Comece revisando os gastos com Lazer e Alimentação — costumam ter mais gordura.";
  }
  if (q.includes("meta") || q.includes("objetivo")) {
    return "Divida a meta em parcelas mensais realistas: (valor alvo) ÷ (meses até o prazo). Configure uma transferência automática logo após receber seu salário — isso é o famoso 'pague-se primeiro'.";
  }
  if (q.includes("investir") || q.includes("investimento")) {
    return "Antes de investir, garanta reserva de emergência (3–6 meses de despesas) em algo líquido, como Tesouro Selic ou CDB com liquidez diária. Depois, diversifique por prazo e objetivo.";
  }
  if (q.includes("relatorio") || q.includes("relatório") || q.includes("resumo")) {
    return "Acesse o Dashboard para ver receitas, despesas e o gráfico de despesas por categoria do mês atual — atualiza em tempo real.";
  }
  if (q.includes("olá") || q.includes("oi") || q.includes("bom dia")) {
    return "Olá! 👋 Sou o FinPilot AI, seu copiloto financeiro. Pergunte sobre economia, metas, orçamento ou investimentos!";
  }
  return "Boa pergunta! Reveja seus lançamentos recentes e categorias para identificar padrões. Se quiser, defina uma meta em 'Metas' para direcionar seus esforços — e me chame sempre que precisar.";
}

function Chat() {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["chat"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_chat_history").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const send = useMutation({
    mutationFn: async (text: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      await supabase.from("ai_chat_history").insert({ user_id: user.id, message: text, sender: "user" });
      const reply = simulate(text);
      await new Promise(r => setTimeout(r, 500));
      await supabase.from("ai_chat_history").insert({ user_id: user.id, message: reply, sender: "ai" });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chat"] }); },
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || send.isPending) return;
    send.mutate(input.trim());
    setInput("");
  };

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto flex flex-col h-[calc(100vh-2rem)] md:h-screen">
      <PageHeader title="FinPilot AI" subtitle="Seu copiloto financeiro pessoal" />
      <Card className="flex-1 flex flex-col p-0 overflow-hidden">
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary grid place-items-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-semibold mb-1">Olá! Sou o FinPilot AI</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Pergunte sobre economia, metas, orçamento ou peça um resumo das suas finanças.
              </p>
            </div>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${
                m.sender === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted rounded-bl-sm"
              }`}>
                {m.message}
              </div>
            </div>
          ))}
          {send.isPending && (
            <div className="flex justify-start">
              <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-sm text-sm text-muted-foreground">Pensando...</div>
            </div>
          )}
        </div>
        <form onSubmit={submit} className="border-t border-border p-3 flex gap-2">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Pergunte algo sobre suas finanças..." disabled={send.isPending} />
          <Button type="submit" disabled={send.isPending || !input.trim()}><Send className="w-4 h-4" /></Button>
        </form>
      </Card>
    </div>
  );
}
