"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function approvePhoto(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const albumId = String(formData.get("album_id") ?? "") || null;
  if (!id) return { ok: false as const, error: "ID requis." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("photos")
    .update({
      status: "approved",
      album_id: albumId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/photos");
  revalidatePath("/photos");
  return { ok: true as const };
}

export async function rejectPhoto(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false as const, error: "ID requis." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("photos")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/photos");
  return { ok: true as const };
}

export async function deletePhoto(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false as const, error: "ID requis." };

  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  if (photo?.storage_path) {
    await supabase.storage.from("photos").remove([photo.storage_path]);
  }

  revalidatePath("/admin/photos");
  revalidatePath("/photos");
  return { ok: true as const };
}

export async function moveToAlbum(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const albumId = String(formData.get("album_id") ?? "") || null;
  if (!id) return { ok: false as const, error: "ID requis." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("photos")
    .update({ album_id: albumId })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/photos");
  revalidatePath("/photos");
  return { ok: true as const };
}

export async function createAlbum(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false as const, error: "Nom requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("photo_albums").insert({ name });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/photos");
  revalidatePath("/photos");
  return { ok: true as const };
}

export async function deleteAlbum(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false as const, error: "ID requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("photo_albums").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/photos");
  return { ok: true as const };
}
