import { createClient } from "@/lib/supabase/server";
import { PointsAdmin } from "./points-admin";
import type { LeaderboardRow } from "@/lib/supabase/types";

export default async function AdminPointsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("leaderboard")
    .select("*")
    .order("rank");

  return <PointsAdmin initial={(rows ?? []) as LeaderboardRow[]} />;
}
