import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { Goal, Transaction } from "./finance-types";

const TX_KEY = "lumen.transactions.v1";
const GOAL_KEY = "lumen.goals.v1";

type State = {
  transactions: Transaction[];
  goals: Goal[];
};

const listeners = new Set<() => void>();
let state: State = { transactions: [], goals: [] };
let hydrated = false;

function notify() {
  for (const l of listeners) l();
}

function persist() {
  try {
    localStorage.setItem(TX_KEY, JSON.stringify(state.transactions));
    localStorage.setItem(GOAL_KEY, JSON.stringify(state.goals));
  } catch {}
}

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const tx = localStorage.getItem(TX_KEY);
    const goals = localStorage.getItem(GOAL_KEY);
    state = {
      transactions: tx ? JSON.parse(tx) : seedTransactions(),
      goals: goals ? JSON.parse(goals) : seedGoals(),
    };
    if (!tx || !goals) persist();
  } catch {
    state = { transactions: seedTransactions(), goals: seedGoals() };
    persist();
  }
  notify();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot(): State {
  return state;
}

const EMPTY_STATE: State = { transactions: [], goals: [] };
function getServerSnapshot(): State {
  return EMPTY_STATE;
}


export function useFinanceStore() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  useEffect(() => {
    hydrate();
  }, []);

  const addTransaction = useCallback((t: Omit<Transaction, "id" | "createdAt">) => {
    const newTx: Transaction = { ...t, id: crypto.randomUUID(), createdAt: Date.now() };
    state = { ...state, transactions: [newTx, ...state.transactions] };
    persist();
    notify();
  }, []);

  const removeTransaction = useCallback((id: string) => {
    state = { ...state, transactions: state.transactions.filter((t) => t.id !== id) };
    persist();
    notify();
  }, []);

  const addGoal = useCallback((g: Omit<Goal, "id" | "createdAt">) => {
    const newGoal: Goal = { ...g, id: crypto.randomUUID(), createdAt: Date.now() };
    state = { ...state, goals: [newGoal, ...state.goals] };
    persist();
    notify();
  }, []);

  const updateGoal = useCallback((id: string, patch: Partial<Goal>) => {
    state = { ...state, goals: state.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) };
    persist();
    notify();
  }, []);

  const removeGoal = useCallback((id: string) => {
    state = { ...state, goals: state.goals.filter((g) => g.id !== id) };
    persist();
    notify();
  }, []);

  const depositGoal = useCallback((id: string, amount: number) => {
    state = {
      ...state,
      goals: state.goals.map((g) => (g.id === id ? { ...g, current: Math.max(0, g.current + amount) } : g)),
    };
    persist();
    notify();
  }, []);

  return {
    transactions: snap.transactions,
    goals: snap.goals,
    addTransaction,
    removeTransaction,
    addGoal,
    updateGoal,
    removeGoal,
    depositGoal,
  };
}

function seedTransactions(): Transaction[] {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const mk = (offset: number, t: Partial<Transaction>): Transaction => {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    return {
      id: crypto.randomUUID(),
      amount: 0,
      description: "",
      date: iso(d),
      category: "other",
      method: "yape",
      type: "expense",
      createdAt: Date.now() - offset * 86400000,
      ...t,
    };
  };
  return [
    mk(0, { amount: 18.5, description: "Café y tostadas", category: "food", method: "yape" }),
    mk(0, { amount: 12, description: "Uber al trabajo", category: "transport", method: "card" }),
    mk(1, { amount: 89.9, description: "Cena con amigos", category: "leisure", method: "card" }),
    mk(2, { amount: 4500, description: "Sueldo", category: "other", method: "card", type: "income" }),
    mk(2, { amount: 145, description: "Luz y agua", category: "services", method: "card" }),
    mk(3, { amount: 32, description: "Mercado", category: "food", method: "cash" }),
    mk(5, { amount: 220, description: "Zapatillas", category: "shopping", method: "card" }),
    mk(7, { amount: 22, description: "Almuerzo", category: "food", method: "yape" }),
  ];
}

function seedGoals(): Goal[] {
  const future = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  };
  return [
    { id: crypto.randomUUID(), name: "Laptop nueva", target: 4500, current: 1800, deadline: future(4), createdAt: Date.now() - 30 * 86400000 },
    { id: crypto.randomUUID(), name: "Fondo de viaje", target: 8000, current: 2400, deadline: future(8), createdAt: Date.now() - 60 * 86400000 },
  ];
}
