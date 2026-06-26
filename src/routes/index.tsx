import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ExpenseFab } from "@/components/expense-fab";
import { TransactionRow } from "@/components/transaction-row";
import { useFinanceStore } from "@/lib/finance-store";
import { categoryLabel, categoryToken } from "@/lib/finance-types";
import { formatCurrency, inMonth } from "@/lib/format";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Inicio — Lumen" },
      { name: "description", content: "Resumen de tu mes: saldo, ingresos, gastos y últimas transacciones." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { transactions, categories } = useFinanceStore();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const monthTx = useMemo(() => transactions.filter((t) => inMonth(t.date, y, m)), [transactions, y, m]);
  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthTx.filter((t) => t.type === "expense").forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount));
    return categories
      .map((c) => ({ name: c.label, value: map.get(c.value) ?? 0, color: c.token, key: c.value }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [monthTx, categories]);

  const totalCat = byCategory.reduce((s, c) => s + c.value, 0);
  const recent = transactions.slice(0, 5);

  const monthName = now.toLocaleDateString("es-PE", { month: "long", year: "numeric" });

  return (
    <>
      <AppShell>
        <div className="space-y-8">
          {/* Hero balance */}
          <section className="relative overflow-hidden rounded-3xl bg-foreground text-background p-7 md:p-10 shadow-float">
            <div className="absolute -right-16 -top-16 size-60 rounded-full bg-background/5 blur-2xl" />
            <div className="absolute -right-10 -bottom-20 size-72 rounded-full bg-background/[0.03]" />
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.2em] text-background/60">Saldo disponible</p>
              <p className="font-display text-5xl md:text-6xl mt-3 numeric leading-none">{formatCurrency(balance)}</p>
              <p className="text-sm text-background/70 mt-3 capitalize">{monthName}</p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <StatPill icon={ArrowDownRight} label="Ingresos" value={income} tint="success" />
                <StatPill icon={ArrowUpRight} label="Gastos" value={expense} tint="warning" />
              </div>
            </div>
          </section>

          {/* Chart + Quick stats */}
          <section className="grid md:grid-cols-5 gap-5">
            <div className="md:col-span-3 rounded-3xl bg-card border border-border/60 p-6 md:p-7">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-display text-xl">Distribución</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Gastos por categoría · este mes</p>
                </div>
                <Link to="/stats" className="text-xs font-medium text-muted-foreground hover:text-foreground">
                  Ver detalle →
                </Link>
              </div>

              {byCategory.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative size-44 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={byCategory}
                          dataKey="value"
                          innerRadius={56}
                          outerRadius={84}
                          paddingAngle={3}
                          stroke="none"
                        >
                          {byCategory.map((c) => (
                            <Cell key={c.key} fill={c.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 grid place-items-center pointer-events-none">
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
                        <p className="font-display text-lg numeric">{formatCurrency(totalCat)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full space-y-2.5">
                    {byCategory.slice(0, 5).map((c) => {
                      const pct = totalCat ? (c.value / totalCat) * 100 : 0;
                      return (
                        <div key={c.key} className="flex items-center gap-3">
                          <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="text-sm flex-1 truncate">{c.name}</span>
                          <span className="text-xs text-muted-foreground numeric tabular-nums">{pct.toFixed(0)}%</span>
                          <span className="text-sm font-medium numeric w-20 text-right">{formatCurrency(c.value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2 rounded-3xl bg-card border border-border/60 p-6 md:p-7">
              <h2 className="font-display text-xl">Este mes</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{monthTx.length} movimientos</p>
              <div className="mt-5 space-y-4">
                <MetricLine label="Promedio diario" value={expense / Math.max(now.getDate(), 1)} />
                <MetricLine label="Mayor gasto" value={Math.max(0, ...monthTx.filter((t) => t.type === "expense").map((t) => t.amount))} />
                <MetricLine label="Ahorro neto" value={balance} accent={balance >= 0 ? "success" : "destructive"} />
              </div>
            </div>
          </section>

          {/* Recent */}
          <section className="rounded-3xl bg-card border border-border/60 p-6 md:p-7">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display text-xl">Movimientos recientes</h2>
              <span className="text-xs text-muted-foreground">Últimos 5</span>
            </div>
            {recent.length === 0 ? (
              <div className="py-16 text-center">
                <div className="size-12 rounded-full bg-muted mx-auto grid place-items-center">
                  <Wallet className="size-5 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">Aún no hay movimientos. Toca + para empezar.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {recent.map((t) => (
                  <TransactionRow key={t.id} t={t} categories={categories} />
                ))}
              </div>
            )}
          </section>
        </div>
        <ExpenseFab />
      </AppShell>
      <Toaster position="top-center" />
    </>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof ArrowUpRight;
  label: string;
  value: number;
  tint: "success" | "warning";
}) {
  return (
    <div className="rounded-2xl bg-background/[0.06] backdrop-blur p-4">
      <div className="flex items-center gap-2 text-background/70">
        <div
          className="size-7 rounded-full grid place-items-center"
          style={{
            backgroundColor:
              tint === "success" ? "color-mix(in oklab, var(--success) 35%, transparent)" : "color-mix(in oklab, var(--warning) 35%, transparent)",
          }}
        >
          <Icon className="size-3.5 text-background" />
        </div>
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-display text-xl mt-2 numeric">{formatCurrency(value)}</p>
    </div>
  );
}

function MetricLine({ label, value, accent }: { label: string; value: number; accent?: "success" | "destructive" }) {
  const color = accent === "success" ? "text-[color:var(--success)]" : accent === "destructive" ? "text-destructive" : "";
  return (
    <div className="flex items-baseline justify-between border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`font-display text-lg numeric ${color}`}>{formatCurrency(value)}</span>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="py-12 text-center">
      <div className="mx-auto size-32 rounded-full border-[14px] border-muted" />
      <p className="text-sm text-muted-foreground mt-4">Sin gastos este mes todavía</p>
    </div>
  );
}
