import { createClient } from "@/lib/supabase/server";

/**
 * Re-checks the admin role. The proxy already guards /admin and RLS is the real
 * backstop, but server actions and route handlers are public endpoints — they
 * do not inherit a page's protection, so each one calls this itself.
 *
 * Deliberately not in a "use server" file: every export there becomes a
 * callable endpoint.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null, error: "Not signed in." as const };

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { supabase, userId: null, error: "Not an admin." as const };

  return { supabase, userId: user.id, error: null };
}
