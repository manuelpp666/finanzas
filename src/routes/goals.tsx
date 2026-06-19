import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Target as TargetIcon, Trash2, TrendingUp, Calendar } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ExpenseFab } from "@/components/expense-fab";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useFinanceStore } from "@/lib/finance-store";
import type { Goal } from "@/lib/finance-types";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Metas — Lumen" },
      { name: "description", content: "Define metas de ahorro con proyección inteligente y micro-hitos." },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { goals, addGoal, removeGoal, depositGoal } = useFinanceStore();
  const [open, setOpen] = useState(false);

  return (
    <>
      <AppShell>
        <header className="flex items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tu futuro</p>
            <h1 className="font-display text-4xl md:text-5xl mt-2">Metas</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full h-11 px-5">
                <Plus className="size-4 mr-1" />
                Nueva meta
              </Button>
            </DialogTrigger>
            <NewGoalDialog onCreate={(g) => { addGoal(g); setOpen(false); toast.success("Meta creada"); }} />
          </Dialog>
        </header>

        {goals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border py-20 text-center">
            <div className="size-14 rounded-2xl bg-muted mx-auto grid place-items-center">
              <TargetIcon className="size-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-display text-xl">Sin metas todavía</p>
            <p className="text-sm text-muted-foreground mt-1">Define tu primer objetivo y empecemos a proyectar.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} onDelete={() => removeGoal(g.id)} onDeposit={(n) => depositGoal(g.id, n)} />
            ))}
          </div>
        )}

        <ExpenseFab />
      </AppShell>
      <Toaster position="top-center" />
    </>
  );
}

function GoalCard({ goal, onDelete, onDeposit }: { goal: Goal; onDelete: () => void; onDeposit: (n: number) => void }) {
  const [amt, setAmt] = useState("");
  const pct = Math.min(100, (goal.current / goal.target) * 100);
  const milestones = [25, 50, 75, 100];

  // Projection
  const createdDate = new Date(goal.createdAt);
  const today = new Date();
  const daysElapsed = Math.max(1, Math.round((today.getTime() - createdDate.getTime()) / 86400000));
  const ratePerDay = goal.current / daysElapsed;
  const remaining = Math.max(0, goal.target - goal.current);
  const deadline = new Date(goal.deadline + "T00:00:00");
  const daysToDeadline = Math.round((deadline.getTime() - today.getTime()) / 86400000);

  let projection: { tone: "success" | "warning" | "neutral"; message: string };
  if (goal.current >= goal.target) {
    projection = { tone: "success", message: "🎉 ¡Meta completada! Ya alcanzaste tu objetivo." };
  } else if (ratePerDay <= 0) {
    const weekly = remaining / Math.max(1, Math.floor(daysToDeadline / 7));
    projection = {
      tone: "warning",
      message: `Necesitas ahorrar ${formatCurrency(weekly)} por semana para llegar a tiempo.`,
    };
  } else {
    const daysToFinish = Math.ceil(remaining / ratePerDay);
    const diff = daysToDeadline - daysToFinish;
    if (diff >= 0) {
      projection = {
        tone: "success",
        message: `Al ritmo actual, alcanzarás esta meta ${diff === 0 ? "justo en la fecha" : `${diff} días antes`}.`,
      };
    } else {
      const weekly = remaining / Math.max(1, Math.floor(daysToDeadline / 7));
      projection = {
        tone: "warning",
        message: `Vas con retraso. Sube tu ritmo a ${formatCurrency(weekly)}/semana para cumplir.`,
      };
    }
  }

  const submitDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amt);
    if (!n || n === 0) return;
    onDeposit(n);
    setAmt("");
    toast.success(n > 0 ? "Aporte registrado" : "Retiro registrado");
  };

  const toneColor =
    projection.tone === "success"
      ? "var(--success)"
      : projection.tone === "warning"
        ? "var(--warning)"
        : "var(--muted-foreground)";

  return (
    <article className="rounded-3xl bg-card border border-border/60 p-6 md:p-7 flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-2xl truncate">{goal.name}</h3>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
            <Calendar className="size-3" />
            Hasta {formatDateLong(goal.deadline)}
          </p>
        </div>
        <button
          onClick={onDelete}
          aria-label="Eliminar meta"
          className="size-8 rounded-full hover:bg-muted grid place-items-center text-muted-foreground hover:text-destructive transition shrink-0"
        >
          <Trash2 className="size-4" />
        </button>
      </header>

      <div>
        <div className="flex items-baseline justify-between mb-2">
          <p className="font-display text-3xl numeric">{formatCurrency(goal.current)}</p>
          <p className="text-sm text-muted-foreground numeric">de {formatCurrency(goal.target)}</p>
        </div>

        {/* Segmented progress */}
        <div className="relative h-2.5 grid grid-cols-4 gap-1.5">
          {milestones.map((ms, i) => {
            const segStart = i * 25;
            const fill = Math.max(0, Math.min(25, pct - segStart));
            const reached = pct >= ms;
            return (
              <div key={ms} className="relative h-full rounded-full bg-muted overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{
                    width: `${(fill / 25) * 100}%`,
                    backgroundColor: reached ? "var(--success)" : "var(--foreground)",
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-4 text-[10px] text-muted-foreground numeric">
          {milestones.map((ms) => (
            <span
              key={ms}
              className={`text-center transition ${pct >= ms ? "text-[color:var(--success)] font-semibold" : ""}`}
            >
              {ms}%
            </span>
          ))}
        </div>
      </div>

      {/* Projection */}
      <div
        className="rounded-2xl p-4 flex gap-3 items-start"
        style={{ backgroundColor: `color-mix(in oklab, ${toneColor} 10%, transparent)` }}
      >
        <div
          className="size-8 rounded-full grid place-items-center shrink-0"
          style={{ backgroundColor: `color-mix(in oklab, ${toneColor} 22%, transparent)` }}
        >
          <TrendingUp className="size-4" style={{ color: toneColor }} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider font-medium" style={{ color: toneColor }}>
            Proyección inteligente
          </p>
          <p className="text-sm mt-0.5 leading-snug">{projection.message}</p>
        </div>
      </div>

      {/* Deposit */}
      <form onSubmit={submitDeposit} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">S/</span>
          <Input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
            placeholder="Agregar aporte"
            className="h-11 pl-9 numeric"
          />
        </div>
        <Button type="submit" className="h-11 rounded-xl px-5">
          Aportar
        </Button>
      </form>
    </article>
  );
}

function NewGoalDialog({ onCreate }: { onCreate: (g: Omit<Goal, "id" | "createdAt">) => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("0");
  const [deadline, setDeadline] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = parseFloat(target);
    const c = parseFloat(current) || 0;
    if (!name.trim()) return toast.error("Ponle un nombre a tu meta");
    if (!t || t <= 0) return toast.error("Define un monto objetivo");
    onCreate({ name: name.trim(), target: t, current: c, deadline });
  };

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="font-display text-2xl">Nueva meta</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4 mt-2">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Nombre</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Laptop nueva" className="mt-2 h-11" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Objetivo</Label>
            <Input
              type="number"
              step="0.01"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="5000"
              className="mt-2 h-11 numeric"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ya tengo</Label>
            <Input
              type="number"
              step="0.01"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="mt-2 h-11 numeric"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fecha límite</Label>
          <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-2 h-11 numeric" />
        </div>
        <Button type="submit" className="w-full h-12 rounded-full">
          Crear meta
        </Button>
      </form>
    </DialogContent>
  );
}
