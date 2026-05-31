import { createClient } from "@/lib/supabase/server";
import { TeamsAdmin } from "./teams-admin";
import type { Profile, Team, TeamEmailInvite } from "@/lib/supabase/types";

export default async function AdminTeamsPage() {
  const supabase = await createClient();

  const [{ data: teams }, { data: profiles }, { data: invites }] =
    await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase
        .from("profiles")
        .select("*")
        .order("full_name", { nullsFirst: false }),
      supabase
        .from("team_email_invites")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  return (
    <TeamsAdmin
      teams={(teams ?? []) as Team[]}
      profiles={(profiles ?? []) as Profile[]}
      invites={(invites ?? []) as TeamEmailInvite[]}
    />
  );
}
