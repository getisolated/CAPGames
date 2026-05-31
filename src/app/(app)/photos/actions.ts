"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

/**
 * Upload via Server Action (legacy, gardé en fallback).
 * ⚠️ Limite Vercel ≈ 4.5 MB. Préférer registerUploadedPhoto + upload direct.
 */
export async function uploadPhoto(formData: FormData) {
  const { supabase, user } = await requireUser();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Fichier manquant." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("photos")
    .upload(path, file, { contentType: file.type });
  if (upErr) return { ok: false as const, error: upErr.message };

  const { error } = await supabase.from("photos").insert({
    storage_path: path,
    uploaded_by: user.id,
    original_filename: file.name,
    status: "pending",
  });
  if (error) {
    await supabase.storage.from("photos").remove([path]);
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/photos");
  revalidatePath("/admin/photos");
  return { ok: true as const };
}

/**
 * À appeler APRÈS un upload direct vers Supabase Storage côté client.
 * Crée juste la ligne dans la table photos avec status='pending'.
 * Pas de body lourd, donc pas de limite Vercel.
 */
export async function registerUploadedPhoto(input: {
  storage_path: string;
  original_filename: string;
}) {
  const { supabase, user } = await requireUser();

  if (!input.storage_path || !input.original_filename) {
    return { ok: false as const, error: "Paramètres manquants." };
  }
  // Sécu : on n'accepte que des paths dans le dossier de l'user.
  if (!input.storage_path.startsWith(`${user.id}/`)) {
    return { ok: false as const, error: "Chemin non autorisé." };
  }

  const { error } = await supabase.from("photos").insert({
    storage_path: input.storage_path,
    uploaded_by: user.id,
    original_filename: input.original_filename,
    status: "pending",
  });
  if (error) {
    // Best-effort rollback : on supprime le fichier orphelin.
    await supabase.storage.from("photos").remove([input.storage_path]);
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/photos");
  revalidatePath("/admin/photos");
  return { ok: true as const };
}
