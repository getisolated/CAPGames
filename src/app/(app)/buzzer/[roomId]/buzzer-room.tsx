"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useBuzzerRealtime } from "@/hooks/use-buzzer-realtime";
import { createClient } from "@/lib/supabase/client";
import { Icon, RoomIcon } from "@/components/cap/icons";
import { teamColor } from "@/lib/team-style";
import { roomColor } from "@/lib/room-style";
import type { BuzzerStyle, QuizRoom, Team } from "@/lib/supabase/types";

const BUZZ_AUDIO_DATA_URL =
  "data:audio/wav;base64,UklGRl4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAACAgIB/f3+Af39+gIB/foF/foB+fX9+fH+AfH59gH98foB7fX9+e36AfX1/gH1+f4B+fn+AgX9/gH9/f4A=";

type Phase = "waiting" | "live" | "buzzed";

export function BuzzerRoom({
  room,
  userId,
  team,
}: {
  room: QuizRoom;
  userId: string;
  team: Team | null;
}) {
  const { activeRound, buzzes } = useBuzzerRealtime(room.id);
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(false);
  const [pressed, setPressed] = useState(false);

  const myBuzz = buzzes.find((b) => b.user_id === userId);
  const myPosition = activeRound ? (myBuzz?.position ?? null) : null;
  const hasBuzzed = Boolean(myBuzz) || optimistic;

  const phase: Phase = !activeRound ? "waiting" : hasBuzzed ? "buzzed" : "live";
  const style: BuzzerStyle = room.buzzer_style ?? "circle";

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptimistic(false);
  }, [activeRound?.id]);

  function buzz() {
    if (phase !== "live") return;
    setOptimistic(true);
    setPressed(true);
    setTimeout(() => setPressed(false), 200);

    if ("vibrate" in navigator) navigator.vibrate?.(120);
    try {
      const audio = new Audio(BUZZ_AUDIO_DATA_URL);
      audio.play().catch(() => {});
    } catch {
      /* noop */
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("place_buzz", { p_room_id: room.id });
      if (error) {
        setOptimistic(false);
        toast.error(error.message);
      }
    });
  }

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
              {activeRound
                ? `Manche ${activeRound.round_number}`
                : "En attente"}
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 2 }}>{room.name}</div>
            {team && (
              <div className="b-team" style={{ marginTop: 6 }}>
                <div className="b-team-dot" style={{ background: teamColor(team) }} />
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
          {phase === "live" && <span className="chip live">GO</span>}
          {phase === "buzzed" && <span className="chip gold">BUZZÉ</span>}
        </div>
      </div>

      <div className="b-stage">
        <div className={"b-aura aura-" + phase} />
        <div className={"b-aura-2 aura-" + phase} />

        <div className="b-marquee">
          {phase === "waiting" && (
            <>
              <div className="b-marquee-eyebrow">
                <span className="b-dot dot-wait" />
                <span>L&apos;ANIMATEUR SE PRÉPARE</span>
              </div>
              <div className="b-marquee-title t-display">
                La manche<br />
                <span className="t-serif-it">va commencer.</span>
              </div>
              <div className="b-wait-dots">
                <span />
                <span />
                <span />
              </div>
            </>
          )}
          {phase === "live" && (
            <>
              <div className="b-marquee-eyebrow">
                <span className="b-dot dot-live" />
                <span>MANCHE EN COURS</span>
              </div>
              <div className="b-marquee-title t-display">
                Plus vite<br />
                <span className="t-serif-it">que les autres.</span>
              </div>
            </>
          )}
          {phase === "buzzed" && (
            <>
              <div
                className="b-marquee-eyebrow"
                style={{ color: "var(--tertiary-glow)" }}
              >
                <span className="b-dot dot-buzzed" />
                <span>BUZZ ENREGISTRÉ · #{myPosition ?? "?"}</span>
              </div>
              <div className="b-marquee-title t-display">
                Pousse-toi<br />
                <span className="t-serif-it">le micro arrive.</span>
              </div>
              <div className="b-buzz-time">
                {myPosition === 1 ? "1ER À AVOIR BUZZÉ" : `RANG ${myPosition}`}
              </div>
            </>
          )}
        </div>

        <div className="b-buzzer-wrap">
          <button
            type="button"
            className={
              "b-buzzer style-" +
              style +
              " phase-" +
              phase +
              (pressed ? " pressed" : "")
            }
            onPointerDown={buzz}
            disabled={phase !== "live" || isPending}
          >
            <span className="b-buzzer-inner">
              <span className="b-buzzer-ring" />
              <span className="b-buzzer-shine" />
              {phase === "waiting" && (
                <span className="b-buzzer-content waiting">
                  <Icon.Lock />
                  <span className="lbl t-mono">VERROUILLÉ</span>
                </span>
              )}
              {phase === "live" && (
                <span className="b-buzzer-content live">
                  <span className="big t-display">BUZZ</span>
                  <span className="lbl t-mono">TOUCHE POUR RÉPONDRE</span>
                </span>
              )}
              {phase === "buzzed" && (
                <span className="b-buzzer-content buzzed">
                  <Icon.Check />
                  <span className="lbl t-mono">ENVOYÉ</span>
                </span>
              )}
            </span>
          </button>
        </div>

        <div className="b-foot">
          {phase === "waiting" && (
            <div className="b-foot-line t-mono">
              Reste sur cet écran — il s&apos;active dès que l&apos;animateur lance la manche.
            </div>
          )}
          {phase === "live" && !hasBuzzed && (
            <div className="b-foot-line live t-mono">
              Le 1er à toucher gagne la main.
            </div>
          )}
          {phase === "buzzed" && buzzes.length > 0 && (
            <div className="b-foot-list">
              <div className="b-foot-list-title">ORDRE DES BUZZ</div>
              <ol>
                {buzzes.slice(0, 5).map((b) => (
                  <li key={b.id}>
                    <span className="rank">{b.position}</span>
                    <span>{b.team_name ?? b.user_name ?? b.user_email}</span>
                    <span className="ms">#{b.position}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
