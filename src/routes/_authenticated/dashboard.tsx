import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ArrowDownRight, ArrowUpRight, Wallet, Plus, Target } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — FinPilot" }] }),
  component: Dashboard,
});

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const COLORS = ["#10b981", "#22d3ee", "#f59e0b", "#f43f5e", "#a855f7", "#3b82f6", "#84cc16"];

function Dashboard() {
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const { data: txs = [] } = useQuery({
    queryKey: ["tx-month", monthStart],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions")
        .select("*").gte("date", monthStart).lte("date", monthEnd);
      if (error) throw error;
      return data;
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("saving_goals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const income = txs.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = txs.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  const byCategory = Object.entries(
    txs.filter(t => t.type === "expense").reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Visão geral"
        subtitle={`Resumo de ${format(new Date(), "MMMM 'de' yyyy")}`}
        action={
          <Button asChild>
            <Link to="/transactions"><Plus className="w-4 h-4 mr-1" />Novo</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Saldo atual" value={brl(balance)} icon={Wallet} tone={balance >= 0 ? "primary" : "destructive"} />
        <SummaryCard label="Receitas do mês" value={brl(income)} icon={ArrowUpRight} tone="primary" />
        <SummaryCard label="Despesas do mês" value={brl(expense)} icon={ArrowDownRight} tone="destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Despesas por categoria</h2>
          {byCategory.length === 0 ? (
            <div className="text-sm text-muted-foreground py-16 text-center">
              Nenhuma despesa neste mês.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Metas de economia</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/goals"><Target className="w-4 h-4 mr-1" />Ver todas</Link>
            </Button>
          </div>
          {goals.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Crie sua primeira meta em <Link to="/goals" className="text-primary underline">Metas</Link>.
            </div>
          ) : (
            <div className="space-y-4">
              {goals.slice(0, 4).map(g => {
                const pct = Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100);
                return (
                  <div key={g.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium truncate">{g.title}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{brl(Number(g.current_amount))} / {brl(Number(g.target_amount))}</span>
                    </div>
                    <Progress value={pct} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; tone: "primary" | "destructive" }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`w-8 h-8 rounded-lg grid place-items-center ${tone === "primary" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight">{value}</div>
    </Card>
  );
}
