import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { sql, supabase } from "@/lib/db";
import type { Transaction, Goal, CategoryDef } from "./finance-types";

async function getUserId(): Promise<string> {
  const token = getCookie("lumen_token");
  if (!token) throw new Error("No autenticado");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Sesión inválida");
  return data.user.id;
}

// ─── CATEGORIES ───────────────────────────────────────────────

export const getCategoriesFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const token = getCookie("lumen_token");
    let userId: string | null = null;
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }
    const rows = userId
      ? await sql`
          SELECT value, label, token, type
          FROM public.categories
          WHERE user_id IS NULL OR user_id = ${userId}
          ORDER BY user_id NULLS FIRST, label
        `
      : await sql`
          SELECT value, label, token, type
          FROM public.categories
          WHERE user_id IS NULL
          ORDER BY label
        `;
    return rows.map(mapCategory);
  },
);

export const addCategoryFn = createServerFn({ method: "POST" })
  .validator((data: { value: string; label: string; type: "expense" | "income" | "both" }) => {
    if (!data.value?.trim()) throw new Error("El identificador es obligatorio");
    if (!data.label?.trim()) throw new Error("El nombre es obligatorio");
    return data;
  })
  .handler(async ({ data }) => {
    const userId = await getUserId();
    // Token generado en el backend con un color aleatorio del conjunto de CSS vars disponibles
    const tokens = [
      "var(--cat-food)",
      "var(--cat-transport)",
      "var(--cat-services)",
      "var(--cat-leisure)",
      "var(--cat-shopping)",
      "var(--cat-salary)",
      "var(--cat-other)",
    ];
    const token = tokens[Math.floor(Math.random() * tokens.length)];
    const value = data.value.trim().toLowerCase().replace(/\s+/g, "-");
    const rows = await sql`
      INSERT INTO public.categories (value, label, token, type, user_id)
      VALUES (${value}, ${data.label.trim()}, ${token}, ${data.type}, ${userId})
      RETURNING value, label, token, type
    `;
    return mapCategory(rows[0]);
  });

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

function mapCategory(row: Record<string, unknown>): CategoryDef {
  return {
    value: row.value as string,
    label: row.label as string,
    token: row.token as string,
    type: row.type as "expense" | "income" | "both",
  };
}

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
