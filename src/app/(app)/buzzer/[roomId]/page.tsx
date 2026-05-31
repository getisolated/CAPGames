import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BuzzerRoom } from "./buzzer-room";
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

  return (
    <BuzzerRoom
      room={room as QuizRoom}
      userId={user!.id}
      team={team}
    />
  );
}
