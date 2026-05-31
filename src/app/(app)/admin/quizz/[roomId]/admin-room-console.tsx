"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useBuzzerRealtime } from "@/hooks/use-buzzer-realtime";
import { Icon } from "@/components/cap/icons";
import { teamColor, teamShort } from "@/lib/team-style";
import { endRound, setBuzzerStyle, startRound } from "../actions";
import type { BuzzerStyle, QuizRoom } from "@/lib/supabase/types";

type Action = (fd: FormData) => Promise<{ ok: boolean; error?: string }>;

const STYLES: { value: BuzzerStyle; label: string }[] = [
  { value: "circle", label: "Halo" },
  { value: "arcade", label: "Arcade" },
  { value: "physical", label: "3D" },
];

export function AdminRoomConsole({ room }: { room: QuizRoom }) {
  const { activeRound, buzzes } = useBuzzerRealtime(room.id);
  const [isPending, startTransition] = useTransition();

  function fire(action: Action, extra: Record<string, string> = {}) {
    const fd = new FormData();
    fd.set("room_id", room.id);
    for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    startTransition(async () => {
      const res = await action(fd);
      if (!res.ok) toast.error(res.error ?? "Erreur");
    });
  }

  return (
    <div className="ad-quizz">
      <div className="ad-now card">
        <div className="ad-now-head">
          <div className="t-eyebrow">SALON ACTIF</div>
          <span
            className={
              "chip " +
              (room.status === "open" ? "live" : room.status === "closed" ? "gold" : "")
            }
          >
            {room.status}
          </span>
        </div>
        <div className="ad-now-title t-display">
          {room.name}
        </div>

        <div className="ad-phase-row">
          {activeRound ? (
            <span className="ad-phase-pill live">
              MANCHE {activeRound.round_number} EN COURS
            </span>
          ) : (
            <span className="ad-phase-pill waiting">AUCUNE MANCHE ACTIVE</span>
          )}
        </div>

        <div className="ad-phase-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => fire(startRound)}
            disabled={isPending}
          >
            {activeRound ? "Manche suivante" : "Démarrer une manche"}
            <Icon.ArrowRight />
          </button>
          {activeRound && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => fire(endRound)}
              disabled={isPending}
            >
              <Icon.Refresh /> Terminer la manche
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: "14px 16px" }}>
        <div className="ad-section-head" style={{ margin: "0 0 8px" }}>
          <div className="t-eyebrow">Style du buzzer</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              className={"ad-tab" + (room.buzzer_style === s.value ? " on" : "")}
              onClick={() => fire(setBuzzerStyle, { style: s.value })}
              disabled={isPending}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ad-buzzes">
        <div className="ad-section-head">
          <div className="t-eyebrow">ORDRE DES BUZZ</div>
          <span className="ad-section-sub">
            {buzzes.length} équipe{buzzes.length > 1 ? "s" : ""}
          </span>
        </div>
        {buzzes.length === 0 ? (
          <div className="ad-empty card">
            <div className="t-display">Aucun buzz</div>
            <div className="ad-empty-sub">
              L&apos;ordre apparaîtra ici dès qu&apos;une équipe buzzera.
            </div>
          </div>
        ) : (
          <div className="ad-buzz-list">
            {buzzes.map((b, i) => {
              const teamLike =
                b.team_id && b.team_name
                  ? { id: b.team_id, name: b.team_name }
                  : null;
              return (
                <div
                  key={b.id}
                  className={"ad-buzz-row" + (i === 0 ? " first" : "")}
                >
                  <div className="ad-buzz-rank">{b.position}</div>
                  <div
                    className="ad-buzz-avatar"
                    style={{
                      background: teamLike
                        ? teamColor(teamLike)
                        : "var(--surface-3)",
                    }}
                  >
                    {teamLike ? teamShort(teamLike) : "?"}
                  </div>
                  <div className="ad-buzz-info">
                    <div className="ad-buzz-name">
                      {b.user_name ?? b.user_email}
                    </div>
                    {b.team_name && (
                      <div className="ad-buzz-time">{b.team_name}</div>
                    )}
                  </div>
                  {i === 0 && <span className="chip gold">1ER</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
