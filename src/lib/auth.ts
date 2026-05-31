import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function requireProfile(): Promise<{
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const { supabase, user } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (error || !profile) redirect("/login");
  return { profile, supabase };
}

export async function requireAdmin() {
  const ctx = await requireProfile();
  if (!ctx.profile.is_admin) redirect("/");
  return ctx;
}
