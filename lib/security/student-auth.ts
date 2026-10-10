import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findStudentAuthEmail } from "@/lib/data/students";

/**
 * Student sign-in core (no redirects, so it is unit-testable).
 *
 * Every failure — unknown number, wrong password, inactive, wrong role —
 * collapses into the same `{ ok: false }`; the caller shows ONE generic
 * message and the internal email never leaves the server.
 */
export async function signInStudent(
  supabase: SupabaseClient,
  universityId: string,
  password: string
): Promise<{ ok: boolean }> {
  const internalEmail = await findStudentAuthEmail(universityId);
  if (!internalEmail) return { ok: false };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: internalEmail,
    password,
  });
  if (error || !data?.user) return { ok: false };

  // Never trust the session alone: re-verify role + active under RLS.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  const p = profile as { role: string; is_active: boolean } | null;
  if (!p || p.role !== "student" || !p.is_active) {
    await supabase.auth.signOut();
    return { ok: false };
  }
  return { ok: true };
}
