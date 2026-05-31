import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminRoomConsole } from "./admin-room-console";

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

  return <AdminRoomConsole room={room} />;
}
