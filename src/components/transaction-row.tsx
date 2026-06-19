import { Smartphone, CreditCard, Banknote, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { PaymentMethod, Transaction } from "@/lib/finance-types";
import { categoryLabel, categoryToken } from "@/lib/finance-types";
import { formatCurrency, formatDate } from "@/lib/format";

const methodIcons: Record<PaymentMethod, typeof Smartphone> = {
  yape: Smartphone,
  card: CreditCard,
  cash: Banknote,
};

export function TransactionRow({ t }: { t: Transaction }) {
  const MIcon = methodIcons[t.method];
  const isIncome = t.type === "income";

  return (
    <div className="flex items-center gap-4 py-3.5">
      <div
        className="size-10 rounded-xl grid place-items-center shrink-0"
        style={{ backgroundColor: `color-mix(in oklab, ${categoryToken(t.category)} 16%, transparent)` }}
      >
        {isIncome ? (
          <ArrowDownLeft className="size-5" style={{ color: "var(--success)" }} />
        ) : (
          <MIcon className="size-5" style={{ color: categoryToken(t.category) }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{t.description}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {categoryLabel(t.category)} · {formatDate(t.date)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold numeric ${isIncome ? "text-[color:var(--success)]" : "text-foreground"}`}>
          {isIncome ? "+" : "−"}
          {formatCurrency(t.amount)}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
          {t.method === "yape" ? "Yape" : t.method === "card" ? "Tarjeta" : "Efectivo"}
        </p>
      </div>
    </div>
  );
}
