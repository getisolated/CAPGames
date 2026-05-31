import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PollView } from "./poll-view";
import type {
  Poll,
  PollChoice,
  PollResult,
  PollVote,
  Profile,
} from "@/lib/supabase/types";

export default async function PollPage({
  params,
}: {
  params: Promise<{ pollId: string }>;
}) {
  const { pollId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: poll }, { data: choices }, { data: myVote }, { data: profile }] =
    await Promise.all([
      supabase.from("polls").select("*").eq("id", pollId).maybeSingle(),
      supabase
        .from("poll_choices")
        .select("*")
        .eq("poll_id", pollId)
        .order("position"),
      user
        ? supabase
            .from("poll_votes")
            .select("*")
            .eq("poll_id", pollId)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      user
        ? supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  if (!poll) notFound();

  let choicesWithUrl = (choices ?? []) as PollChoice[];
  choicesWithUrl = await Promise.all(
    choicesWithUrl.map(async (c) => {
      if (!c.image_path) return c;
      const { data } = supabase.storage
        .from("poll-choices")
        .getPublicUrl(c.image_path);
      return { ...c, image_path: data.publicUrl };
    })
  );

  const isAdmin = Boolean((profile as Profile | null)?.is_admin);

  let results: PollResult[] = [];
  if (poll.status === "closed" || isAdmin) {
    const { data } = await supabase
      .from("poll_results")
      .select("*")
      .eq("poll_id", pollId);
    results = (data ?? []) as PollResult[];
  }

  return (
    <PollView
      poll={poll as Poll}
      choices={choicesWithUrl}
      myVote={(myVote ?? null) as PollVote | null}
      profile={(profile ?? null) as Profile | null}
      results={results}
      isAdmin={isAdmin}
    />
  );
}
