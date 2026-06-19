export type PaymentMethod = "yape" | "card" | "cash";
export type Category = "food" | "transport" | "services" | "leisure" | "shopping" | "other";

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

export const CATEGORIES: { value: Category; label: string; token: string }[] = [
  { value: "food", label: "Comida", token: "var(--cat-food)" },
  { value: "transport", label: "Transporte", token: "var(--cat-transport)" },
  { value: "services", label: "Servicios", token: "var(--cat-services)" },
  { value: "leisure", label: "Ocio", token: "var(--cat-leisure)" },
  { value: "shopping", label: "Compras", token: "var(--cat-shopping)" },
  { value: "other", label: "Otros", token: "var(--cat-other)" },
];

export const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "yape", label: "Yape" },
  { value: "card", label: "Tarjeta" },
  { value: "cash", label: "Efectivo" },
];

export const categoryLabel = (c: Category) => CATEGORIES.find((x) => x.value === c)?.label ?? c;
export const categoryToken = (c: Category) => CATEGORIES.find((x) => x.value === c)?.token ?? "var(--cat-other)";
export const methodLabel = (m: PaymentMethod) => METHODS.find((x) => x.value === m)?.label ?? m;
