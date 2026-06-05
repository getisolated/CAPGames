"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import type { Round } from "@/lib/supabase/types";

export type AdminAnswer = {
  round_id: string;
  option_id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  team_name: string | null;
  answered_at: string;
};

/**
 * Maintient à jour l'historique d'un salon "questions" :
 * - toutes les rounds (active + terminées)
 * - toutes les réponses (avec user, équipe, option, timestamp)
 *
 * Subscribe aux changements rounds + quiz_answers de la room.
 */
export function useQuestionsRoomHistory(
  roomId: string,
  initialRounds: Round[],
  initialAnswers: AdminAnswer[]
) {
  const [supabase] = useState(() => createClient());
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [answers, setAnswers] = useState<AdminAnswer[]>(initialAnswers);

  const refresh = useCallback(async () => {
    const { data: rData } = await supabase
      .from("rounds")
      .select("*")
      .eq("room_id", roomId)
      .order("round_number", { ascending: false });

    const fresh = (rData ?? []) as Round[];
    setRounds(fresh);

    if (fresh.length === 0) {
      setAnswers([]);
      return;
    }

    const { data: aData } = await supabase
      .from("quiz_answers")
      .select(
        "round_id, option_id, user_id, answered_at, profile:profiles(email, full_name, team:teams(name))"
      )
      .in(
        "round_id",
        fresh.map((r) => r.id)
      );

    const mapped: AdminAnswer[] = (aData ?? []).map((a) => {
      const profile = a.profile as unknown as
        | {
            email: string;
            full_name: string | null;
            team: { name: string } | { name: string }[] | null;
          }
        | null;
      const teamRaw = profile?.team ?? null;
      const team = Array.isArray(teamRaw) ? teamRaw[0] ?? null : teamRaw;
      return {
        round_id: a.round_id as string,
        option_id: a.option_id as string,
        user_id: a.user_id as string,
        user_email: profile?.email ?? "",
        user_name: profile?.full_name ?? null,
        team_name: team?.name ?? null,
        answered_at: a.answered_at as string,
      };
    });
    setAnswers(mapped);
  }, [supabase, roomId]);

  useEffect(() => {
    const channel = supabase
      .channel(`questions-history:${roomId}`)
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
        { event: "*", schema: "public", table: "quiz_answers" },
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

  return { rounds, answers };
}
