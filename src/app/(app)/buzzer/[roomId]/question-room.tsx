"use client";

import { useTransition } from "react";
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
  const closed = round !== null && !round.is_active;
  const showResults = closed; // user voit les résultats seulement quand admin a clôturé

  function vote(optionId: string) {
    if (myOptionId || !round) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("cast_answer", {
        p_room_id: room.id,
        p_option_id: optionId,
      });
      if (error) toast.error(error.message);
    });
  }

  const totalVotes = counts.reduce((s, c) => s + c.n_votes, 0);
  const phase: "waiting" | "live" | "voted" | "closed" = !round
    ? "waiting"
    : !round.is_active
      ? "closed"
      : myOptionId
        ? "voted"
        : "live";

  return (
    <div className="screen buzzer-screen" data-phase={phase}>
      <div className="b-head">
        <div className="b-head-left" style={{ display: "flex", gap: 12 }}>
          <div
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
                marginBottom: 18,
              }}
            >
              {question.text}
            </h2>

            <div className="pl-cards">
              {options.map((o) => {
                const isMine = myOptionId === o.id;
                const c = counts.find((x) => x.option_id === o.id);
                const n = c?.n_votes ?? 0;
                const pct = totalVotes > 0 ? Math.round((n / totalVotes) * 100) : 0;
                const disabled =
                  Boolean(myOptionId) || closed || isPending;
                return (
                  <button
                    key={o.id}
                    type="button"
                    className={
                      "pl-card" +
                      (isMine ? " voted" : "") +
                      (myOptionId && !isMine ? " dimmed" : "") +
                      (closed ? " closed" : "")
                    }
                    disabled={disabled}
                    onClick={() => vote(o.id)}
                  >
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
                    <div className="pl-card-body">
                      <div className="pl-card-name">{o.label}</div>
                      {showResults ? (
                        <div className="pl-card-bar">
                          <div
                            className="pl-card-bar-fill"
                            style={{
                              width: pct + "%",
                              background: o.is_correct
                                ? "var(--tertiary)"
                                : "var(--primary)",
                            }}
                          />
                          <div className="pl-card-bar-pct">
                            {pct}% · {n}
                            {o.is_correct && " ✓"}
                          </div>
                        </div>
                      ) : (
                        <div className="pl-card-cta">
                          {isMine
                            ? "TON CHOIX"
                            : myOptionId
                              ? "VOTE VERROUILLÉ"
                              : "TOUCHE POUR CHOISIR"}
                        </div>
                      )}
                    </div>
                    {isMine && (
                      <div className="pl-card-checkmark">
                        <Icon.Check />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {closed && (
              <div className="pl-validated" style={{ marginTop: 16 }}>
                <span className="pl-validated-check">
                  <Icon.Check />
                </span>
                <div>
                  <div className="pl-validated-eyebrow">MANCHE TERMINÉE</div>
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
          </div>
        )}
      </div>
    </div>
  );
}
