"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export async function castVote(formData: FormData) {
  await requireUser();
  const pollId = String(formData.get("poll_id") ?? "");
  const choiceId = String(formData.get("choice_id") ?? "");
  if (!pollId || !choiceId)
    return { ok: false as const, error: "Données invalides." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("cast_vote", {
    p_poll_id: pollId,
    p_choice_id: choiceId,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/sondages/${pollId}`);
  return { ok: true as const };
}
