"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function createRoom(formData: FormData) {
  const { profile } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "ember");
  const icon = String(formData.get("icon") ?? "buzzer");
  if (!name) return { ok: false as const, error: "Nom requis." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("quiz_rooms")
    .insert({ name, color, icon, created_by: profile.id });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/quizz");
  return { ok: true as const };
}

export async function setRoomStyle(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const color = String(formData.get("color") ?? "");
  const icon = String(formData.get("icon") ?? "");
  if (!id) return { ok: false as const, error: "ID requis." };

  const patch: { color?: string; icon?: string } = {};
  if (color) patch.color = color;
  if (icon) patch.icon = icon;

  const supabase = await createClient();
  const { error } = await supabase
    .from("quiz_rooms")
    .update(patch)
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/quizz`);
  revalidatePath(`/admin/quizz/${id}`);
  return { ok: true as const };
}

export async function setRoomStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["draft", "open", "closed"].includes(status))
    return { ok: false as const, error: "Données invalides." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("quiz_rooms")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/quizz");
  return { ok: true as const };
}

export async function deleteRoom(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false as const, error: "ID requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("quiz_rooms").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/quizz");
  return { ok: true as const };
}

export async function startRound(formData: FormData) {
  await requireAdmin();
  const roomId = String(formData.get("room_id") ?? "");
  if (!roomId) return { ok: false as const, error: "Salon requis." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_round", { p_room_id: roomId });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/quizz/${roomId}`);
  return { ok: true as const };
}

export async function endRound(formData: FormData) {
  await requireAdmin();
  const roomId = String(formData.get("room_id") ?? "");
  if (!roomId) return { ok: false as const, error: "Salon requis." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("end_round", { p_room_id: roomId });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/quizz/${roomId}`);
  return { ok: true as const };
}

export async function setBuzzerStyle(formData: FormData) {
  await requireAdmin();
  const roomId = String(formData.get("room_id") ?? "");
  const style = String(formData.get("style") ?? "");
  if (!roomId || !["circle", "arcade", "physical"].includes(style)) {
    return { ok: false as const, error: "Données invalides." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("quiz_rooms")
    .update({ buzzer_style: style })
    .eq("id", roomId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/admin/quizz/${roomId}`);
  return { ok: true as const };
}
