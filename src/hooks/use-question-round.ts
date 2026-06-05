"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";
import type {
  QuizAnswerCount,
  QuizOption,
  QuizQuestion,
  Round,
} from "@/lib/supabase/types";

export type ActiveQuestionState = {
  round: Round | null;
  question: QuizQuestion | null;
  options: QuizOption[];
  counts: QuizAnswerCount[];
  myOptionId: string | null;
};

/**
 * Surveille la manche active d'un salon "questions" et toutes ses données :
 * - la manche courante (subscription rounds)
 * - la question liée
 * - les options de la question
 * - les votes en cours (vue quiz_answers_count)
 * - le vote de l'utilisateur courant
 */
export function useQuestionRound(roomId: string, userId: string) {
  const [supabase] = useState(() => createClient());
  const [state, setState] = useState<ActiveQuestionState>({
    round: null,
    question: null,
    options: [],
    counts: [],
    myOptionId: null,
  });

  const refresh = useCallback(async () => {
    const { data: round } = await supabase
      .from("rounds")
      .select("*")
      .eq("room_id", roomId)
      .eq("is_active", true)
      .maybeSingle();

    if (!round || !round.question_id) {
      setState({
        round: (round as Round | null) ?? null,
        question: null,
        options: [],
        counts: [],
        myOptionId: null,
      });
      return;
    }

    const [
      { data: question },
      { data: options },
      { data: counts },
      { data: myAnswer },
    ] = await Promise.all([
      supabase
        .from("quiz_questions")
        .select("*")
        .eq("id", round.question_id)
        .maybeSingle(),
      supabase
        .from("quiz_options")
        .select("*")
        .eq("question_id", round.question_id)
        .order("position"),
      supabase
        .from("quiz_answers_count")
        .select("*")
        .eq("round_id", round.id),
      supabase
        .from("quiz_answers")
        .select("option_id")
        .eq("round_id", round.id)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    // Résout les chemins storage → URLs publiques (bucket quiz-media)
    const toPublicUrl = (path: string | null) =>
      path
        ? supabase.storage.from("quiz-media").getPublicUrl(path).data.publicUrl
        : null;

    const q = question as QuizQuestion | null;
    const questionResolved = q
      ? { ...q, image_path: toPublicUrl(q.image_path) }
      : null;
    const optionsResolved = ((options ?? []) as QuizOption[]).map((o) => ({
      ...o,
      image_path: toPublicUrl(o.image_path),
    }));

    setState({
      round: round as Round,
      question: questionResolved,
      options: optionsResolved,
      counts: (counts ?? []) as QuizAnswerCount[],
      myOptionId: (myAnswer?.option_id as string | null) ?? null,
    });
  }, [supabase, roomId, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const channel = supabase
      .channel(`question-round:${roomId}`)
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

  useRealtimeRefresh(refresh, 2000);

  return state;
}
