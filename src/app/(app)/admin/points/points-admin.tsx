"use client";

import { useState, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { adjustScore } from "./actions";
import type { Team } from "@/lib/supabase/types";

const PRESETS = [1, 5, 10, 25, 50];

export function PointsAdmin({ teams }: { teams: Team[] }) {
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  function fire(teamId: string, delta: number) {
    if (!delta) return;
    const fd = new FormData();
    fd.set("team_id", teamId);
    fd.set("delta", String(delta));
    startTransition(async () => {
      const res = await adjustScore(fd);
      if (!res.ok) toast.error(res.error ?? "Erreur");
      else toast.success(`${delta > 0 ? "+" : ""}${delta} pts`);
    });
  }

  return (
    <div className="space-y-3">
      {teams.map((team) => {
        const custVal = Number(custom[team.id] ?? 0);
        return (
          <Card key={team.id} className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  className="size-12 rounded object-cover"
                />
              ) : (
                <div className="size-12 rounded bg-muted" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{team.name}</p>
                <p className="text-2xl font-bold">{team.score} pts</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map((n) => (
                <div key={n} className="flex gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => fire(team.id, n)}
                  >
                    <Plus className="size-3" />
                    {n}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPending}
                    onClick={() => fire(team.id, -n)}
                  >
                    <Minus className="size-3" />
                    {n}
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                value={custom[team.id] ?? ""}
                placeholder="Custom"
                onChange={(e) =>
                  setCustom((s) => ({ ...s, [team.id]: e.target.value }))
                }
                className="h-8 w-24"
              />
              <Button
                size="sm"
                disabled={isPending || !custVal}
                onClick={() => {
                  fire(team.id, custVal);
                  setCustom((s) => ({ ...s, [team.id]: "" }));
                }}
              >
                Appliquer
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
