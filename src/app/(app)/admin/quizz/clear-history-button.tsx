"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/cap/icons";
import { clearRoomHistory } from "./actions";

/**
 * Bouton « Effacer l'historique » + modal de confirmation.
 * Supprime toutes les manches jouées du salon (et réinitialise l'état
 * « déjà jouée »). Refusé côté serveur si une manche est en cours.
 */
export function ClearHistoryButton({ roomId }: { roomId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmClear() {
    const fd = new FormData();
    fd.set("room_id", roomId);
    startTransition(async () => {
      const res = await clearRoomHistory(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Erreur");
        return;
      }
      toast.success("Historique effacé.");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        className="ad-clear-btn"
        onClick={() => setOpen(true)}
      >
        <Icon.X /> Effacer
      </button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Effacer tout l&apos;historique ?</DialogTitle>
          <DialogDescription>
            Toutes les manches déjà jouées et leurs réponses seront
            définitivement supprimées, et les questions redeviendront « jamais
            lancées ». Les scores des équipes ne sont pas affectés. Cette action
            est irréversible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Annuler
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={confirmClear}
            disabled={pending}
          >
            {pending ? "Suppression…" : "Tout effacer"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
