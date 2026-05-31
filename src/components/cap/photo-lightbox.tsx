"use client";

import { useEffect, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { Icon } from "@/components/cap/icons";

export type LightboxPhoto = {
  id: string;
  url: string | null;
  original_filename: string | null;
};

const SWIPE_THRESHOLD = 50; // pixels

export function PhotoLightbox({
  photos,
  startIndex,
  onClose,
}: {
  photos: LightboxPhoto[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  const current = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) setIndex((i) => i - 1);
      if (e.key === "ArrowRight" && hasNext) setIndex((i) => i + 1);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [hasPrev, hasNext, onClose]);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (dx > 0 && hasPrev) setIndex((i) => i - 1);
    else if (dx < 0 && hasNext) setIndex((i) => i + 1);
  }

  async function download() {
    if (!current?.url) return;
    try {
      const res = await fetch(current.url);
      const blob = await res.blob();
      saveAs(blob, current.original_filename ?? `${current.id}.jpg`);
    } catch {
      // ignore
    }
  }

  if (!current) return null;

  return (
    <div
      className="cg-lightbox"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={(e) => {
        // Click sur le fond (pas sur les contrôles) → close
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cg-lightbox-bar cg-lightbox-bar-top">
        <span className="cg-lightbox-count t-mono">
          {index + 1} / {photos.length}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="cg-lightbox-btn"
            onClick={download}
            aria-label="Télécharger"
          >
            <Icon.Download />
          </button>
          <button
            type="button"
            className="cg-lightbox-btn"
            onClick={onClose}
            aria-label="Fermer"
          >
            <Icon.X />
          </button>
        </div>
      </div>

      {hasPrev && (
        <button
          type="button"
          className="cg-lightbox-nav cg-lightbox-prev"
          onClick={() => setIndex((i) => i - 1)}
          aria-label="Précédent"
        >
          <Icon.ArrowLeft />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          className="cg-lightbox-nav cg-lightbox-next"
          onClick={() => setIndex((i) => i + 1)}
          aria-label="Suivant"
        >
          <Icon.ArrowRight />
        </button>
      )}

      <div
        className="cg-lightbox-bar cg-lightbox-bar-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="btn btn-gold cg-lightbox-download"
          onClick={download}
        >
          <Icon.Download />
          Télécharger cette photo
        </button>
      </div>

      <div className="cg-lightbox-img-wrap" onClick={(e) => e.stopPropagation()}>
        {current.url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={current.url}
            alt={current.original_filename ?? ""}
            className="cg-lightbox-img"
          />
        ) : (
          <div className="cg-lightbox-empty">Image indisponible</div>
        )}
      </div>
    </div>
  );
}
