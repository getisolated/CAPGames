"use client";

import { useLeaderboard } from "@/hooks/use-leaderboard";
import { NoTeamCard } from "@/components/cap/no-team-card";
import { teamColor, teamShort, teamShortName } from "@/lib/team-style";
import type { LeaderboardRow } from "@/lib/supabase/types";

export function LeaderboardView({
  initial,
  myTeamId,
}: {
  initial: LeaderboardRow[];
  myTeamId: string | null;
  isAdmin: boolean;
}) {
  const teams = useLeaderboard(initial);

  const top3 = teams.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd

  return (
    <div className="screen scores-screen">
      <div className="lb-head">
        <div>
          <div className="t-eyebrow">Classement général</div>
          <h1 className="lb-title t-display">
            Le tableau<br />
            <span className="t-serif-it">d&apos;honneur.</span>
          </h1>
        </div>
        <span className="chip live">En direct</span>
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
                      <div className="lb-podium-score t-display">{t.score}</div>
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
              {teams.map((t, i) => (
                <div
                  key={t.id}
                  className={"lb-row" + (t.id === myTeamId ? " mine" : "")}
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
                  <div>
                    <div className="lb-name">{t.name}</div>
                    <div className="lb-trend">
                      <span className="t-mono">
                        {t.id === myTeamId ? "TON ÉQUIPE" : "—"}
                      </span>
                    </div>
                  </div>
                  <div className="lb-score t-display">{t.score}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
