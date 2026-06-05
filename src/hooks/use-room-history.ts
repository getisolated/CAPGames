"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import type { BuzzOrdered, Round } from "@/lib/supabase/types";

/**
 * Récupère et maintient à jour l'historique complet d'un salon :
 * - toutes les rounds (active + terminées)
 * - tous les buzzes ordonnés par round
 *
 * Subscribe aux changements rounds + buzzes pour la room.
 */
export function useRoomHistory(
  roomId: string,
  initialRounds: Round[],
  initialBuzzes: BuzzOrdered[]
) {
  const [supabase] = useState(() => createClient());
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [buzzes, setBuzzes] = useState<BuzzOrdered[]>(initialBuzzes);

  const refresh = useCallback(async () => {
    const { data: rData } = await supabase
      .from("rounds")
      .select("*")
      .eq("room_id", roomId)
      .order("round_number", { ascending: false });

    const fresh = (rData ?? []) as Round[];
    setRounds(fresh);

    if (fresh.length === 0) {
      setBuzzes([]);
      return;
    }

    const ids = fresh.map((r) => r.id);
    const { data: bData } = await supabase
      .from("buzzes_ordered")
      .select("*")
      .in("round_id", ids)
      .order("position");
    setBuzzes((bData ?? []) as BuzzOrdered[]);
  }, [supabase, roomId]);

  useEffect(() => {
    const channel = supabase
      .channel(`room-history:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `room_id=eq.${roomId}`,
        },
        () => refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "buzzes" },
        () => refresh()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, roomId, refresh]);

  useRealtimeRefresh(refresh, 3000);

  return { rounds, buzzes };
}
