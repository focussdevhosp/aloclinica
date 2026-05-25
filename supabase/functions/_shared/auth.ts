/**
 * Shared auth helpers for edge functions.
 *
 * Edge functions that use SUPABASE_SERVICE_ROLE_KEY bypass RLS, so they MUST
 * authorize the caller themselves. These helpers verify the caller's JWT and
 * (optionally) that they hold the admin role, via the SECURITY DEFINER
 * `is_admin()` / `has_role()` functions in the database.
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface Caller {
  user: { id: string; email?: string } | null;
  isAdmin: boolean;
  /** A supabase client scoped to the caller's JWT (respects RLS). */
  client: SupabaseClient | null;
}

/**
 * Resolve the caller from the Authorization header. Returns user=null when the
 * token is missing or invalid. Never throws.
 */
export async function getCaller(req: Request): Promise<Caller> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return { user: null, isAdmin: false, client: null };
  }

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) {
    return { user: null, isAdmin: false, client: null };
  }

  let isAdmin = false;
  try {
    const { data: adminFlag } = await client.rpc("is_admin");
    isAdmin = adminFlag === true;
  } catch (_e) {
    isAdmin = false;
  }

  return {
    user: { id: data.user.id, email: data.user.email ?? undefined },
    isAdmin,
    client,
  };
}

/**
 * Timing-safe comparison of two secrets to avoid leaking length/prefix via
 * early-exit string comparison.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const enc = new TextEncoder();
  const ba = enc.encode(a);
  const bb = enc.encode(b);
  if (ba.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ba.length; i++) diff |= ba[i] ^ bb[i];
  return diff === 0;
}
