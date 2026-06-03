"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/cap/icons";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { teamColor, teamShort, teamShortName } from "@/lib/team-style";
import { setScore } from "./actions";
import type { LeaderboardRow } from "@/lib/supabase/types";

export function PointsAdmin({ initial }: { initial: LeaderboardRow[] }) {
  const teams = useLeaderboard(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.map((t) => [t.id, String(t.score)]))
  );
  const [focused, setFocused] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Détection de changement de score pour l'animation (mini-classement)
  const prevScores = useRef<Map<string, number>>(
    new Map(initial.map((t) => [t.id, t.score]))
  );
  const [pulsing, setPulsing] = useState<Set<string>>(new Set());

  // Sync des champs avec le score live tant qu'on n'édite pas ce champ
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrafts((prev) => {
      const next = { ...prev };
      for (const t of teams) {
        if (focused !== t.id) next[t.id] = String(t.score);
      }
      return next;
    });
  }, [teams, focused]);

  // Pulse quand un score change
  useEffect(() => {
    const changed = new Set<string>();
    for (const t of teams) {
      const prev = prevScores.current.get(t.id);
      if (prev !== undefined && prev !== t.score) changed.add(t.id);
      prevScores.current.set(t.id, t.score);
    }
    if (changed.size === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPulsing(changed);
    const timer = setTimeout(() => setPulsing(new Set()), 800);
    return () => clearTimeout(timer);
  }, [teams]);

  function apply(teamId: string, score: number) {
    const fd = new FormData();
    fd.set("team_id", teamId);
    fd.set("score", String(Math.max(0, Math.round(score))));
    startTransition(async () => {
      const res = await setScore(fd);
      if (!res.ok) toast.error(res.error ?? "Erreur");
    });
  }

  function fix(teamId: string) {
    const v = Number(drafts[teamId]);
    if (!Number.isFinite(v)) {
      toast.error("Score invalide.");
      return;
    }
    apply(teamId, v);
    setFocused(null);
  }

  return (
    <div style={{ padding: "0 22px", display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Mini-classement live */}
      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Classement en direct</div>
          <span className="chip live">LIVE</span>
        </div>
        <div className="pts-mini">
          {teams.map((t, i) => (
            <div
              key={t.id}
              className={"pts-mini-row" + (i === 0 ? " leader" : "")}
            >
              <div className="pts-mini-rank t-display">{i + 1}</div>
              <div
                className="lb-avatar"
                style={{ background: teamColor(t), overflow: "hidden", width: 30, height: 30 }}
              >
                {t.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={t.logo_url}
                    alt={t.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 11 }}>{teamShort(t)}</span>
                )}
              </div>
              <div className="pts-mini-name">{teamShortName(t.name)}</div>
              <div
                className={
                  "pts-mini-score t-display" +
                  (pulsing.has(t.id) ? " score-pulse" : "")
                }
              >
                {t.score}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Éditeurs par équipe */}
      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Régler les scores</div>
          <span className="ad-section-sub">FIXE LE TOTAL</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {teams.map((t) => (
            <div key={t.id} className="card" style={{ padding: "14px 16px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  className="lb-avatar"
                  style={{ background: teamColor(t), overflow: "hidden", width: 42, height: 42 }}
                >
                  {t.logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={t.logo_url}
                      alt={t.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    teamShort(t)
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{t.name}</div>
                  <div
                    className="t-mono"
                    style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em" }}
                  >
                    {t.score} PTS ACTUELS
                  </div>
                </div>
              </div>

              <div className="pts-stepper">
                <button
                  type="button"
                  className="pts-step-btn neg"
                  onClick={() => apply(t.id, t.score - 1)}
                  disabled={isPending}
                  aria-label="Retirer 1 point"
                >
                  <Icon.Minus />
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  className="pts-score-input t-display"
                  value={drafts[t.id] ?? ""}
                  onFocus={() => setFocused(t.id)}
                  onBlur={() => setFocused(null)}
                  onChange={(e) =>
                    setDrafts((s) => ({ ...s, [t.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                      fix(t.id);
                    }
                  }}
                />
                <button
                  type="button"
                  className="pts-step-btn pos"
                  onClick={() => apply(t.id, t.score + 1)}
                  disabled={isPending}
                  aria-label="Ajouter 1 point"
                >
                  <Icon.Plus />
                </button>
                <button
                  type="button"
                  className="btn btn-gold pts-fix-btn"
                  onClick={() => fix(t.id)}
                  disabled={isPending || Number(drafts[t.id]) === t.score}
                >
                  Fixer
                </button>
              </div>
            </div>
          ))}
          {teams.length === 0 && (
            <div className="ad-empty card">
              <div className="t-display">Aucune équipe</div>
              <div className="ad-empty-sub">Crée des équipes dans l&apos;onglet Équipes.</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
