"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";

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
    // Rollback du fichier
    await supabase.storage.from("photos").remove([path]);
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/photos");
  revalidatePath("/admin/photos");
  return { ok: true as const };
}
