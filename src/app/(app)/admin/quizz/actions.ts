"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function createRoom(formData: FormData) {
  const { profile } = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "ember");
  const icon = String(formData.get("icon") ?? "buzzer");
  const mode = String(formData.get("mode") ?? "buzzer");
  if (!name) return { ok: false as const, error: "Nom requis." };
  if (mode !== "buzzer" && mode !== "questions") {
    return { ok: false as const, error: "Mode invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("quiz_rooms")
    .insert({ name, color, icon, mode, created_by: profile.id });
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

// ============================================================
// Mode "questions"
// ============================================================
export async function createQuestion(formData: FormData) {
  await requireAdmin();
  const roomId = String(formData.get("room_id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const position = Number(formData.get("position") ?? 0);
  if (!roomId || !text) {
    return { ok: false as const, error: "Room et texte requis." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_questions")
    .insert({ room_id: roomId, text, position })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/admin/quizz/${roomId}`);
  return { ok: true as const, id: data.id };
}

export async function deleteQuestion(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false as const, error: "ID requis." };
  const supabase = await createClient();
  const { data: q } = await supabase
    .from("quiz_questions")
    .select("room_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  if (q?.room_id) revalidatePath(`/admin/quizz/${q.room_id}`);
  return { ok: true as const };
}

export async function createOption(formData: FormData) {
  await requireAdmin();
  const questionId = String(formData.get("question_id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const isCorrect = String(formData.get("is_correct") ?? "") === "true";
  const position = Number(formData.get("position") ?? 0);
  if (!questionId || !label) {
    return { ok: false as const, error: "Question et libellé requis." };
  }
  const supabase = await createClient();
  const { data: q } = await supabase
    .from("quiz_questions")
    .select("room_id")
    .eq("id", questionId)
    .maybeSingle();
  const { error } = await supabase
    .from("quiz_options")
    .insert({ question_id: questionId, label, is_correct: isCorrect, position });
  if (error) return { ok: false as const, error: error.message };
  if (q?.room_id) revalidatePath(`/admin/quizz/${q.room_id}`);
  return { ok: true as const };
}

export async function toggleOptionCorrect(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const isCorrect = String(formData.get("is_correct") ?? "") === "true";
  if (!id) return { ok: false as const, error: "ID requis." };
  const supabase = await createClient();
  const { data: opt } = await supabase
    .from("quiz_options")
    .select("question_id, quiz_questions!inner(room_id)")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("quiz_options")
    .update({ is_correct: isCorrect })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  const room = opt?.quiz_questions as unknown as
    | { room_id: string }
    | { room_id: string }[]
    | null;
  const roomId = Array.isArray(room) ? room[0]?.room_id : room?.room_id;
  if (roomId) revalidatePath(`/admin/quizz/${roomId}`);
  return { ok: true as const };
}

export async function deleteOption(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false as const, error: "ID requis." };
  const supabase = await createClient();
  const { error } = await supabase.from("quiz_options").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function startQuestionRound(formData: FormData) {
  await requireAdmin();
  const roomId = String(formData.get("room_id") ?? "");
  const questionId = String(formData.get("question_id") ?? "");
  if (!roomId || !questionId) {
    return { ok: false as const, error: "Room et question requis." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_question_round", {
    p_room_id: roomId,
    p_question_id: questionId,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/admin/quizz/${roomId}`);
  return { ok: true as const };
}

export async function endQuestionRound(formData: FormData) {
  await requireAdmin();
  const roomId = String(formData.get("room_id") ?? "");
  if (!roomId) return { ok: false as const, error: "Room requis." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_question_round", { p_room_id: roomId });
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
