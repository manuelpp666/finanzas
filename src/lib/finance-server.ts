import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { sql, supabase } from "@/lib/db";
import type { Transaction, Goal } from "./finance-types";

async function getUserId(): Promise<string> {
  const token = getCookie("lumen_token");
  if (!token) throw new Error("No autenticado");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Sesión inválida");
  return data.user.id;
}

// ─── TRANSACTIONS ─────────────────────────────────────────────

export const getTransactionsFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const userId = await getUserId();
  const rows = await sql`
    SELECT id, amount, description, date, category, method, type, created_at
FROM public.transactions
    WHERE user_id = ${userId}
    ORDER BY date DESC, created_at DESC
  `;
  return rows.map(mapTransaction);
});

export const addTransactionFn = createServerFn({ method: "POST" })
  .validator((data: Omit<Transaction, "id" | "createdAt">) => {
    if (!data.amount || data.amount <= 0) throw new Error("Monto inválido");
    if (!data.date) throw new Error("Fecha requerida");
    return data;
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const rows = await sql`
      INSERT INTO public.transactions (user_id, amount, description, date, category, method, type)
      VALUES (
        ${userId},
        ${data.amount},
        ${data.description},
        ${data.date},
        ${data.category},
        ${data.method},
        ${data.type}
      )
      RETURNING id, amount, description, date, category, method, type, created_at
    `;
    return mapTransaction(rows[0]);
  });

export const removeTransactionFn = createServerFn({
  method: "POST",
})
  .validator((id: string) => {
    if (!id) throw new Error("ID requerido");
    return id;
  })
  .handler(async ({ data: id }) => {
    const userId = await getUserId();
    await sql`
      DELETE FROM public.transactions
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return { success: true };
  });

// ─── GOALS ────────────────────────────────────────────────────

export const getGoalsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const userId = await getUserId();
    const rows = await sql`
    SELECT id, name, target, current, deadline, created_at
FROM public.goals
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
    return rows.map(mapGoal);
  },
);

export const addGoalFn = createServerFn({ method: "POST" })
  .validator((data: Omit<Goal, "id" | "createdAt">) => {
    if (!data.name?.trim()) throw new Error("El nombre es obligatorio");
    if (!data.target || data.target <= 0)
      throw new Error("El objetivo debe ser mayor a 0");
    return data;
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const rows = await sql`
      INSERT INTO public.goals (user_id, name, target, current, deadline)
      VALUES (
        ${userId},
        ${data.name.trim()},
        ${data.target},
        ${data.current ?? 0},
        ${data.deadline}
      )
      RETURNING id, name, target, current, deadline, created_at
    `;
    return mapGoal(rows[0]);
  });

export const updateGoalFn = createServerFn({ method: "POST" })
  .validator((data: { id: string; patch: Partial<Goal> }) => {
    if (!data.id) throw new Error("ID requerido");
    return data;
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    const { id, patch } = data;

    const sets: string[] = [];
    const vals: unknown[] = [];

    if (patch.name !== undefined) {
      sets.push("name = ${" + (vals.push(patch.name) - 1) + "}");
    }
    if (patch.target !== undefined) {
      sets.push("target = ${" + (vals.push(patch.target) - 1) + "}");
    }
    if (patch.current !== undefined) {
      sets.push("current = ${" + (vals.push(patch.current) - 1) + "}");
    }
    if (patch.deadline !== undefined) {
      sets.push("deadline = ${" + (vals.push(patch.deadline) - 1) + "}");
    }

    if (sets.length === 0) return { success: true };

    const query = `
      UPDATE public.goals SET ${sets.join(", ")}
      WHERE id = $1 AND user_id = $2
    `;

    await sql.unsafe(query, [id, userId]);
    return { success: true };
  });

export const removeGoalFn = createServerFn({ method: "POST" })
  .validator((id: string) => {
    if (!id) throw new Error("ID requerido");
    return id;
  })
  .handler(async ({ data: id }) => {
    const userId = await getUserId();
    await sql`
      DELETE FROM public.goals
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return { success: true };
  });

export const depositGoalFn = createServerFn({ method: "POST" })
  .validator((data: { id: string; amount: number }) => {
    if (!data.id) throw new Error("ID requerido");
    if (typeof data.amount !== "number") throw new Error("Monto inválido");
    return data;
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    await sql`
      UPDATE public.goals
      SET current = GREATEST(0, current + ${data.amount})
      WHERE id = ${data.id} AND user_id = ${userId}
    `;
    return { success: true };
  });

// ─── HELPERS ──────────────────────────────────────────────────

function mapTransaction(row: Record<string, unknown>): Transaction {
  const rawDate = row.date;
  const dateStr =
    typeof rawDate === "object" && rawDate instanceof Date
      ? rawDate.toISOString().slice(0, 10)
      : String(rawDate).slice(0, 10);
  return {
    id: row.id as string,
    amount: Number(row.amount),
    description: row.description as string,
    date: dateStr,
    category: row.category as Transaction["category"],
    method: row.method as Transaction["method"],
    type: row.type as "expense" | "income",
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

function mapGoal(row: Record<string, unknown>): Goal {
  const rawDeadline = row.deadline;
  const deadlineStr =
    typeof rawDeadline === "object" && rawDeadline instanceof Date
      ? rawDeadline.toISOString().slice(0, 10)
      : String(rawDeadline).slice(0, 10);
  return {
    id: row.id as string,
    name: row.name as string,
    target: Number(row.target),
    current: Number(row.current),
    deadline: deadlineStr,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}
