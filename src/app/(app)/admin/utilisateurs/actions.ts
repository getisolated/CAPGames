"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function setAdmin(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const value = String(formData.get("is_admin") ?? "") === "true";
  if (!userId) return { ok: false as const, error: "Utilisateur requis." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_admin", {
    p_user_id: userId,
    p_is_admin: value,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/utilisateurs");
  return { ok: true as const };
}
