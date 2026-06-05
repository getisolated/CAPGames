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
async function uploadQuizMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prefix: string,
  image: File
): Promise<{ path: string } | { error: string }> {
  const ext = image.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = `${prefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("quiz-media")
    .upload(path, image, { contentType: image.type });
  if (error) return { error: error.message };
  return { path };
}

export async function createQuestion(formData: FormData) {
  await requireAdmin();
  const roomId = String(formData.get("room_id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  const revealMessage =
    String(formData.get("reveal_message") ?? "").trim() || null;
  const position = Number(formData.get("position") ?? 0);
  const image = formData.get("image");
  if (!roomId || !text) {
    return { ok: false as const, error: "Room et texte requis." };
  }

  const supabase = await createClient();

  let imagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    const res = await uploadQuizMedia(supabase, `q/${roomId}`, image);
    if ("error" in res) return { ok: false as const, error: res.error };
    imagePath = res.path;
  }

  const { data, error } = await supabase
    .from("quiz_questions")
    .insert({
      room_id: roomId,
      text,
      position,
      image_path: imagePath,
      reveal_message: revealMessage,
    })
    .select("id")
    .single();
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/admin/quizz/${roomId}`);
  return { ok: true as const, id: data.id };
}

export async function updateQuestionReveal(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const revealMessage =
    String(formData.get("reveal_message") ?? "").trim() || null;
  if (!id) return { ok: false as const, error: "ID requis." };
  const supabase = await createClient();
  const { data: q } = await supabase
    .from("quiz_questions")
    .select("room_id")
    .eq("id", id)
    .maybeSingle();
  if (!q) return { ok: false as const, error: "Question introuvable." };
  if (await questionIsLive(supabase, id)) {
    return { ok: false as const, error: QUESTION_LIVE_ERROR };
  }
  const { error } = await supabase
    .from("quiz_questions")
    .update({ reveal_message: revealMessage })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  if (q.room_id) revalidatePath(`/admin/quizz/${q.room_id}`);
  return { ok: true as const };
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
  const image = formData.get("image");
  if (!questionId || !label) {
    return { ok: false as const, error: "Question et libellé requis." };
  }
  const supabase = await createClient();
  const { data: q } = await supabase
    .from("quiz_questions")
    .select("room_id")
    .eq("id", questionId)
    .maybeSingle();

  let imagePath: string | null = null;
  if (image instanceof File && image.size > 0) {
    const res = await uploadQuizMedia(supabase, `o/${questionId}`, image);
    if ("error" in res) return { ok: false as const, error: res.error };
    imagePath = res.path;
  }

  const { error } = await supabase.from("quiz_options").insert({
    question_id: questionId,
    label,
    is_correct: isCorrect,
    image_path: imagePath,
    position,
  });
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

// ============================================================
// Édition des photos (question + options) après création.
// Autorisée uniquement quand la question n'est pas affichée aux
// participants (aucune manche active sur cette question).
// ============================================================
const QUESTION_LIVE_ERROR =
  "Question affichée aux participants : édition impossible.";

async function questionIsLive(
  supabase: Awaited<ReturnType<typeof createClient>>,
  questionId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("rounds")
    .select("id")
    .eq("question_id", questionId)
    .eq("is_active", true)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function optionContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
) {
  const { data: opt } = await supabase
    .from("quiz_options")
    .select("question_id, image_path, quiz_questions!inner(room_id)")
    .eq("id", id)
    .maybeSingle();
  if (!opt) return null;
  const room = opt.quiz_questions as unknown as
    | { room_id: string }
    | { room_id: string }[]
    | null;
  const roomId = Array.isArray(room) ? room[0]?.room_id : room?.room_id;
  return {
    questionId: opt.question_id as string,
    imagePath: (opt.image_path as string | null) ?? null,
    roomId: roomId ?? null,
  };
}

export async function updateQuestionImage(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const image = formData.get("image");
  if (!id) return { ok: false as const, error: "ID requis." };
  if (!(image instanceof File) || image.size === 0) {
    return { ok: false as const, error: "Image requise." };
  }
  const supabase = await createClient();
  const { data: q } = await supabase
    .from("quiz_questions")
    .select("room_id, image_path")
    .eq("id", id)
    .maybeSingle();
  if (!q) return { ok: false as const, error: "Question introuvable." };
  if (await questionIsLive(supabase, id)) {
    return { ok: false as const, error: QUESTION_LIVE_ERROR };
  }
  const res = await uploadQuizMedia(supabase, `q/${q.room_id}`, image);
  if ("error" in res) return { ok: false as const, error: res.error };
  const { error } = await supabase
    .from("quiz_questions")
    .update({ image_path: res.path })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  if (q.image_path) {
    await supabase.storage.from("quiz-media").remove([q.image_path]);
  }
  revalidatePath(`/admin/quizz/${q.room_id}`);
  return { ok: true as const };
}

export async function removeQuestionImage(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false as const, error: "ID requis." };
  const supabase = await createClient();
  const { data: q } = await supabase
    .from("quiz_questions")
    .select("room_id, image_path")
    .eq("id", id)
    .maybeSingle();
  if (!q) return { ok: false as const, error: "Question introuvable." };
  if (await questionIsLive(supabase, id)) {
    return { ok: false as const, error: QUESTION_LIVE_ERROR };
  }
  const { error } = await supabase
    .from("quiz_questions")
    .update({ image_path: null })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  if (q.image_path) {
    await supabase.storage.from("quiz-media").remove([q.image_path]);
  }
  revalidatePath(`/admin/quizz/${q.room_id}`);
  return { ok: true as const };
}

export async function updateOptionImage(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const image = formData.get("image");
  if (!id) return { ok: false as const, error: "ID requis." };
  if (!(image instanceof File) || image.size === 0) {
    return { ok: false as const, error: "Image requise." };
  }
  const supabase = await createClient();
  const ctx = await optionContext(supabase, id);
  if (!ctx) return { ok: false as const, error: "Option introuvable." };
  if (await questionIsLive(supabase, ctx.questionId)) {
    return { ok: false as const, error: QUESTION_LIVE_ERROR };
  }
  const res = await uploadQuizMedia(supabase, `o/${ctx.questionId}`, image);
  if ("error" in res) return { ok: false as const, error: res.error };
  const { error } = await supabase
    .from("quiz_options")
    .update({ image_path: res.path })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  if (ctx.imagePath) {
    await supabase.storage.from("quiz-media").remove([ctx.imagePath]);
  }
  if (ctx.roomId) revalidatePath(`/admin/quizz/${ctx.roomId}`);
  return { ok: true as const };
}

export async function removeOptionImage(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false as const, error: "ID requis." };
  const supabase = await createClient();
  const ctx = await optionContext(supabase, id);
  if (!ctx) return { ok: false as const, error: "Option introuvable." };
  if (await questionIsLive(supabase, ctx.questionId)) {
    return { ok: false as const, error: QUESTION_LIVE_ERROR };
  }
  const { error } = await supabase
    .from("quiz_options")
    .update({ image_path: null })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  if (ctx.imagePath) {
    await supabase.storage.from("quiz-media").remove([ctx.imagePath]);
  }
  if (ctx.roomId) revalidatePath(`/admin/quizz/${ctx.roomId}`);
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

export async function revealQuestionRound(formData: FormData) {
  await requireAdmin();
  const roomId = String(formData.get("room_id") ?? "");
  if (!roomId) return { ok: false as const, error: "Room requis." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reveal_question_round", {
    p_room_id: roomId,
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

export async function updateQuestionText(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!id) return { ok: false as const, error: "ID requis." };
  if (!text) return { ok: false as const, error: "Énoncé requis." };
  const supabase = await createClient();
  const { data: q } = await supabase
    .from("quiz_questions")
    .select("room_id")
    .eq("id", id)
    .maybeSingle();
  if (!q) return { ok: false as const, error: "Question introuvable." };
  if (await questionIsLive(supabase, id)) {
    return { ok: false as const, error: QUESTION_LIVE_ERROR };
  }
  const { error } = await supabase
    .from("quiz_questions")
    .update({ text })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/admin/quizz/${q.room_id}`);
  return { ok: true as const };
}

export async function updateOptionLabel(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!id) return { ok: false as const, error: "ID requis." };
  if (!label) return { ok: false as const, error: "Libellé requis." };
  const supabase = await createClient();
  const ctx = await optionContext(supabase, id);
  if (!ctx) return { ok: false as const, error: "Option introuvable." };
  if (await questionIsLive(supabase, ctx.questionId)) {
    return { ok: false as const, error: QUESTION_LIVE_ERROR };
  }
  const { error } = await supabase
    .from("quiz_options")
    .update({ label })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  if (ctx.roomId) revalidatePath(`/admin/quizz/${ctx.roomId}`);
  return { ok: true as const };
}

export async function clearRoomHistory(formData: FormData) {
  await requireAdmin();
  const roomId = String(formData.get("room_id") ?? "");
  if (!roomId) return { ok: false as const, error: "Salon requis." };
  const supabase = await createClient();

  // Refus si une manche est en cours : on efface entre deux parties.
  const { data: active } = await supabase
    .from("rounds")
    .select("id")
    .eq("room_id", roomId)
    .eq("is_active", true)
    .limit(1);
  if ((active?.length ?? 0) > 0) {
    return {
      ok: false as const,
      error: "Termine la manche en cours avant d'effacer l'historique.",
    };
  }

  // Supprime toutes les manches du salon → cascade sur quiz_answers et buzzes.
  // Réinitialise aussi l'état « déjà jouée » (dérivé des manches terminées).
  const { error } = await supabase.from("rounds").delete().eq("room_id", roomId);
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
