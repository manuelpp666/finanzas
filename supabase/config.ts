/**
 * Configuración de Supabase
 *
 * 1. Copia .env.example a .env y completa los valores desde tu panel de Supabase:
 *    Project Settings → API → Project URL + Project API keys (anon / service_role)
 *    Project Settings → Database → Connection string (para postgres.js)
 *
 * 2. La tabla `auth.users` es manejada por Supabase Auth.
 *    `public.profiles` se crea automáticamente via trigger al registrarse.
 */

export const supabaseConfig = {
  url: process.env.SUPABASE_URL ?? "",
  anonKey: process.env.SUPABASE_ANON_KEY ?? "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
};

export const dbConfig = {
  url: process.env.DATABASE_URL ?? "", 
};
