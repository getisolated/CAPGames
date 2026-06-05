"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/cap/icons";
import { ActionForm } from "@/components/cap/action-form";
import { useQuestionRound } from "@/hooks/use-question-round";
import {
  useQuestionsRoomHistory,
  type AdminAnswer,
} from "@/hooks/use-questions-room-history";
import { formatUserName } from "@/lib/user-name";
import {
  createOption,
  createQuestion,
  deleteOption,
  deleteQuestion,
  endQuestionRound,
  removeOptionImage,
  removeQuestionImage,
  revealQuestionRound,
  startQuestionRound,
  toggleOptionCorrect,
  updateOptionImage,
  updateQuestionImage,
} from "../actions";
import type {
  QuizOption,
  QuizQuestion,
  QuizRoom,
  Round,
} from "@/lib/supabase/types";

export function QuestionsAdminConsole({
  room,
  userId,
  questions,
  optionsByQuestion,
  initialRounds,
  initialAnswers,
}: {
  room: QuizRoom;
  userId: string;
  questions: QuizQuestion[];
  optionsByQuestion: Record<string, QuizOption[]>;
  initialRounds: Round[];
  initialAnswers: AdminAnswer[];
}) {
  const { round, question, options, counts, myOptionId } = useQuestionRound(
    room.id,
    userId
  );
  const { rounds: allRounds, answers: allAnswers } = useQuestionsRoomHistory(
    room.id,
    initialRounds,
    initialAnswers
  );
  const [isPending, startTransition] = useTransition();

  const totalVotes = useMemo(
    () => counts.reduce((s, c) => s + c.n_votes, 0),
    [counts]
  );

  const finishedRounds = useMemo(
    () => allRounds.filter((r) => !r.is_active),
    [allRounds]
  );

  // Questions déjà jouées = celles avec au moins une manche terminée
  const playedQuestionIds = useMemo(() => {
    const s = new Set<string>();
    for (const r of finishedRounds) {
      if (r.question_id) s.add(r.question_id);
    }
    return s;
  }, [finishedRounds]);

  const answersByRound = useMemo(() => {
    const m = new Map<string, AdminAnswer[]>();
    for (const a of allAnswers) {
      const arr = m.get(a.round_id) ?? [];
      arr.push(a);
      m.set(a.round_id, arr);
    }
    return m;
  }, [allAnswers]);

  const optionsById = useMemo(() => {
    const m = new Map<string, QuizOption>();
    for (const list of Object.values(optionsByQuestion)) {
      for (const o of list) m.set(o.id, o);
    }
    return m;
  }, [optionsByQuestion]);

  const questionsById = useMemo(() => {
    const m = new Map<string, QuizQuestion>();
    for (const q of questions) m.set(q.id, q);
    return m;
  }, [questions]);

  const isRevealed = round?.revealed ?? false;

  function launch(questionId: string) {
    const fd = new FormData();
    fd.set("room_id", room.id);
    fd.set("question_id", questionId);
    startTransition(async () => {
      const res = await startQuestionRound(fd);
      if (!res.ok) toast.error(res.error ?? "Erreur");
      else toast.success("Manche lancée.");
    });
  }

  function reveal() {
    const fd = new FormData();
    fd.set("room_id", room.id);
    startTransition(async () => {
      const res = await revealQuestionRound(fd);
      if (!res.ok) toast.error(res.error ?? "Erreur");
      else toast.success("Réponses révélées à tous.");
    });
  }

  function endRound() {
    const fd = new FormData();
    fd.set("room_id", room.id);
    startTransition(async () => {
      const res = await endQuestionRound(fd);
      if (!res.ok) toast.error(res.error ?? "Erreur");
      else toast.success("Manche terminée.");
    });
  }

  return (
    <div className="ad-quizz">
      <div className="ad-now card">
        <div className="ad-now-head">
          <div className="t-eyebrow">SALON QUESTIONS</div>
          <span
            className={
              "chip " +
              (room.status === "open"
                ? "live"
                : room.status === "closed"
                  ? "gold"
                  : "")
            }
          >
            {room.status}
          </span>
        </div>
        <div className="ad-now-title t-display">{room.name}</div>

        {round && question ? (
          <>
            <div className="ad-phase-row">
              <span className={"ad-phase-pill " + (isRevealed ? "buzzed" : "live")}>
                MANCHE {round.round_number} · {isRevealed ? "RÉVÉLÉE" : "VOTE OUVERT"}
              </span>
            </div>
            <div
              style={{
                marginTop: 10,
                padding: 14,
                background: "oklch(100% 0 0 / 0.04)",
                border: "1px solid oklch(100% 0 0 / 0.08)",
                borderRadius: 16,
              }}
            >
              <div
                className="t-mono"
                style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.18em" }}
              >
                QUESTION
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>
                {question.text}
              </div>
              {question.image_path && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={question.image_path}
                  alt=""
                  style={{
                    width: "100%",
                    maxHeight: 200,
                    objectFit: "cover",
                    borderRadius: 12,
                    marginTop: 10,
                  }}
                />
              )}
              <div
                style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}
              >
                {options.map((o) => {
                  const c = counts.find((x) => x.option_id === o.id);
                  const n = c?.n_votes ?? 0;
                  const pct = totalVotes > 0 ? Math.round((n / totalVotes) * 100) : 0;
                  return (
                    <div key={o.id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          marginBottom: 4,
                        }}
                      >
                        <span>
                          {o.label}
                          {o.is_correct && (
                            <span
                              className="chip green"
                              style={{ marginLeft: 8, fontSize: 9 }}
                            >
                              ✓ BONNE
                            </span>
                          )}
                        </span>
                        <span
                          className="t-mono"
                          style={{ color: "var(--tertiary-glow)", fontSize: 11 }}
                        >
                          {n} · {pct}%
                        </span>
                      </div>
                      <div className="pl-card-bar" style={{ marginTop: 0 }}>
                        <div
                          className="pl-card-bar-fill"
                          style={{
                            width: pct + "%",
                            background: o.is_correct
                              ? "var(--success)"
                              : "var(--primary)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {isRevealed && question.reveal_message && (
                <div
                  style={{
                    marginTop: 12,
                    padding: "10px 12px",
                    background: "oklch(70% 0.14 57 / 0.1)",
                    border: "1px solid oklch(70% 0.14 57 / 0.3)",
                    borderRadius: 12,
                    fontSize: 13,
                    color: "var(--tertiary-glow)",
                  }}
                >
                  {question.reveal_message}
                </div>
              )}
            </div>
            <div className="ad-phase-actions" style={{ marginTop: 12 }}>
              {!isRevealed && (
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={reveal}
                  disabled={isPending}
                >
                  <Icon.Sparkle /> Révéler les réponses à tous
                </button>
              )}
              <button
                type="button"
                className={isRevealed ? "btn btn-primary" : "btn btn-ghost"}
                onClick={endRound}
                disabled={isPending}
              >
                <Icon.Check /> Terminer la manche
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="ad-phase-row">
              <span className="ad-phase-pill waiting">
                AUCUNE MANCHE ACTIVE
              </span>
            </div>
            <p
              className="t-mono"
              style={{
                marginTop: 12,
                fontSize: 11,
                color: "var(--text-3)",
                letterSpacing: "0.1em",
              }}
            >
              {questions.length === 0
                ? "Ajoute des questions ci-dessous pour pouvoir lancer une manche."
                : "Choisis une question dans la liste ci-dessous et clique « Lancer »."}
            </p>
          </>
        )}
        <span style={{ display: "none" }}>{myOptionId}</span>
      </div>

      <div className="ad-buzzes">
        <div className="ad-section-head">
          <div className="t-eyebrow">Questions du salon</div>
          <span className="ad-section-sub">{questions.length}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {questions.map((q) => {
            const qOptions = optionsByQuestion[q.id] ?? [];
            const isActive = round?.question_id === q.id;
            const alreadyPlayed = playedQuestionIds.has(q.id);
            // Photos modifiables tant que la question n'est pas affichée
            // (= pas la question de la manche active en cours).
            const editable = !isActive;
            return (
              <div key={q.id} className="card" style={{ padding: "14px 16px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{q.text}</div>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 4,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span
                        className="t-mono"
                        style={{
                          fontSize: 10,
                          color: "var(--text-3)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {qOptions.length} OPTION{qOptions.length > 1 ? "S" : ""}
                      </span>
                      {isActive && <span className="chip live">LIVE</span>}
                      {alreadyPlayed && !isActive && (
                        <span className="chip gold">DÉJÀ JOUÉE</span>
                      )}
                    </div>
                  </div>
                  {!round && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ height: 36, padding: "0 12px", fontSize: 12 }}
                      onClick={() => launch(q.id)}
                      disabled={isPending || qOptions.length === 0}
                    >
                      {alreadyPlayed ? "Rejouer" : "Lancer"} <Icon.ArrowRight />
                    </button>
                  )}
                  <ActionForm action={deleteQuestion} successMsg="Question supprimée.">
                    <input type="hidden" name="id" value={q.id} />
                    <button
                      type="submit"
                      className="ad-mini-btn bad"
                      aria-label="Supprimer"
                    >
                      <Icon.X />
                    </button>
                  </ActionForm>
                </div>

                <QuestionImage question={q} editable={editable} />

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {qOptions.map((o) => (
                    <li
                      key={o.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        background: o.is_correct
                          ? "oklch(70% 0.16 145 / 0.1)"
                          : "oklch(100% 0 0 / 0.03)",
                        border: o.is_correct
                          ? "1px solid oklch(70% 0.16 145 / 0.35)"
                          : "1px solid oklch(100% 0 0 / 0.05)",
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    >
                      <OptionPhoto option={o} editable={editable} />
                      <span style={{ flex: 1 }}>{o.label}</span>
                      <ActionForm action={toggleOptionCorrect} successMsg={null}>
                        <input type="hidden" name="id" value={o.id} />
                        <input
                          type="hidden"
                          name="is_correct"
                          value={String(!o.is_correct)}
                        />
                        <button
                          type="submit"
                          className="chip"
                          style={{
                            cursor: "pointer",
                            background: o.is_correct
                              ? "var(--success)"
                              : "oklch(100% 0 0 / 0.05)",
                            color: o.is_correct
                              ? "oklch(15% 0.04 145)"
                              : "var(--text-3)",
                            border: 0,
                          }}
                          aria-label={
                            o.is_correct ? "Retirer bonne réponse" : "Marquer bonne réponse"
                          }
                        >
                          {o.is_correct ? "✓ BONNE" : "○ NON"}
                        </button>
                      </ActionForm>
                      <ActionForm action={deleteOption} successMsg={null}>
                        <input type="hidden" name="id" value={o.id} />
                        <button
                          type="submit"
                          className="ad-mini-btn bad"
                          style={{ width: 24, height: 24 }}
                          aria-label="Supprimer option"
                        >
                          <Icon.X />
                        </button>
                      </ActionForm>
                    </li>
                  ))}
                </ul>

                <AddOptionForm questionId={q.id} position={qOptions.length} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="ad-buzzes">
        <div className="ad-section-head">
          <div className="t-eyebrow">Ajouter une question</div>
        </div>
        <ActionForm
          action={createQuestion}
          successMsg="Question créée."
          resetOnSuccess
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <input type="hidden" name="room_id" value={room.id} />
          <input type="hidden" name="position" value={questions.length} />
          <input
            name="text"
            placeholder="Énoncé de la question"
            required
            className="cg-input"
          />
          <input
            name="reveal_message"
            placeholder="Message de révélation (optionnel) — affiché à la fin"
            className="cg-input"
          />
          <label className="cg-label" style={{ marginTop: 2 }}>
            Image de la question (optionnel)
          </label>
          <input
            type="file"
            name="image"
            accept="image/*"
            className="cg-input"
            style={{ paddingTop: 9 }}
          />
          <button type="submit" className="btn btn-primary">
            Ajouter la question <Icon.ArrowRight />
          </button>
        </ActionForm>
      </div>

      {/* Historique des manches en mode questions */}
      <div className="ad-buzzes">
        <div className="ad-section-head">
          <div className="t-eyebrow">HISTORIQUE DES MANCHES · EN DIRECT</div>
          <span className="ad-section-sub">
            {finishedRounds.length} TERMINÉE{finishedRounds.length > 1 ? "S" : ""}
          </span>
        </div>
        {finishedRounds.length === 0 ? (
          <div className="ad-empty card">
            <div className="t-display">Aucune manche terminée</div>
            <div className="ad-empty-sub">
              L&apos;historique se remplit dès qu&apos;une manche est clôturée.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {finishedRounds.map((r) => {
              const rAnswers = (answersByRound.get(r.id) ?? []).slice().sort(
                (a, b) =>
                  new Date(a.answered_at).getTime() -
                  new Date(b.answered_at).getTime()
              );
              const q = r.question_id
                ? questionsById.get(r.question_id)
                : undefined;
              const nGood = rAnswers.filter((a) => {
                const o = optionsById.get(a.option_id);
                return o?.is_correct;
              }).length;
              return (
                <div key={r.id} className="card" style={{ padding: "12px 14px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: rAnswers.length > 0 ? 8 : 0,
                    }}
                  >
                    <div
                      className="t-display"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "var(--surface-3)",
                        color: "var(--tertiary-glow)",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 14,
                      }}
                    >
                      {String(r.round_number).padStart(2, "0")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {q?.text ?? "Question supprimée"}
                      </div>
                      <div
                        className="t-mono"
                        style={{
                          fontSize: 10,
                          color: "var(--text-3)",
                          letterSpacing: "0.1em",
                          marginTop: 2,
                        }}
                      >
                        {rAnswers.length} RÉPONSE
                        {rAnswers.length > 1 ? "S" : ""} · {nGood} JUSTE
                        {nGood > 1 ? "S" : ""}
                      </div>
                    </div>
                  </div>

                  {rAnswers.length > 0 && (
                    <details className="t-mono" style={{ fontSize: 11 }}>
                      <summary
                        style={{
                          color: "var(--text-3)",
                          letterSpacing: "0.1em",
                          cursor: "pointer",
                          padding: "4px 0",
                        }}
                      >
                        VOIR LE DÉTAIL DES RÉPONSES
                      </summary>
                      <ul
                        style={{
                          listStyle: "none",
                          padding: "6px 0 0",
                          margin: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        {rAnswers.map((a) => {
                          const opt = optionsById.get(a.option_id);
                          const startedAt = new Date(r.started_at).getTime();
                          const answeredAt = new Date(a.answered_at).getTime();
                          const deltaMs = answeredAt - startedAt;
                          const deltaTxt =
                            deltaMs < 1000
                              ? `+${deltaMs}ms`
                              : `+${(deltaMs / 1000).toFixed(1)}s`;
                          return (
                            <li
                              key={a.user_id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr auto",
                                gap: 8,
                                alignItems: "center",
                                padding: "6px 10px",
                                background: opt?.is_correct
                                  ? "oklch(70% 0.16 145 / 0.08)"
                                  : "oklch(60% 0.18 28 / 0.06)",
                                borderRadius: 8,
                                fontSize: 11,
                                color: "var(--text-2)",
                              }}
                            >
                              <span style={{ minWidth: 0 }}>
                                <strong style={{ color: "var(--text)" }}>
                                  {formatUserName({
                                    email: a.user_email,
                                    full_name: a.user_name,
                                  })}
                                </strong>
                                {a.team_name && (
                                  <span style={{ color: "var(--text-4)" }}>
                                    {" "}
                                    · {a.team_name}
                                  </span>
                                )}
                                <span
                                  style={{
                                    display: "block",
                                    color: opt?.is_correct
                                      ? "oklch(70% 0.16 145)"
                                      : "var(--text-3)",
                                  }}
                                >
                                  → {opt?.label ?? "(option supprimée)"}{" "}
                                  {opt?.is_correct ? "✓" : "✗"}
                                </span>
                              </span>
                              <span
                                style={{
                                  color: "var(--text-3)",
                                  fontSize: 10,
                                  letterSpacing: "0.08em",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {deltaTxt}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Image d'une question avec édition (remplacer / retirer / ajouter).
 * Les contrôles ne s'affichent que si `editable` (question pas en cours).
 */
function QuestionImage({
  question,
  editable,
}: {
  question: QuizQuestion;
  editable: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const src = question.image_path;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("id", question.id);
    fd.set("image", file);
    startTransition(async () => {
      const res = await updateQuestionImage(fd);
      if (!res.ok) toast.error(res.error ?? "Erreur");
      else toast.success(src ? "Photo remplacée." : "Photo ajoutée.");
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function remove() {
    const fd = new FormData();
    fd.set("id", question.id);
    startTransition(async () => {
      const res = await removeQuestionImage(fd);
      if (!res.ok) toast.error(res.error ?? "Erreur");
      else toast.success("Photo retirée.");
    });
  }

  if (!src) {
    if (!editable) return null;
    return (
      <div style={{ marginBottom: 10 }}>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ height: 34, padding: "0 14px", fontSize: 12 }}
          onClick={() => fileRef.current?.click()}
          disabled={pending}
        >
          <Icon.Photos /> Ajouter une photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onFile}
        />
      </div>
    );
  }

  return (
    <div style={{ position: "relative", marginBottom: 10 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{
          width: "100%",
          maxHeight: 160,
          objectFit: "cover",
          borderRadius: 10,
          display: "block",
        }}
      />
      {editable && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            display: "flex",
            gap: 6,
          }}
        >
          <button
            type="button"
            className="cg-img-edit"
            onClick={() => fileRef.current?.click()}
            disabled={pending}
            aria-label="Remplacer la photo"
          >
            <Icon.Photos />
          </button>
          <button
            type="button"
            className="cg-img-edit bad"
            onClick={remove}
            disabled={pending}
            aria-label="Retirer la photo"
          >
            <Icon.X />
          </button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
    </div>
  );
}

/**
 * Vignette d'une option avec édition. Clic sur la vignette = remplacer,
 * badge ✕ = retirer, bouton 📷 = ajouter si absente. Visible si `editable`.
 */
function OptionPhoto({
  option,
  editable,
}: {
  option: QuizOption;
  editable: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const src = option.image_path;

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("id", option.id);
    fd.set("image", file);
    startTransition(async () => {
      const res = await updateOptionImage(fd);
      if (!res.ok) toast.error(res.error ?? "Erreur");
      else toast.success(src ? "Photo remplacée." : "Photo ajoutée.");
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function remove() {
    const fd = new FormData();
    fd.set("id", option.id);
    startTransition(async () => {
      const res = await removeOptionImage(fd);
      if (!res.ok) toast.error(res.error ?? "Erreur");
      else toast.success("Photo retirée.");
    });
  }

  if (!src) {
    if (!editable) return null;
    return (
      <>
        <button
          type="button"
          className="cg-opt-add"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
          aria-label="Ajouter une photo"
          title="Ajouter une photo"
        >
          <Icon.Photos />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={onFile}
        />
      </>
    );
  }

  if (!editable) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img className="cg-opt-thumb-static" src={src} alt="" />
    );
  }

  return (
    <div className="cg-opt-thumb">
      <button
        type="button"
        className="cg-opt-thumb-img"
        onClick={() => fileRef.current?.click()}
        disabled={pending}
        aria-label="Remplacer la photo"
        title="Remplacer la photo"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" />
      </button>
      <button
        type="button"
        className="cg-opt-thumb-remove"
        onClick={remove}
        disabled={pending}
        aria-label="Retirer la photo"
        title="Retirer la photo"
      >
        <Icon.X />
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
    </div>
  );
}

/**
 * Formulaire d'ajout d'une option avec bouton photo compact (taille du « + »)
 * placé entre le champ texte et le bouton d'ajout.
 */
function AddOptionForm({
  questionId,
  position,
}: {
  questionId: string;
  position: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setPreview(file ? URL.createObjectURL(file) : null);
  }

  function clearPhoto() {
    if (fileRef.current) fileRef.current.value = "";
    setPreview(null);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    startTransition(async () => {
      const res = await createOption(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur");
        return;
      }
      toast.success("Option ajoutée.");
      form.reset();
      setPreview(null);
    });
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 8 }}>
      <fieldset
        disabled={pending}
        style={{ border: 0, padding: 0, margin: 0, display: "contents" }}
      >
        <input type="hidden" name="question_id" value={questionId} />
        <input type="hidden" name="position" value={position} />
        <input type="hidden" name="is_correct" value="false" />
        <div style={{ display: "flex", gap: 6 }}>
          <input
            name="label"
            placeholder="Nouvelle option"
            required
            className="cg-input"
            style={{ flex: 1, height: 36 }}
          />
          <div className="cg-photo-pick">
            <button
              type="button"
              className={"cg-photo-btn" + (preview ? " has-img" : "")}
              onClick={() => fileRef.current?.click()}
              aria-label="Ajouter une photo à l'option"
              title="Photo de l'option (optionnel)"
            >
              {preview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={preview} alt="" />
              ) : (
                <Icon.Photos />
              )}
            </button>
            {preview && (
              <button
                type="button"
                className="cg-photo-clear"
                onClick={clearPhoto}
                aria-label="Retirer la photo sélectionnée"
              >
                <Icon.X />
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            name="image"
            accept="image/*"
            hidden
            onChange={onFile}
          />
          <button
            type="submit"
            className="btn btn-ghost"
            style={{ height: 36, padding: "0 14px", fontSize: 12 }}
          >
            <Icon.Plus />
          </button>
        </div>
      </fieldset>
    </form>
  );
}
