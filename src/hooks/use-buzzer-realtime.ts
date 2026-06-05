"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import type { BuzzOrdered, Round } from "@/lib/supabase/types";

type State = {
  activeRound: Round | null;
  buzzes: BuzzOrdered[];
};

export function useBuzzerRealtime(roomId: string) {
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<State>({ activeRound: null, buzzes: [] });

  const refresh = useCallback(async () => {
    const { data: round } = await supabase
      .from("rounds")
      .select("*")
      .eq("room_id", roomId)
      .eq("is_active", true)
      .maybeSingle();

    if (!round) {
      setState({ activeRound: null, buzzes: [] });
      return;
    }

    const { data: buzzes } = await supabase
      .from("buzzes_ordered")
      .select("*")
      .eq("round_id", round.id)
      .order("position");

    setState({
      activeRound: round as Round,
      buzzes: (buzzes ?? []) as BuzzOrdered[],
    });
  }, [supabase, roomId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${roomId}` },
        (payload) => {
          // Déverrouillage immédiat depuis l'événement, sans attendre le SELECT
          const r = payload.new as Round | null;
          if (r && r.is_active) {
            setState((s) => ({ ...s, activeRound: r }));
          }
          refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "buzzes" },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "buzzes" },
        () => refresh()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, roomId, refresh]);

  // Filet de secours : déverrouille même si l'événement Realtime est manqué.
  useRealtimeRefresh(refresh, 2000);

  return state;
}
