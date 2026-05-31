"use client";

import { useMemo, useState, useTransition } from "react";
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
import { formatUserName } from "@/lib/user-name";
import { usePollVotesRealtime } from "@/hooks/use-poll-votes-realtime";
import { createChoice, deleteChoice } from "../actions";
import type { Poll, PollChoice, Team } from "@/lib/supabase/types";
import type { PollVoteDetail } from "./page";

export function PollEditor({
  poll,
  choices,
  teams,
  votes: initialVotes,
}: {
  poll: Poll;
  choices: PollChoice[];
  teams: Team[];
  votes: PollVoteDetail[];
}) {
  const [isPending, startTransition] = useTransition();
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const votes = usePollVotesRealtime(poll.id, initialVotes);

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

  const votesByChoice = useMemo(() => {
    const map = new Map<string, PollVoteDetail[]>();
    for (const v of votes) {
      const arr = map.get(v.choice_id) ?? [];
      arr.push(v);
      map.set(v.choice_id, arr);
    }
    return map;
  }, [votes]);

  const totalVotes = votes.length;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold">{poll.title}</h2>
        {poll.description ? (
          <p className="text-muted-foreground">{poll.description}</p>
        ) : null}
      </header>

      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Résultats · en direct</div>
          <span className="ad-section-sub">
            {totalVotes} VOTE{totalVotes > 1 ? "S" : ""}
          </span>
        </div>

        {choices.length === 0 ? (
          <p className="text-sm text-[var(--text-3)]">
            Ajoute des choix ci-dessous pour commencer à recevoir des votes.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {choices.map((c) => {
              const choiceVotes = votesByChoice.get(c.id) ?? [];
              const n = choiceVotes.length;
              const pct = totalVotes > 0 ? Math.round((n / totalVotes) * 100) : 0;
              const isOpen = openDetails[c.id] ?? false;
              return (
                <div key={c.id} className="card" style={{ padding: "12px 14px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {c.label || "(sans libellé)"}
                      </div>
                    </div>
                    <span
                      className="t-mono"
                      style={{
                        fontSize: 12,
                        color: "var(--tertiary-glow)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {n} · {pct}%
                    </span>
                  </div>
                  <div className="pl-card-bar" style={{ marginTop: 0 }}>
                    <div
                      className="pl-card-bar-fill"
                      style={{
                        width: pct + "%",
                        background: "var(--tertiary)",
                      }}
                    />
                  </div>
                  {n > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setOpenDetails((s) => ({ ...s, [c.id]: !isOpen }))
                        }
                        className="t-mono"
                        style={{
                          appearance: "none",
                          background: "transparent",
                          border: 0,
                          color: "var(--text-3)",
                          fontSize: 10,
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                          padding: "8px 0 0",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        {isOpen ? "▾" : "▸"} Détail des votants ({n})
                      </button>
                      {isOpen && (
                        <ul
                          style={{
                            listStyle: "none",
                            padding: "6px 0 0",
                            margin: 0,
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                          }}
                        >
                          {choiceVotes.map((v) => (
                            <li
                              key={v.user_id}
                              style={{
                                fontSize: 12,
                                color: "var(--text-2)",
                                padding: "4px 8px",
                                background: "oklch(100% 0 0 / 0.03)",
                                borderRadius: 6,
                              }}
                            >
                              {formatUserName({
                                email: v.user_email,
                                full_name: v.user_name,
                              })}
                              <span
                                className="t-mono"
                                style={{
                                  marginLeft: 8,
                                  color: "var(--text-4)",
                                  fontSize: 10,
                                }}
                              >
                                {v.user_email}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Choix existants</div>
        </div>
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
                      Restreint à :{" "}
                      {teams.find((t) => t.id === c.restricted_team_id)?.name}
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
        <div className="ad-section-head">
          <div className="t-eyebrow">Ajouter un choix</div>
        </div>
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
              <Select name="restricted_team_id" defaultValue="__none__">
                <SelectTrigger>
                  <SelectValue placeholder="Aucune restriction" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucune restriction</SelectItem>
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
