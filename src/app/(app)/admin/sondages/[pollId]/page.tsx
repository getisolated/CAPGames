import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PollEditor } from "./poll-editor";
import type { Poll, PollChoice, Team } from "@/lib/supabase/types";

export type PollVoteDetail = {
  choice_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string;
};

export default async function AdminPollEditPage({
  params,
}: {
  params: Promise<{ pollId: string }>;
}) {
  const { pollId } = await params;
  const supabase = await createClient();

  const [{ data: poll }, { data: choices }, { data: teams }, { data: voteRows }] =
    await Promise.all([
      supabase.from("polls").select("*").eq("id", pollId).maybeSingle(),
      supabase
        .from("poll_choices")
        .select("*")
        .eq("poll_id", pollId)
        .order("position"),
      supabase.from("teams").select("*").order("name"),
      supabase
        .from("poll_votes")
        .select("choice_id, user_id, profile:profiles(email, full_name)")
        .eq("poll_id", pollId),
    ]);

  if (!poll) notFound();

  const choicesWithUrl = (choices ?? []).map((c) => {
    if (!c.image_path) return c;
    const { data } = supabase.storage
      .from("poll-choices")
      .getPublicUrl(c.image_path);
    return { ...c, image_path: data.publicUrl };
  }) as PollChoice[];

  const votes: PollVoteDetail[] = (voteRows ?? []).map((v) => {
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

  return (
    <div style={{ padding: "0 22px" }}>
      <PollEditor
        poll={poll as Poll}
        choices={choicesWithUrl}
        teams={(teams ?? []) as Team[]}
        votes={votes}
      />
    </div>
  );
}
