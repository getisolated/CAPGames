"use client";

import { useEffect, useState } from "react";

type Palette = "ember" | "noir" | "velvet";

export function TweaksPanel({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState<Palette>("ember");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    document.documentElement.dataset.palette = palette;
  }, [palette]);

  if (process.env.NODE_ENV !== "development") return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cg-tweaks"
        style={{
          width: "auto",
          padding: "6px 10px",
          cursor: "pointer",
          color: "var(--tertiary-glow)",
        }}
      >
        ⚙ TWEAKS
      </button>
    );
  }

  return (
    <div className="cg-tweaks">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div className="cg-tweaks-title">Tweaks · dev</div>
        <button type="button" onClick={() => setOpen(false)} style={{ padding: "2px 6px" }}>
          ×
        </button>
      </div>

      <div className="cg-tweaks-row">
        <label>Palette</label>
        <select value={palette} onChange={(e) => setPalette(e.target.value as Palette)}>
          <option value="ember">Ember</option>
          <option value="noir">Noir</option>
          <option value="velvet">Velvet</option>
        </select>
      </div>

      <div className="cg-tweaks-row" style={{ marginTop: 8 }}>
        <label>Role</label>
        <span>{isAdmin ? "ADMIN" : "PLAYER"}</span>
      </div>
    </div>
  );
}
