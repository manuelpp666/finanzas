import { createServerFn } from "@tanstack/react-start";
import {
  setCookie,
  getCookie,
  deleteCookie,
} from "@tanstack/react-start/server";
import { supabase, sql } from "@/lib/db";
import type { User, RegisterInput, LoginInput } from "./types";

const COOKIE_NAME = "lumen_token";

function setAuthCookie(token: string) {
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

async function getUserFromAuth(
  accessToken: string,
): Promise<{ id: string; email: string } | null> {
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? "" };
}

async function getProfile(
  userId: string,
): Promise<{ name: string; created_at: string } | null> {
  const rows = await sql`
    SELECT name, created_at FROM public.profiles WHERE id = ${userId}
  `;
  if (rows.length === 0) return null;
  return { name: rows[0].name, created_at: rows[0].created_at };
}

function buildUser(
  auth: { id: string; email: string },
  profile: { name: string; created_at: string },
): User {
  return {
    id: auth.id,
    name: profile.name,
    email: auth.email,
    createdAt: new Date(profile.created_at).getTime(),
  };
}

export const registerFn = createServerFn({ method: "POST" })
  .validator((data: RegisterInput) => {
    const errors: string[] = [];
    if (!data.name?.trim()) errors.push("El nombre es obligatorio");
    if (!data.email?.trim()) errors.push("El correo es obligatorio");
    if (!data.password || data.password.length < 6)
      errors.push("La contraseña debe tener al menos 6 caracteres");
    if (errors.length > 0) throw new Error(errors.join(". "));
    return data;
  })
  .handler(async ({ data }) => {
    const { data: signUpRes, error } = await supabase.auth.signUp({
      email: data.email.toLowerCase().trim(),
      password: data.password,
      options: { data: { name: data.name.trim() } },
    });

    if (error) {
      if (error.message.includes("already")) {
        throw new Error("El correo ya está registrado");
      }
      throw new Error(error.message);
    }

    if (!signUpRes.user || !signUpRes.session) {
      throw new Error(
        "Revisa tu correo para confirmar la cuenta (o desactiva la confirmación de email en Supabase)",
      );
    }

    const profile = await getProfile(signUpRes.user.id);
    if (!profile) throw new Error("Error al crear el perfil");

    const user = buildUser(
      { id: signUpRes.user.id, email: signUpRes.user.email ?? "" },
      profile,
    );

    setAuthCookie(signUpRes.session.access_token);
    return { user };
  });

export const loginFn = createServerFn({ method: "POST" })
  .validator((data: LoginInput) => {
    if (!data.email?.trim()) throw new Error("El correo es obligatorio");
    if (!data.password) throw new Error("La contraseña es obligatoria");
    return data;
  })
  .handler(async ({ data }) => {
    const { data: signInRes, error } = await supabase.auth.signInWithPassword({
      email: data.email.toLowerCase().trim(),
      password: data.password,
    });

    if (error) {
      throw new Error("Correo o contraseña incorrectos");
    }

    if (!signInRes.user || !signInRes.session) {
      throw new Error("Error al iniciar sesión");
    }

    const profile = await getProfile(signInRes.user.id);
    if (!profile) throw new Error("Perfil no encontrado");

    const user = buildUser(
      { id: signInRes.user.id, email: signInRes.user.email ?? "" },
      profile,
    );

    setAuthCookie(signInRes.session.access_token);
    return { user };
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(COOKIE_NAME, { path: "/" });
  return { success: true };
});

export const meFn = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(COOKIE_NAME);
  if (!token) return { user: null };

  const auth = await getUserFromAuth(token);
  if (!auth) return { user: null };

  const profile = await getProfile(auth.id);
  if (!profile) return { user: null };

  return { user: buildUser(auth, profile) };
});
