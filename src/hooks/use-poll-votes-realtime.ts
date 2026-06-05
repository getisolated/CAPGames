"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import type { PollVoteDetail } from "@/app/(app)/admin/sondages/[pollId]/page";

/**
 * Subscribe à poll_votes pour un poll donné. Refetch avec join sur profiles
 * à chaque INSERT/DELETE.
 */
export function usePollVotesRealtime(
  pollId: string,
  initial: PollVoteDetail[]
) {
  const [supabase] = useState(() => createClient());
  const [votes, setVotes] = useState<PollVoteDetail[]>(initial);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("poll_votes")
      .select("choice_id, user_id, profile:profiles(email, full_name)")
      .eq("poll_id", pollId);

    const next: PollVoteDetail[] = (data ?? []).map((v) => {
      const profile = v.profile as unknown as
        | { email: string; full_name: string | null }
        | { email: string; full_name: string | null }[]
        | null;
      const p = Array.isArray(profile) ? (profile[0] ?? null) : profile;
      return {
        choice_id: v.choice_id as string,
        user_id: v.user_id as string,
        user_name: p?.full_name ?? null,
        user_email: p?.email ?? "",
      };
    });
    setVotes(next);
  }, [supabase, pollId]);

  useEffect(() => {
    const channel = supabase
      .channel(`poll-votes:${pollId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "poll_votes",
          filter: `poll_id=eq.${pollId}`,
        },
        () => refresh()
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, pollId, refresh]);

  useRealtimeRefresh(refresh, 3000);

  return votes;
}
