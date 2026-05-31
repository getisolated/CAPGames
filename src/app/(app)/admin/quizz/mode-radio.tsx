"use client";

import { useState } from "react";
import type { QuizMode } from "@/lib/supabase/types";

const MODES: { value: QuizMode; label: string; sub: string }[] = [
  { value: "buzzer", label: "Buzzer", sub: "Les équipes buzzent" },
  { value: "questions", label: "Questions", sub: "Vote par manche" },
];

export function ModeRadio({ defaultValue = "buzzer" }: { defaultValue?: QuizMode }) {
  const [mode, setMode] = useState<QuizMode>(defaultValue);
  return (
    <>
      <input type="hidden" name="mode" value={mode} />
      <div style={{ display: "flex", gap: 6 }}>
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            className={"ad-tab" + (mode === m.value ? " on" : "")}
            style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}
            onClick={() => setMode(m.value)}
          >
            <span>{m.label}</span>
            <span
              className="t-mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.12em",
                opacity: 0.6,
              }}
            >
              {m.sub}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
