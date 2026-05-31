"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ROOM_COLORS, ROOM_ICONS, type RoomColorKey, roomColor } from "@/lib/room-style";
import { RoomIcon } from "@/components/cap/icons";
import { setRoomStyle } from "./actions";

export function RoomStylePicker({
  roomId,
  currentColor,
  currentIcon,
  compact = false,
}: {
  roomId: string;
  currentColor: string;
  currentIcon: string;
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function update(patch: { color?: string; icon?: string }) {
    const fd = new FormData();
    fd.set("id", roomId);
    if (patch.color) fd.set("color", patch.color);
    if (patch.icon) fd.set("icon", patch.icon);
    startTransition(async () => {
      const res = await setRoomStyle(fd);
      if (!res.ok) toast.error(res.error ?? "Erreur");
    });
  }

  return (
    <div className="room-style-picker">
      {!compact && <div className="t-eyebrow" style={{ marginBottom: 6 }}>Couleur</div>}
      <div className="room-color-row">
        {(Object.keys(ROOM_COLORS) as RoomColorKey[]).map((key) => {
          const c = ROOM_COLORS[key];
          const active = key === currentColor;
          return (
            <button
              key={key}
              type="button"
              className={"room-color-swatch" + (active ? " active" : "")}
              style={{ background: c.value }}
              title={c.label}
              onClick={() => update({ color: key })}
              disabled={isPending}
              aria-label={c.label}
            />
          );
        })}
      </div>

      {!compact && <div className="t-eyebrow" style={{ marginTop: 12, marginBottom: 6 }}>Icône</div>}
      <div className="room-icon-row">
        {ROOM_ICONS.map((it) => {
          const active = it.key === currentIcon;
          return (
            <button
              key={it.key}
              type="button"
              className={"room-icon-swatch" + (active ? " active" : "")}
              onClick={() => update({ icon: it.key })}
              disabled={isPending}
              title={it.label}
              aria-label={it.label}
              style={active ? { color: roomColor(currentColor) } : undefined}
            >
              <RoomIcon iconKey={it.key} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
