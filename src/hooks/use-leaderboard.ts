"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import type { LeaderboardRow } from "@/lib/supabase/types";

export function useLeaderboard(initial: LeaderboardRow[]) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<LeaderboardRow[]>(initial);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("leaderboard")
      .select("*")
      .order("rank");
    setRows((data ?? []) as LeaderboardRow[]);
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("teams-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        () => refresh()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  useRealtimeRefresh(refresh, 4000);

  return rows;
}
