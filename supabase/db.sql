-- =============================================================
-- Lumen — Finanzas personales · PostgreSQL schema (Supabase Optimized)
-- =============================================================

-- 1. PROFILES (Enlazado a la autenticación nativa de Supabase) --
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTA: No necesitas guardar email ni password_hash aquí, 
-- Supabase los maneja de forma ultra segura en su esquema 'auth'.

-- 2. CATEGORIES (lookup / seed + custom por usuario) ----------
CREATE TABLE IF NOT EXISTS public.categories (
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  token TEXT NOT NULL,
  -- 'expense' | 'income' | 'both'
  type TEXT NOT NULL DEFAULT 'both' CHECK (type IN ('expense', 'income', 'both')),
  -- NULL = categoría global del sistema; UUID = categoría creada por ese usuario
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (value, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID))
);

-- 3. PAYMENT METHODS (lookup / seed) ---------------------------
CREATE TABLE IF NOT EXISTS public.payment_methods (
  value TEXT PRIMARY KEY,
  label TEXT NOT NULL
);


-- 4. TRANSACTIONS ----------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL,
  category TEXT NOT NULL REFERENCES public.categories(value),
  method TEXT NOT NULL REFERENCES public.payment_methods(value),
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions (user_id, date DESC);

-- 5. GOALS -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target NUMERIC(12, 2) NOT NULL CHECK (target > 0),
  current NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current >= 0),
  deadline DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals (user_id);

-- =============================================================
-- CONFIGURACIÓN DE SEGURIDAD (RLS)
-- =============================================================

-- Habilitar RLS en las tablas del usuario
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Tablas maestras (globales: lectura pública; custom: el usuario gestiona las suyas)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leer categorías globales y propias" ON public.categories
  FOR SELECT TO authenticated, anon
  USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Usuarios insertan sus categorías personalizadas" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios eliminan sus categorías personalizadas" ON public.categories
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Permitir lectura pública de métodos" ON public.payment_methods FOR SELECT TO authenticated, anon USING (true);

-- Políticas para PROFILES
CREATE POLICY "Usuarios pueden ver su propio perfil" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Usuarios pueden actualizar su propio perfil" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Políticas para TRANSACTIONS
CREATE POLICY "Usuarios manejan sus propias transacciones" ON public.transactions 
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Políticas para GOALS
CREATE POLICY "Usuarios manejan sus propios objetivos" ON public.goals 
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


  -- Función que copia el usuario recién creado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Usuario de Lumen') -- Toma el nombre del registro o pone uno por defecto
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se activa al registrarse
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1. Agregar la columna con un valor por defecto temporal para no romper filas existentes
ALTER TABLE public.categories 
ADD COLUMN type TEXT NOT NULL DEFAULT 'expense' 
CHECK (type IN ('expense', 'income', 'both'));

-- 2. (Opcional) Si quieres cambiar el tipo de alguna categoría existente a 'both' u 'income'
UPDATE public.categories SET type = 'both' WHERE value = 'other';

