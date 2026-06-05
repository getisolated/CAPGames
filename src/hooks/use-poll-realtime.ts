"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import type { Poll, PollResult, PollStatus } from "@/lib/supabase/types";

type PollLiveState = {
  status: PollStatus;
  results: PollResult[];
};

/**
 * Suit en temps réel le statut d'un sondage (ouvert/clôturé par l'admin) et
 * ses résultats agrégés. Permet aux joueurs de voir les résultats apparaître
 * instantanément quand l'admin clôture, et la jauge bouger quand on est admin.
 */
export function usePollRealtime(
  poll: Poll,
  initialResults: PollResult[]
) {
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<PollLiveState>({
    status: poll.status,
    results: initialResults,
  });

  const refresh = useCallback(async () => {
    const [{ data: pollRow }, { data: results }] = await Promise.all([
      supabase.from("polls").select("status").eq("id", poll.id).maybeSingle(),
      supabase.from("poll_results").select("*").eq("poll_id", poll.id),
    ]);
    setState({
      status: (pollRow?.status as PollStatus | undefined) ?? poll.status,
      results: (results ?? []) as PollResult[],
    });
  }, [supabase, poll.id, poll.status]);

  useEffect(() => {
    const channel = supabase
      .channel(`poll-live:${poll.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "polls",
          filter: `id=eq.${poll.id}`,
        },
        () => refresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_votes",
          filter: `poll_id=eq.${poll.id}`,
        },
        () => refresh()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, poll.id, refresh]);

  useRealtimeRefresh(refresh, 2500);

  return state;
}
