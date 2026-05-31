"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function createPoll(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!title) return { ok: false as const, error: "Titre requis." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("polls")
    .insert({ title, description })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/sondages");
  return { ok: true as const, id: data.id };
}

export async function updatePollStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["draft", "open", "closed"].includes(status))
    return { ok: false as const, error: "Données invalides." };

  const supabase = await createClient();
  const patch: { status: string; closed_at?: string | null } = { status };
  if (status === "closed") patch.closed_at = new Date().toISOString();
  if (status === "open") patch.closed_at = null;

  const { error } = await supabase.from("polls").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/sondages");
  revalidatePath(`/sondages/${id}`);
  return { ok: true as const };
}

export async function deletePoll(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false as const, error: "ID requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("polls").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/sondages");
  return { ok: true as const };
}

export async function createChoice(formData: FormData) {
  await requireAdmin();
  const pollId = String(formData.get("poll_id") ?? "");
  const label = String(formData.get("label") ?? "").trim() || null;
  const rawRestrictedTeam = String(formData.get("restricted_team_id") ?? "");
  const restrictedTeamId =
    rawRestrictedTeam && rawRestrictedTeam !== "__none__"
      ? rawRestrictedTeam
      : null;
  const restrictionMessage =
    String(formData.get("restriction_message") ?? "").trim() || null;
  const position = Number(formData.get("position") ?? 0);
  const image = formData.get("image");

  if (!pollId) return { ok: false as const, error: "Sondage requis." };
  if (!label && !(image instanceof File && image.size > 0))
    return {
      ok: false as const,
      error: "Au moins un libellé ou une image est requis.",
    };

  const supabase = await createClient();
  let imagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    const ext = image.name.split(".").pop() ?? "png";
    const path = `${pollId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("poll-choices")
      .upload(path, image, { contentType: image.type });
    if (upErr) return { ok: false as const, error: upErr.message };
    imagePath = path;
  }

  const { error } = await supabase.from("poll_choices").insert({
    poll_id: pollId,
    label,
    image_path: imagePath,
    restricted_team_id: restrictedTeamId,
    restriction_message: restrictionMessage,
    position,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/sondages/${pollId}`);
  return { ok: true as const };
}

export async function deleteChoice(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false as const, error: "ID requis." };

  const supabase = await createClient();
  const { data: choice } = await supabase
    .from("poll_choices")
    .select("poll_id, image_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("poll_choices").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  if (choice?.image_path) {
    await supabase.storage.from("poll-choices").remove([choice.image_path]);
  }
  revalidatePath(`/admin/sondages/${choice?.poll_id}`);
  return { ok: true as const };
}
