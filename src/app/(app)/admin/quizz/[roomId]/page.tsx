import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminRoomConsole } from "./admin-room-console";
import type { QuizRoom, Round, BuzzOrdered } from "@/lib/supabase/types";

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
      room={room as QuizRoom}
      pastRounds={(rounds ?? []) as Round[]}
      pastBuzzes={(buzzes ?? []) as BuzzOrdered[]}
    />
  );
}
