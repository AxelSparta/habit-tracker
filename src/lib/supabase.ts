"use client";

import { useAuth } from "@clerk/nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useMemo } from "react";

/**
 * Cliente de Supabase autenticado con el token de sesión de Clerk.
 * Supabase valida el JWT (integración "third-party auth") y las políticas RLS
 * usan `auth.jwt() ->> 'sub'` (el id de usuario de Clerk).
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function useSupabase(): SupabaseClient {
  const { getToken } = useAuth();
  return useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error(
        "Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local (ver .env.example).",
      );
    }
    return createClient(SUPABASE_URL, SUPABASE_KEY, {
      // El token se pide en cada request, así siempre está vigente. En el
      // render del servidor no hay sesión del navegador (Realtime lo pide al
      // crear el cliente): ahí no se hacen requests, así que va sin token.
      accessToken: async () =>
        typeof window === "undefined" ? null : ((await getToken()) ?? null),
    });
  }, [getToken]);
}
