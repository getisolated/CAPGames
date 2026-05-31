import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/auth";
import { AdminRoomConsole } from "./admin-room-console";
import { QuestionsAdminConsole } from "./questions-admin-console";
import type { AdminAnswer } from "@/hooks/use-questions-room-history";
import type {
  BuzzOrdered,
  QuizOption,
  QuizQuestion,
  QuizRoom,
  Round,
} from "@/lib/supabase/types";

export default async function AdminRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const supabase = await createClient();

  const { data: room } = await supabase
    .from("quiz_rooms")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (!room) notFound();
  const typed = room as QuizRoom;

  if (typed.mode === "questions") {
    const { user } = await getCachedUser();
    const [
      { data: questions },
      { data: options },
      { data: roundsData },
      { data: answersData },
    ] = await Promise.all([
      supabase
        .from("quiz_questions")
        .select("*")
        .eq("room_id", roomId)
        .order("position"),
      supabase
        .from("quiz_options")
        .select("*, quiz_questions!inner(room_id)")
        .eq("quiz_questions.room_id", roomId)
        .order("position"),
      supabase
        .from("rounds")
        .select("*")
        .eq("room_id", roomId)
        .order("round_number", { ascending: false }),
      supabase
        .from("quiz_answers")
        .select(
          "round_id, option_id, user_id, answered_at, profile:profiles(email, full_name, team:teams(name)), round:rounds!inner(room_id)"
        )
        .eq("round.room_id", roomId),
    ]);

    const optionsByQuestion: Record<string, QuizOption[]> = {};
    for (const o of (options ?? []) as QuizOption[]) {
      const arr = optionsByQuestion[o.question_id] ?? [];
      arr.push(o);
      optionsByQuestion[o.question_id] = arr;
    }

    const initialAnswers: AdminAnswer[] = (answersData ?? []).map((a) => {
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

    return (
      <QuestionsAdminConsole
        room={typed}
        userId={user!.id}
        questions={(questions ?? []) as QuizQuestion[]}
        optionsByQuestion={optionsByQuestion}
        initialRounds={(roundsData ?? []) as Round[]}
        initialAnswers={initialAnswers}
      />
    );
  }

  // Mode buzzer (par défaut)
  const { data: rounds } = await supabase
    .from("rounds")
    .select("*")
    .eq("room_id", roomId)
    .order("round_number", { ascending: false });

  const roundIds = (rounds ?? []).map((r) => r.id);
  const { data: buzzes } = roundIds.length
    ? await supabase
        .from("buzzes_ordered")
        .select("*")
        .in("round_id", roundIds)
        .order("position")
    : { data: [] as BuzzOrdered[] };

  return (
    <AdminRoomConsole
      room={typed}
      pastRounds={(rounds ?? []) as Round[]}
      pastBuzzes={(buzzes ?? []) as BuzzOrdered[]}
    />
  );
}
