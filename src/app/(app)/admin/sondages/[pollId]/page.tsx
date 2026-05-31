import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PollEditor } from "./poll-editor";
import type { Poll, PollChoice, Team } from "@/lib/supabase/types";

export default async function AdminPollEditPage({
  params,
}: {
  params: Promise<{ pollId: string }>;
}) {
  const { pollId } = await params;
  const supabase = await createClient();

  const [{ data: poll }, { data: choices }, { data: teams }] =
    await Promise.all([
      supabase.from("polls").select("*").eq("id", pollId).maybeSingle(),
      supabase
        .from("poll_choices")
        .select("*")
        .eq("poll_id", pollId)
        .order("position"),
      supabase.from("teams").select("*").order("name"),
    ]);

  if (!poll) notFound();

  const choicesWithUrl = (choices ?? []).map((c) => {
    if (!c.image_path) return c;
    const { data } = supabase.storage
      .from("poll-choices")
      .getPublicUrl(c.image_path);
    return { ...c, image_path: data.publicUrl };
  }) as PollChoice[];

  return (
    <PollEditor
      poll={poll as Poll}
      choices={choicesWithUrl}
      teams={(teams ?? []) as Team[]}
    />
  );
}
