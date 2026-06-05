"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { NoTeamCard } from "@/components/cap/no-team-card";
import { Icon } from "@/components/cap/icons";
import { ScoresFullscreen } from "@/components/cap/scores-fullscreen";
import { teamColor, teamShort, teamShortName } from "@/lib/team-style";
import type { LeaderboardRow } from "@/lib/supabase/types";

function ordinal(n: number): string {
  return n === 1 ? "1er" : `${n}e`;
}

/** Petite phrase d'écart avec l'équipe devant. */
function gapLabel(teams: LeaderboardRow[], index: number): string {
  const t = teams[index];
  if (index === 0) {
    const follower = teams[1];
    if (!follower) return "Seul en tête 👑";
    const lead = t.score - follower.score;
    return lead > 0 ? `+${lead} pt${lead > 1 ? "s" : ""} d'avance` : "Au coude-à-coude";
  }
  const ahead = teams[index - 1];
  const gap = ahead.score - t.score;
  if (gap <= 0) return `Égalité avec le ${ordinal(index)}`;
  return `à ${gap} pt${gap > 1 ? "s" : ""} du ${ordinal(index)}`;
}

export function LeaderboardView({
  initial,
  myTeamId,
  isAdmin,
}: {
  initial: LeaderboardRow[];
  myTeamId: string | null;
  isAdmin: boolean;
}) {
  const teams = useLeaderboard(initial);
  const [fullscreen, setFullscreen] = useState(false);
  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  // Détection de changements pour les animations
  const prevScores = useRef<Map<string, number>>(
    new Map(initial.map((t) => [t.id, t.score]))
  );
  const prevRanks = useRef<Map<string, number>>(
    new Map(initial.map((t, i) => [t.id, i]))
  );
  const [pulsing, setPulsing] = useState<Set<string>>(new Set());
  const [rankUp, setRankUp] = useState<Set<string>>(new Set());

  useEffect(() => {
    const changed = new Set<string>();
    const climbed = new Set<string>();
    teams.forEach((t, i) => {
      const pScore = prevScores.current.get(t.id);
      const pRank = prevRanks.current.get(t.id);
      if (pScore !== undefined && pScore !== t.score) changed.add(t.id);
      if (pRank !== undefined && i < pRank) climbed.add(t.id);
      prevScores.current.set(t.id, t.score);
      prevRanks.current.set(t.id, i);
    });
    if (changed.size === 0 && climbed.size === 0) return;
    setPulsing(changed);
    setRankUp(climbed);
    const timer = setTimeout(() => {
      setPulsing(new Set());
      setRankUp(new Set());
    }, 1200);
    return () => clearTimeout(timer);
  }, [teams]);

  const top3 = teams.slice(0, 3);
  const podiumOrder = useMemo(() => [top3[1], top3[0], top3[2]], [top3]); // 2nd, 1st, 3rd
  const leaderScore = teams[0]?.score ?? 0;

  return (
    <div className="screen scores-screen">
      {fullscreen && (
        <ScoresFullscreen
          teams={teams}
          pulsing={pulsing}
          onClose={closeFullscreen}
        />
      )}
      <div className="lb-head">
        <div>
          <div className="t-eyebrow">Classement général</div>
          <h1 className="lb-title t-display">
            Le tableau<br />
            <span className="t-serif-it">d&apos;honneur.</span>
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {isAdmin && (
            <button
              type="button"
              className="cg-fs-btn"
              onClick={() => setFullscreen(true)}
              aria-label="Afficher les scores en plein écran"
              title="Plein écran"
            >
              <Icon.Expand />
            </button>
          )}
          <span className="chip live">En direct</span>
        </div>
      </div>

      <div className="scroll-area">
        {!myTeamId && <NoTeamCard />}

        {teams.length === 0 ? (
          <p className="px-6 text-sm text-[var(--text-3)]">
            Aucune équipe pour l&apos;instant.
          </p>
        ) : (
          <div className="lb-wrap">
            {top3.length >= 3 && (
              <div className="lb-podium">
                {podiumOrder.map((t, i) => {
                  if (!t) return <div key={i} />;
                  const rank = teams.indexOf(t) + 1;
                  const heights: Record<number, number> = { 1: 100, 2: 70, 3: 50 };
                  return (
                    <div key={t.id} className={"lb-podium-col rank-" + rank}>
                      <div
                        className="lb-podium-avatar"
                        style={{ background: teamColor(t), overflow: "hidden" }}
                      >
                        {t.logo_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={t.logo_url}
                            alt={t.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <span className="t-display">{teamShort(t)}</span>
                        )}
                        {rank === 1 && <div className="lb-podium-crown">★</div>}
                      </div>
                      <div className="lb-podium-name">{teamShortName(t.name)}</div>
                      <div
                        className={
                          "lb-podium-score t-display" +
                          (pulsing.has(t.id) ? " score-pulse" : "")
                        }
                      >
                        {t.score}
                      </div>
                      <div
                        className="lb-podium-bar"
                        style={{ height: heights[rank] }}
                      >
                        <div className="lb-podium-rank t-display">{rank}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="lb-list">
              {teams.map((t, i) => {
                const pct =
                  leaderScore > 0
                    ? Math.max(6, Math.round((t.score / leaderScore) * 100))
                    : 6;
                return (
                  <div
                    key={t.id}
                    className={
                      "lb-row" +
                      (t.id === myTeamId ? " mine" : "") +
                      (rankUp.has(t.id) ? " rank-up" : "")
                    }
                  >
                    <div className="lb-rank t-display">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div
                      className="lb-avatar"
                      style={{ background: teamColor(t), overflow: "hidden" }}
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
                    <div style={{ minWidth: 0 }}>
                      <div className="lb-name">
                        {t.name}
                        {t.id === myTeamId && (
                          <span className="lb-you-tag">TOI</span>
                        )}
                      </div>
                      <div className="lb-gap-row">
                        <div className="lb-gap-bar">
                          <div
                            className="lb-gap-bar-fill"
                            style={{ width: pct + "%", background: teamColor(t) }}
                          />
                        </div>
                        <span className="lb-gap-label t-mono">
                          {gapLabel(teams, i)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={
                        "lb-score t-display" +
                        (pulsing.has(t.id) ? " score-pulse" : "")
                      }
                    >
                      {t.score}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
