import { createClient } from "@/lib/supabase/server";
import { PointsAdmin } from "./points-admin";
import type { Team } from "@/lib/supabase/types";

export default async function AdminPointsPage() {
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .order("score", { ascending: false });

  return <PointsAdmin teams={(teams ?? []) as Team[]} />;
}
