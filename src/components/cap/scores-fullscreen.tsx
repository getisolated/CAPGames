"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/cap/icons";
import { teamColor, teamShort } from "@/lib/team-style";
import type { LeaderboardRow } from "@/lib/supabase/types";

/**
 * Affichage des scores en plein écran (mode projection).
 * Surcouche fixe au-dessus de l'en-tête et de la barre de navigation,
 * + API Fullscreen du navigateur si disponible. Données live fournies par
 * l'appelant (`teams` se met à jour tout seul).
 */
export function ScoresFullscreen({
  teams,
  pulsing,
  onClose,
}: {
  teams: LeaderboardRow[];
  pulsing: Set<string>;
  onClose: () => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    elRef.current?.requestFullscreen?.().catch(() => {});

    const onFsChange = () => {
      if (!document.fullscreenElement) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("keydown", onKey);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onClose]);

  return createPortal(
    <div className="scores-fs" ref={elRef}>
      <div className="scores-fs-head">
        <div className="t-eyebrow">Classement · en direct</div>
        <button
          type="button"
          className="scores-fs-close"
          onClick={onClose}
          aria-label="Quitter le plein écran"
        >
          <Icon.X />
        </button>
      </div>
      <div className="scores-fs-list">
        {teams.map((t, i) => (
          <div key={t.id} className={"scores-fs-row" + (i === 0 ? " leader" : "")}>
            <div className="scores-fs-rank t-display">{i + 1}</div>
            <div className="scores-fs-avatar" style={{ background: teamColor(t) }}>
              {t.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={t.logo_url} alt={t.name} />
              ) : (
                teamShort(t)
              )}
            </div>
            <div className="scores-fs-name">{t.name}</div>
            <div
              className={
                "scores-fs-score t-display" +
                (pulsing.has(t.id) ? " score-pulse" : "")
              }
            >
              {t.score}
            </div>
          </div>
        ))}
        {teams.length === 0 && (
          <div className="scores-fs-empty t-display">Aucune équipe</div>
        )}
      </div>
    </div>,
    document.body
  );
}
