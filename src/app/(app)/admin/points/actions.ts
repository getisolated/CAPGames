"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function adjustScore(formData: FormData) {
  await requireAdmin();
  const teamId = String(formData.get("team_id") ?? "");
  const delta = Number(formData.get("delta") ?? 0);
  if (!teamId || !Number.isFinite(delta) || delta === 0)
    return { ok: false as const, error: "Données invalides." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("adjust_team_score", {
    p_team_id: teamId,
    p_delta: delta,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/points");
  revalidatePath("/classement");
  return { ok: true as const };
}
