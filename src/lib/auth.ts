import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

/**
 * Mémoïsé par React `cache()` : tous les appels dans le même rendu de page
 * (layout + sous-layouts + page) partagent la même réponse → 1 seul call réseau.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

export const getCachedProfile = cache(async (): Promise<Profile | null> => {
  const { supabase, user } = await getCachedUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  return profile ?? null;
});

export async function requireUser() {
  const ctx = await getCachedUser();
  if (!ctx.user) redirect("/login");
  return { supabase: ctx.supabase, user: ctx.user };
}

export async function requireProfile(): Promise<{
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const { supabase } = await requireUser();
  const profile = await getCachedProfile();
  if (!profile) redirect("/login");
  return { profile, supabase };
}

export async function requireAdmin() {
  const ctx = await requireProfile();
  if (!ctx.profile.is_admin) redirect("/");
  return ctx;
}
