import { useCallback, useEffect, useState } from "react";
import type { Goal, Transaction } from "./finance-types";
import {
  getTransactionsFn,
  addTransactionFn,
  removeTransactionFn,
  getGoalsFn,
  addGoalFn,
  updateGoalFn,
  removeGoalFn,
  depositGoalFn,
} from "./finance-server";

type State = {
  transactions: Transaction[];
  goals: Goal[];
};

const EMPTY: State = { transactions: [], goals: [] };

export function useFinanceStore() {
  const [state, setState] = useState<State>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [tx, goals] = await Promise.all([
        getTransactionsFn(),
        getGoalsFn(),
      ]);
      setState({ transactions: tx, goals });
    } catch {
      setState(EMPTY);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addTransaction = useCallback(
    async (t: Omit<Transaction, "id" | "createdAt">) => {
      const created = await addTransactionFn({ data: t });
      setState((prev) => ({
        ...prev,
        transactions: [created, ...prev.transactions],
      }));
    },
    [],
  );

  const removeTransaction = useCallback(async (id: string) => {
    await removeTransactionFn({ data: id });
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  }, []);

  const addGoal = useCallback(async (g: Omit<Goal, "id" | "createdAt">) => {
    const created = await addGoalFn({ data: g });
    setState((prev) => ({
      ...prev,
      goals: [created, ...prev.goals],
    }));
  }, []);

  const updateGoal = useCallback(async (id: string, patch: Partial<Goal>) => {
    await updateGoalFn({ data: { id, patch } });
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  }, []);

  const removeGoal = useCallback(async (id: string) => {
    await removeGoalFn({ data: id });
    setState((prev) => ({
      ...prev,
      goals: prev.goals.filter((g) => g.id !== id),
    }));
  }, []);

  const depositGoal = useCallback(async (id: string, amount: number) => {
    await depositGoalFn({ data: { id, amount } });
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === id ? { ...g, current: Math.max(0, g.current + amount) } : g,
      ),
    }));
  }, []);

  return {
    transactions: state.transactions,
    goals: state.goals,
    loaded,
    refetch: load,
    addTransaction,
    removeTransaction,
    addGoal,
    updateGoal,
    removeGoal,
    depositGoal,
  };
}
