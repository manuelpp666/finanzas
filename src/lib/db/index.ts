import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { dbConfig, supabaseConfig } from "../../../supabase/config";

// ─── PostgreSQL (postgres.js) ─────────────────────────────────

const globalForSql = globalThis as unknown as { __sql?: postgres.Sql };

function createSql() {
  if (!dbConfig.url) {
    throw new Error("La URL de la base de datos no está definida en dbConfig.");
  }

  return postgres(dbConfig.url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // 2. CRÍTICO PARA SUPABASE POOLER (Puerto 6543):
    prepare: false, 
    // 3. CRÍTICO PARA PRODUCCIÓN: Exigir SSL seguro si no estás en local
    ssl: process.env.NODE_ENV === "production" ? "require" : undefined,
  });
}

export const sql = globalForSql.__sql ?? createSql();

if (process.env.NODE_ENV !== "production") {
  globalForSql.__sql = sql;
}

// ─── Supabase (Auth) ──────────────────────────────────────────

function createSupabase() {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) {
    throw new Error("Faltan las credenciales de Supabase en supabaseConfig.");
  }

  return createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sbGlobal = globalThis as any;
export const supabase = sbGlobal.__sb ?? createSupabase();

if (process.env.NODE_ENV !== "production") {
  sbGlobal.__sb = supabase;
}
