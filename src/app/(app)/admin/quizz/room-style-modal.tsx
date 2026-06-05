"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RoomIcon } from "@/components/cap/icons";
import { roomColor } from "@/lib/room-style";
import { RoomStylePicker } from "./room-style-picker";

/**
 * Tuile logo/couleur d'un salon. Appuyer dessus ouvre un modal pour
 * choisir le fond (couleur) et le logo (icône). Réservé à l'admin.
 */
export function RoomStyleModal({
  roomId,
  roomName,
  currentColor,
  currentIcon,
}: {
  roomId: string;
  roomName: string;
  currentColor: string;
  currentIcon: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="room-logo"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            display: "grid",
            placeItems: "center",
            background: roomColor(currentColor),
            color: "oklch(98% 0.01 60)",
            flexShrink: 0,
            border: 0,
            cursor: "pointer",
          }}
          aria-label="Modifier l'apparence du salon"
          title="Modifier le fond et le logo"
        >
          <RoomIcon iconKey={currentIcon} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apparence du salon</DialogTitle>
          <DialogDescription>
            Choisis le fond et le logo de « {roomName} ».
          </DialogDescription>
        </DialogHeader>
        <RoomStylePicker
          roomId={roomId}
          currentColor={currentColor}
          currentIcon={currentIcon}
        />
      </DialogContent>
    </Dialog>
  );
}
