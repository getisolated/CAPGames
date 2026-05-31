"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function createTeam(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false as const, error: "Nom requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("teams").insert({ name });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/equipes");
  return { ok: true as const };
}

export async function updateTeam(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { ok: false as const, error: "Données invalides." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ name })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/equipes");
  return { ok: true as const };
}

export async function deleteTeam(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false as const, error: "ID requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("teams").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/equipes");
  return { ok: true as const };
}

export async function uploadTeamLogo(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("team_id") ?? "");
  const file = formData.get("logo");
  if (!teamId || !(file instanceof File) || file.size === 0)
    return { ok: false as const, error: "Logo manquant." };

  const supabase = await createClient();
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${teamId}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("team-logos")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) return { ok: false as const, error: upErr.message };

  const { data: pub } = supabase.storage.from("team-logos").getPublicUrl(path);
  const { error } = await supabase
    .from("teams")
    .update({ logo_url: pub.publicUrl })
    .eq("id", teamId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/equipes");
  return { ok: true as const };
}

export async function assignUserToTeam(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const teamId = String(formData.get("team_id") ?? "");
  if (!userId) return { ok: false as const, error: "Utilisateur requis." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ team_id: teamId || null })
    .eq("id", userId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/equipes");
  return { ok: true as const };
}

export async function addEmailInvite(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const teamId = String(formData.get("team_id") ?? "");
  if (!email || !teamId)
    return { ok: false as const, error: "E-mail et équipe requis." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_email_invites")
    .upsert({ email, team_id: teamId }, { onConflict: "email" });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/equipes");
  return { ok: true as const };
}

export async function removeEmailInvite(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false as const, error: "ID requis." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("team_email_invites")
    .delete()
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/equipes");
  return { ok: true as const };
}
