import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BuzzerRoom } from "./buzzer-room";
import { QuestionRoom } from "./question-room";
import type { QuizRoom, Team } from "@/lib/supabase/types";

export default async function BuzzerRoomPage({
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
  const typedRoom = room as QuizRoom;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("team:teams(*)")
    .eq("id", user!.id)
    .single();

  const teamRaw = profile?.team as unknown as Team | Team[] | null | undefined;
  const team: Team | null = Array.isArray(teamRaw)
    ? (teamRaw[0] ?? null)
    : (teamRaw ?? null);

  if (typedRoom.mode === "questions") {
    return <QuestionRoom room={typedRoom} userId={user!.id} team={team} />;
  }

  return <BuzzerRoom room={typedRoom} userId={user!.id} team={team} />;
}
