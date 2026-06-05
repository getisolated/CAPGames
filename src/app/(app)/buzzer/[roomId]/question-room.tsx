"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useQuestionRound } from "@/hooks/use-question-round";
import { Icon, RoomIcon } from "@/components/cap/icons";
import { teamColor } from "@/lib/team-style";
import { roomColor } from "@/lib/room-style";
import { createClient } from "@/lib/supabase/client";
import type { QuizRoom, Team } from "@/lib/supabase/types";

export function QuestionRoom({
  room,
  userId,
  team,
}: {
  room: QuizRoom;
  userId: string;
  team: Team | null;
}) {
  const { round, question, options, counts, myOptionId } = useQuestionRound(
    room.id,
    userId
  );
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const closed = round !== null && !round.is_active;
  const revealed = round?.revealed ?? false;
  // Résultats visibles quand l'admin a révélé OU clôturé la manche
  const showResults = closed || revealed;
  // Le vote est bloqué dès la révélation
  const voteLocked = Boolean(myOptionId) || closed || revealed;

  // Reset la sélection à chaque nouvelle manche
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(null);
  }, [round?.id]);

  function validate() {
    if (!selected || voteLocked || !round) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("cast_answer", {
        p_room_id: room.id,
        p_option_id: selected,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Réponse enregistrée.");
      }
    });
  }

  const totalVotes = counts.reduce((s, c) => s + c.n_votes, 0);
  const phase: "waiting" | "live" | "voted" | "revealed" | "closed" = !round
    ? "waiting"
    : !round.is_active
      ? "closed"
      : revealed
        ? "revealed"
        : myOptionId
          ? "voted"
          : "live";

  return (
    <div className="screen buzzer-screen" data-phase={phase}>
      <div className="b-head">
        <div className="b-head-left" style={{ display: "flex", gap: 12 }}>
          <div
            className="room-logo"
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              display: "grid",
              placeItems: "center",
              background: roomColor(room.color),
              color: "oklch(98% 0.01 60)",
              flexShrink: 0,
            }}
          >
            <RoomIcon iconKey={room.icon} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="t-eyebrow">
              {round ? `Manche ${round.round_number}` : "En attente"}
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>
              {room.name}
            </div>
            {team && (
              <div className="b-team" style={{ marginTop: 6 }}>
                <div
                  className="b-team-dot"
                  style={{ background: teamColor(team) }}
                />
                <span>{team.name}</span>
                <span className="chip" style={{ marginLeft: 8 }}>
                  {team.score} PTS
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="b-head-right">
          {phase === "waiting" && <span className="chip">EN ATTENTE</span>}
          {phase === "live" && <span className="chip live">VOTE</span>}
          {phase === "voted" && <span className="chip gold">VOTÉ</span>}
          {phase === "revealed" && <span className="chip gold">RÉPONSES</span>}
          {phase === "closed" && <span className="chip gold">RÉSULTATS</span>}
        </div>
      </div>

      <div
        className="scroll-area"
        style={{ padding: "8px 22px 120px", position: "relative" }}
      >
        {!round || !question ? (
          <div className="b-marquee" style={{ marginTop: 60 }}>
            <div className="b-marquee-eyebrow">
              <span className="b-dot dot-wait" />
              <span>L&apos;ANIMATEUR SE PRÉPARE</span>
            </div>
            <div className="b-marquee-title t-display">
              La manche<br />
              <span className="t-serif-it">va commencer.</span>
            </div>
            <div className="b-wait-dots">
              <span /> <span /> <span />
            </div>
          </div>
        ) : (
          <div>
            <div
              className="t-eyebrow"
              style={{ color: "var(--tertiary-glow)" }}
            >
              QUESTION
            </div>
            <h2
              style={{
                fontSize: 22,
                lineHeight: 1.3,
                fontWeight: 700,
                marginTop: 6,
                marginBottom: question.image_path ? 12 : 18,
              }}
            >
              {question.text}
            </h2>

            {question.image_path && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={question.image_path}
                alt=""
                style={{
                  width: "100%",
                  maxHeight: 240,
                  objectFit: "cover",
                  borderRadius: 14,
                  marginBottom: 18,
                }}
              />
            )}

            <div className="pl-cards">
              {options.map((o) => {
                const isMine = myOptionId === o.id;
                const isSelected = !voteLocked && selected === o.id;
                const highlight = isMine || isSelected;
                const c = counts.find((x) => x.option_id === o.id);
                const n = c?.n_votes ?? 0;
                const pct = totalVotes > 0 ? Math.round((n / totalVotes) * 100) : 0;
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={
                      "pl-card" +
                      (highlight ? " voted" : "") +
                      (showResults && o.is_correct ? " correct" : "") +
                      ((myOptionId || selected) && !highlight && !showResults
                        ? " dimmed"
                        : "") +
                      (closed || revealed ? " closed" : "")
                    }
                    disabled={voteLocked || isPending}
                    onClick={() => {
                      if (voteLocked) return;
                      setSelected((s) => (s === o.id ? null : o.id));
                    }}
                  >
                    {o.image_path ? (
                      <div
                        className="pl-card-img"
                        style={{
                          backgroundImage: `url(${o.image_path})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          minHeight: 90,
                        }}
                      />
                    ) : (
                      <div
                        className="pl-card-img pl-card-img--mini"
                        style={{
                          background:
                            "linear-gradient(150deg, oklch(40% 0.1 30), oklch(15% 0.04 30))",
                        }}
                      >
                        <span className="pl-card-emoji">
                          {(o.label || "?").slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="pl-card-body">
                      <div className="pl-card-name">
                        {o.label}
                        {showResults && o.is_correct && (
                          <span
                            className="chip green"
                            style={{ marginLeft: 8, fontSize: 9 }}
                          >
                            ✓ BONNE
                          </span>
                        )}
                      </div>
                      {showResults ? (
                        <div className="pl-card-bar">
                          <div
                            className="pl-card-bar-fill"
                            style={{
                              width: pct + "%",
                              background: o.is_correct
                                ? "var(--success)"
                                : "var(--primary)",
                            }}
                          />
                          <div className="pl-card-bar-pct">
                            {pct}% · {n}
                          </div>
                        </div>
                      ) : (
                        <div className="pl-card-cta">
                          {isMine
                            ? "TON CHOIX"
                            : myOptionId
                              ? "VOTE VERROUILLÉ"
                              : isSelected
                                ? "SÉLECTIONNÉ"
                                : "TOUCHE POUR CHOISIR"}
                        </div>
                      )}
                    </div>
                    {highlight && !showResults && (
                      <div className="pl-card-checkmark">
                        <Icon.Check />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {!closed && !revealed && (
              <div className="pl-validate">
                {myOptionId ? (
                  <div className="pl-validated">
                    <span className="pl-validated-check">
                      <Icon.Check />
                    </span>
                    <div>
                      <div className="pl-validated-eyebrow">RÉPONSE VALIDÉE</div>
                      <div className="pl-validated-name">
                        {options.find((o) => o.id === myOptionId)?.label ??
                          "Choix enregistré"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    onClick={validate}
                    disabled={!selected || isPending}
                  >
                    {selected ? "Valider ma réponse" : "Choisis une option"}
                    {selected && <Icon.ArrowRight />}
                  </button>
                )}
              </div>
            )}

            {(closed || revealed) && (
              <div className="pl-validated" style={{ marginTop: 16 }}>
                <span className="pl-validated-check">
                  <Icon.Check />
                </span>
                <div>
                  <div className="pl-validated-eyebrow">
                    {closed ? "MANCHE TERMINÉE" : "RÉPONSES RÉVÉLÉES"}
                  </div>
                  <div className="pl-validated-name">
                    {myOptionId
                      ? options.find((o) => o.id === myOptionId)?.is_correct
                        ? "Bonne réponse ✓"
                        : "Mauvaise réponse"
                      : "Tu n'as pas répondu."}
                  </div>
                </div>
              </div>
            )}

            {showResults && question.reveal_message && (
              <div
                style={{
                  marginTop: 14,
                  padding: "14px 16px",
                  background:
                    "radial-gradient(circle at 0% 0%, oklch(70% 0.14 57 / 0.12), transparent 70%), oklch(100% 0 0 / 0.03)",
                  border: "1px solid oklch(70% 0.14 57 / 0.3)",
                  borderRadius: 16,
                }}
              >
                <div
                  className="t-eyebrow"
                  style={{ color: "var(--tertiary-glow)", marginBottom: 6 }}
                >
                  LE MOT DE L&apos;ANIMATEUR
                </div>
                <div style={{ fontSize: 15, lineHeight: 1.4, color: "var(--text)" }}>
                  {question.reveal_message}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
