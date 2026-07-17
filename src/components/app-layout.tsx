import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, ArrowRightLeft, Target, Sparkles, LogOut, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Lançamentos", icon: ArrowRightLeft },
  { to: "/goals", label: "Metas", icon: Target },
  { to: "/chat", label: "FinPilot AI", icon: Sparkles },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex md:w-64 shrink-0 bg-sidebar border-r border-sidebar-border flex-col p-4">
        <div className="flex items-center gap-2 px-2 py-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-primary/20 grid place-items-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-bold tracking-tight text-sidebar-foreground">FinPilot</div>
            <div className="text-xs text-muted-foreground">Finanças inteligentes</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(item => {
            const active = pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  active ? "bg-primary/15 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button onClick={signOut} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent transition">
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </aside>

      <main className="flex-1 pb-20 md:pb-0 overflow-x-hidden">
        {children}
      </main>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-sidebar border-t border-sidebar-border flex z-40">
        {nav.map(item => {
          const active = pathname.startsWith(item.to);
          return (
            <Link key={item.to} to={item.to}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs ${
                active ? "text-primary" : "text-muted-foreground"
              }`}>
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
