"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createChoice, deleteChoice } from "../actions";
import type { Poll, PollChoice, Team } from "@/lib/supabase/types";

export function PollEditor({
  poll,
  choices,
  teams,
}: {
  poll: Poll;
  choices: PollChoice[];
  teams: Team[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("poll_id", poll.id);
    fd.set("position", String(choices.length));
    startTransition(async () => {
      const res = await createChoice(fd);
      if (!res.ok) toast.error(res.error ?? "Erreur");
      else {
        toast.success("Choix ajouté.");
        form.reset();
      }
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold">{poll.title}</h2>
        {poll.description ? (
          <p className="text-muted-foreground">{poll.description}</p>
        ) : null}
      </header>

      <section>
        <h3 className="mb-2 text-lg font-semibold">Choix existants</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {choices.map((c) => (
            <Card key={c.id} className="space-y-2 p-3">
              <div className="flex items-start gap-3">
                {c.image_path && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={c.image_path}
                    alt=""
                    className="size-16 rounded object-cover"
                  />
                )}
                <div className="flex-1">
                  {c.label && <p className="font-medium">{c.label}</p>}
                  {c.restricted_team_id && (
                    <p className="text-xs text-amber-600">
                      Restreint à : {teams.find((t) => t.id === c.restricted_team_id)?.name}
                    </p>
                  )}
                  {c.restriction_message && (
                    <p className="text-xs text-muted-foreground">
                      « {c.restriction_message} »
                    </p>
                  )}
                </div>
                <form
                  action={(fd) => {
                    startTransition(async () => {
                      const res = await deleteChoice(fd);
                      if (!res.ok) toast.error(res.error ?? "Erreur");
                    });
                  }}
                >
                  <input type="hidden" name="id" value={c.id} />
                  <Button size="icon-sm" variant="ghost" disabled={isPending}>
                    <Trash2 className="size-4" />
                  </Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-lg font-semibold">Ajouter un choix</h3>
        <form
          onSubmit={handleCreate}
          className="space-y-3 rounded-lg border p-4"
        >
          <div className="space-y-1">
            <Label htmlFor="label">Libellé</Label>
            <Input id="label" name="label" placeholder="Libellé du choix" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="image">Image (optionnel)</Label>
            <Input id="image" name="image" type="file" accept="image/*" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Équipe restreinte (optionnel)</Label>
              <Select name="restricted_team_id">
                <SelectTrigger>
                  <SelectValue placeholder="Aucune restriction" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="restriction_message">Message si restreint</Label>
              <Input
                id="restriction_message"
                name="restriction_message"
                placeholder="Vous ne pouvez pas voter pour…"
              />
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            Ajouter le choix
          </Button>
        </form>
      </section>
    </div>
  );
}
