"use client";

import { useMemo, useTransition } from "react";
import { toast } from "sonner";
import { useBuzzerRealtime } from "@/hooks/use-buzzer-realtime";
import { useRoomHistory } from "@/hooks/use-room-history";
import { Icon } from "@/components/cap/icons";
import { teamColor, teamShort } from "@/lib/team-style";
import { endRound, setBuzzerStyle, startRound } from "../actions";
import type {
  BuzzerStyle,
  BuzzOrdered,
  QuizRoom,
  Round,
} from "@/lib/supabase/types";

type Action = (fd: FormData) => Promise<{ ok: boolean; error?: string }>;

const STYLES: { value: BuzzerStyle; label: string }[] = [
  { value: "circle", label: "Halo" },
  { value: "arcade", label: "Arcade" },
  { value: "physical", label: "3D" },
];

export function AdminRoomConsole({
  room,
  pastRounds,
  pastBuzzes,
}: {
  room: QuizRoom;
  pastRounds: Round[];
  pastBuzzes: BuzzOrdered[];
}) {
  const { activeRound, buzzes } = useBuzzerRealtime(room.id);
  const { rounds: allRounds, buzzes: allBuzzes } = useRoomHistory(
    room.id,
    pastRounds,
    pastBuzzes
  );
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

  // Groupe les buzzes par round_id pour la section "Historique"
  const buzzesByRound = useMemo(() => {
    const map = new Map<string, BuzzOrdered[]>();
    for (const b of allBuzzes) {
      const arr = map.get(b.round_id) ?? [];
      arr.push(b);
      map.set(b.round_id, arr);
    }
    return map;
  }, [allBuzzes]);

  // Manches terminées uniquement (pas la manche active)
  const finishedRounds = useMemo(
    () => allRounds.filter((r) => !r.is_active),
    [allRounds]
  );

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
        <div className="ad-now-title t-display">{room.name}</div>

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
          <div className="t-eyebrow">ORDRE DES BUZZ · EN DIRECT</div>
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
              L&apos;historique se remplit à chaque manche clôturée.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {finishedRounds.map((r) => {
              const rBuzzes = buzzesByRound.get(r.id) ?? [];
              const first = rBuzzes[0];
              const firstTeam =
                first?.team_id && first?.team_name
                  ? { id: first.team_id, name: first.team_name }
                  : null;
              const duration = computeDuration(r.started_at, r.ended_at);
              return (
                <div key={r.id} className="card" style={{ padding: "12px 14px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: rBuzzes.length > 0 ? 8 : 0,
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
                        Manche {r.round_number}
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
                        {rBuzzes.length} BUZZ · {duration}
                      </div>
                    </div>
                    {first ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: firstTeam
                              ? teamColor(firstTeam)
                              : "var(--surface-3)",
                            display: "grid",
                            placeItems: "center",
                            color: "oklch(98% 0.01 60)",
                            fontFamily: "var(--font-display)",
                            fontWeight: 800,
                            fontSize: 10,
                          }}
                        >
                          {firstTeam ? teamShort(firstTeam) : "?"}
                        </div>
                        <span className="chip gold" style={{ fontSize: 9 }}>
                          1ER
                        </span>
                      </div>
                    ) : (
                      <span
                        className="t-mono"
                        style={{
                          fontSize: 10,
                          color: "var(--text-4)",
                          letterSpacing: "0.1em",
                        }}
                      >
                        AUCUN BUZZ
                      </span>
                    )}
                  </div>
                  {rBuzzes.length > 0 && (
                    <details className="t-mono" style={{ fontSize: 11 }}>
                      <summary
                        style={{
                          color: "var(--text-3)",
                          letterSpacing: "0.1em",
                          cursor: "pointer",
                          padding: "4px 0",
                        }}
                      >
                        VOIR L&apos;ORDRE COMPLET
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
                        {rBuzzes.map((b) => (
                          <li
                            key={b.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              padding: "4px 8px",
                              background: "oklch(100% 0 0 / 0.03)",
                              borderRadius: 6,
                              color: "var(--text-2)",
                            }}
                          >
                            <span>
                              #{b.position} · {b.team_name ?? b.user_name ?? b.user_email}
                            </span>
                          </li>
                        ))}
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

function computeDuration(start: string, end: string | null): string {
  if (!end) return "en cours";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return "< 1s";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}
