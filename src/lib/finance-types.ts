export type PaymentMethod = "yape" | "card" | "cash";
// Category is now a plain string — values come from the DB dynamically
export type Category = string;

export interface CategoryDef {
  value: string;
  label: string;
  token: string;
  type: "expense" | "income" | "both";
}

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string; // ISO yyyy-mm-dd
  category: Category;
  method: PaymentMethod;
  type: "expense" | "income";
  createdAt: number;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string; // ISO yyyy-mm-dd
  createdAt: number;
}

export const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "yape", label: "Yape" },
  { value: "card", label: "Tarjeta" },
  { value: "cash", label: "Efectivo" },
];

// Helpers that accept the live categories array
export const categoryLabel = (c: Category, cats: CategoryDef[]) =>
  cats.find((x) => x.value === c)?.label ?? c;
export const categoryToken = (c: Category, cats: CategoryDef[]) =>
  cats.find((x) => x.value === c)?.token ?? "var(--cat-other)";
export const methodLabel = (m: PaymentMethod) =>
  METHODS.find((x) => x.value === m)?.label ?? m;
