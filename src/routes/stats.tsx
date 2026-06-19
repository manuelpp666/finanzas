import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Smartphone, CreditCard, Banknote } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ExpenseFab } from "@/components/expense-fab";
import { useFinanceStore } from "@/lib/finance-store";
import { CATEGORIES, type PaymentMethod } from "@/lib/finance-types";
import { formatCurrency, inMonth } from "@/lib/format";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Estadísticas — Lumen" },
      { name: "description", content: "Análisis mensual por categoría y método de pago." },
    ],
  }),
  component: Stats,
});

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function Stats() {
  const { transactions } = useFinanceStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const years = useMemo(() => {
    const ys = new Set<number>([now.getFullYear()]);
    transactions.forEach((t) => ys.add(new Date(t.date + "T00:00:00").getFullYear()));
    return Array.from(ys).sort((a, b) => b - a);
  }, [transactions]);

  const monthTx = useMemo(
    () => transactions.filter((t) => inMonth(t.date, year, month) && t.type === "expense"),
    [transactions, year, month],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    monthTx.forEach((t) => map.set(t.category, (map.get(t.category) ?? 0) + t.amount));
    return CATEGORIES.map((c) => ({ name: c.label, value: map.get(c.value) ?? 0, color: c.token, key: c.value }));
  }, [monthTx]);

  const total = byCategory.reduce((s, c) => s + c.value, 0);

  const methodData: { method: PaymentMethod; label: string; icon: typeof Smartphone; total: number; count: number; tint: string }[] = [
    { method: "yape", label: "Yape", icon: Smartphone, total: 0, count: 0, tint: "var(--cat-leisure)" },
    { method: "card", label: "Tarjeta", icon: CreditCard, total: 0, count: 0, tint: "var(--cat-transport)" },
    { method: "cash", label: "Efectivo", icon: Banknote, total: 0, count: 0, tint: "var(--cat-services)" },
  ];
  monthTx.forEach((t) => {
    const m = methodData.find((x) => x.method === t.method)!;
    m.total += t.amount;
    m.count += 1;
  });
  const methodTotal = methodData.reduce((s, m) => s + m.total, 0);

  return (
    <>
      <AppShell>
        <div className="space-y-8">
          {/* Header + filters */}
          <header className="flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Análisis</p>
              <h1 className="font-display text-4xl md:text-5xl mt-2">Estadísticas</h1>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <SelectChip
                value={month}
                onChange={(v) => setMonth(Number(v))}
                options={MONTHS.map((m, i) => ({ value: i, label: m }))}
              />
              <SelectChip value={year} onChange={(v) => setYear(Number(v))} options={years.map((y) => ({ value: y, label: String(y) }))} />
              <div className="ml-auto text-right">
                <p className="text-xs text-muted-foreground">Total gastado</p>
                <p className="font-display text-xl numeric">{formatCurrency(total)}</p>
              </div>
            </div>
          </header>

          {/* Categories bar chart */}
          <section className="rounded-3xl bg-card border border-border/60 p-6 md:p-7">
            <h2 className="font-display text-xl">Por categoría</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Distribución del mes seleccionado</p>

            {total === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No hay gastos en este período.</p>
            ) : (
              <div className="mt-6 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byCategory} margin={{ top: 10, right: 4, bottom: 0, left: -16 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "color-mix(in oklab, var(--foreground) 4%, transparent)" }}
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => formatCurrency(v)}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {byCategory.map((c) => (
                        <Cell key={c.key} fill={c.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* By payment method */}
          <section>
            <h2 className="font-display text-xl mb-4">Por método de pago</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {methodData.map((m) => {
                const Icon = m.icon;
                const pct = methodTotal ? (m.total / methodTotal) * 100 : 0;
                return (
                  <div key={m.method} className="rounded-3xl bg-card border border-border/60 p-6 relative overflow-hidden">
                    <div
                      className="absolute -right-8 -top-8 size-32 rounded-full opacity-[0.08]"
                      style={{ backgroundColor: m.tint }}
                    />
                    <div className="relative">
                      <div className="flex items-center justify-between">
                        <div
                          className="size-10 rounded-xl grid place-items-center"
                          style={{ backgroundColor: `color-mix(in oklab, ${m.tint} 18%, transparent)` }}
                        >
                          <Icon className="size-5" style={{ color: m.tint }} />
                        </div>
                        <span className="text-xs text-muted-foreground numeric">{m.count} mov.</span>
                      </div>
                      <p className="mt-5 text-xs uppercase tracking-wider text-muted-foreground">{m.label}</p>
                      <p className="font-display text-3xl numeric mt-1">{formatCurrency(m.total)}</p>

                      <div className="mt-5">
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: m.tint }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 numeric">{pct.toFixed(1)}% del total</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
        <ExpenseFab />
      </AppShell>
      <Toaster position="top-center" />
    </>
  );
}

function SelectChip<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: string) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-card border border-border rounded-full pl-5 pr-10 py-2.5 text-sm font-medium capitalize hover:border-foreground/30 transition cursor-pointer"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">▾</span>
    </div>
  );
}
