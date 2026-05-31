import { createClient } from "@/lib/supabase/server";
import { LeaderboardView } from "./leaderboard-view";
import type { LeaderboardRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function ClassementPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: rows }, { data: profile }] = await Promise.all([
    supabase.from("leaderboard").select("*").order("rank"),
    user
      ? supabase
          .from("profiles")
          .select("team_id, is_admin")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <LeaderboardView
      initial={(rows ?? []) as LeaderboardRow[]}
      myTeamId={profile?.team_id ?? null}
      isAdmin={Boolean(profile?.is_admin)}
    />
  );
}
