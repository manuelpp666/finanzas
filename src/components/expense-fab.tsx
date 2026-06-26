import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Smartphone, CreditCard, Banknote } from "lucide-react";
import { METHODS, type Category, type PaymentMethod } from "@/lib/finance-types";
import { useFinanceStore } from "@/lib/finance-store";
import { todayISO } from "@/lib/format";
import { toast } from "sonner";

const methodIcons: Record<PaymentMethod, typeof Smartphone> = {
  yape: Smartphone,
  card: CreditCard,
  cash: Banknote,
};

export function ExpenseFab() {
  const [open, setOpen] = useState(false);
  const { addTransaction, categories, addCategory } = useFinanceStore();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState<Category>("");
  const [method, setMethod] = useState<PaymentMethod | null>(null);

  // New category form state
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatValue, setNewCatValue] = useState("");
  const [newCatLabel, setNewCatLabel] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  // Filtered categories: show those matching the selected type or 'both'
  const visibleCategories = categories.filter(
    (c) => c.type === type || c.type === "both",
  );

  // Auto-select first valid category when type changes or categories load
  useEffect(() => {
    if (
      category &&
      visibleCategories.some((c) => c.value === category)
    )
      return;
    setCategory(visibleCategories[0]?.value ?? "");
  }, [type, visibleCategories.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) {
      setType("expense");
      setAmount("");
      setDescription("");
      setDate(todayISO());
      setCategory(categories.filter((c) => c.type === "expense" || c.type === "both")[0]?.value ?? "");
      setMethod(null);
      setShowNewCat(false);
      setNewCatValue("");
      setNewCatLabel("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!n || n <= 0) return toast.error("Ingresa un monto válido");
    if (!method) return toast.error("Selecciona un método de pago");
    if (!category) return toast.error("Selecciona una categoría");
    addTransaction({ amount: n, description: description.trim() || "Sin descripción", date, category, method, type });
    toast.success(type === "income" ? "Ingreso registrado" : "Gasto registrado");
    setOpen(false);
  };

  const submitNewCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatLabel.trim()) return toast.error("Ingresa un nombre para la categoría");
    if (!newCatValue.trim()) return toast.error("Ingresa un identificador para la categoría");
    setSavingCat(true);
    try {
      const created = await addCategory({
        value: newCatValue.trim(),
        label: newCatLabel.trim(),
        type,
      });
      setCategory(created.value);
      setShowNewCat(false);
      setNewCatValue("");
      setNewCatLabel("");
      toast.success("Categoría creada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear categoría");
    } finally {
      setSavingCat(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          aria-label="Registrar gasto"
          className="fixed bottom-24 md:bottom-10 right-5 md:right-10 z-40 size-14 md:size-16 rounded-full bg-foreground text-background grid place-items-center shadow-float hover:scale-105 active:scale-95 transition-transform"
        >
          <Plus className="size-6" strokeWidth={2.5} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nuevo registro</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 mt-2">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-full">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`py-2 rounded-full text-sm font-medium transition ${
                  type === t ? "bg-background shadow-soft text-foreground" : "text-muted-foreground"
                }`}
              >
                {t === "expense" ? "Gasto" : "Ingreso"}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Monto</Label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-2xl font-display">S/</span>
              <Input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-16 pl-12 text-3xl font-display numeric border-0 bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Descripción</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej. Almuerzo del lunes"
              className="mt-2 h-11"
            />
          </div>

          {/* Date */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fecha</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 h-11 numeric" />
          </div>

          {/* Categories */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Categoría</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {visibleCategories.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`px-3.5 py-2 rounded-full text-sm font-medium border transition ${
                    category === c.value
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background text-foreground border-border hover:border-foreground/30"
                  }`}
                >
                  <span
                    className="inline-block size-2 rounded-full mr-2 align-middle"
                    style={{ backgroundColor: c.token }}
                  />
                  {c.label}
                </button>
              ))}

              {/* Add new category button */}
              {!showNewCat && (
                <button
                  type="button"
                  onClick={() => setShowNewCat(true)}
                  className="px-3.5 py-2 rounded-full text-sm font-medium border border-dashed border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground transition"
                >
                  + Nueva
                </button>
              )}
            </div>

            {/* Inline new category form */}
            {showNewCat && (
              <div className="mt-3 p-3 rounded-2xl border border-border bg-muted/40 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Nueva categoría · {type === "expense" ? "Gasto" : "Ingreso"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nombre</Label>
                    <Input
                      value={newCatLabel}
                      onChange={(e) => setNewCatLabel(e.target.value)}
                      placeholder="Ej. Mascota"
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Identificador</Label>
                    <Input
                      value={newCatValue}
                      onChange={(e) => setNewCatValue(e.target.value)}
                      placeholder="Ej. pet"
                      className="mt-1 h-9 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 rounded-full"
                    disabled={savingCat}
                    onClick={submitNewCategory}
                  >
                    {savingCat ? "Guardando…" : "Crear"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => { setShowNewCat(false); setNewCatValue(""); setNewCatLabel(""); }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Método de pago <span className="text-destructive">*</span>
            </Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {METHODS.map((m) => {
                const Icon = methodIcons[m.value];
                const active = method === m.value;
                return (
                  <button
                    type="button"
                    key={m.value}
                    onClick={() => setMethod(m.value)}
                    className={`flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition ${
                      active
                        ? "border-foreground bg-foreground/[0.04]"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <Icon className={`size-5 ${active ? "text-foreground" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
                      {m.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" className="w-full h-12 rounded-full text-base">
            Guardar registro
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
