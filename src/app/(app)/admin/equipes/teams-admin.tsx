"use client";

import { useTransition } from "react";
import { Trash2, UserPlus, Upload, MailPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Profile, Team, TeamEmailInvite } from "@/lib/supabase/types";
import {
  addEmailInvite,
  assignUserToTeam,
  createTeam,
  deleteTeam,
  removeEmailInvite,
  updateTeam,
  uploadTeamLogo,
} from "./actions";

type Props = {
  teams: Team[];
  profiles: Profile[];
  invites: TeamEmailInvite[];
};

export function TeamsAdmin({ teams, profiles, invites }: Props) {
  const [isPending, startTransition] = useTransition();

  function handle<T extends (fd: FormData) => Promise<{ ok: boolean; error?: string }>>(
    action: T
  ) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      startTransition(async () => {
        const res = await action(fd);
        if (!res.ok) toast.error(res.error ?? "Erreur");
        else {
          toast.success("Fait.");
          form.reset();
        }
      });
    };
  }

  return (
    <div className="space-y-8" style={{ margin: "calc(var(--spacing) * 4)" }}>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Créer une équipe</h2>
        <form onSubmit={handle(createTeam)} className="flex gap-2">
          <Input name="name" placeholder="Nom de l'équipe" required />
          <Button type="submit" disabled={isPending}>
            Créer
          </Button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Équipes</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.id} className="space-y-3 p-4">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="size-14 rounded object-cover"
                  />
                ) : (
                  <div className="size-14 rounded bg-muted" />
                )}
                <div className="flex-1">
                  <form
                    onSubmit={handle(updateTeam)}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="id" value={team.id} />
                    <Input
                      name="name"
                      defaultValue={team.name}
                      className="h-8"
                    />
                    <Button type="submit" size="sm" disabled={isPending}>
                      OK
                    </Button>
                  </form>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Score : {team.score}
                  </p>
                </div>
                <form onSubmit={handle(deleteTeam)}>
                  <input type="hidden" name="id" value={team.id} />
                  <Button
                    type="submit"
                    size="icon-sm"
                    variant="ghost"
                    disabled={isPending}
                    title="Supprimer"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </form>
              </div>

              <form
                onSubmit={handle(uploadTeamLogo)}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="team_id" value={team.id} />
                <Input
                  type="file"
                  name="logo"
                  accept="image/*"
                  required
                  className="h-8"
                />
                <Button type="submit" size="sm" disabled={isPending}>
                  <Upload className="size-4" /> Logo
                </Button>
              </form>

              <details className="rounded border p-2 text-sm">
                <summary className="cursor-pointer font-medium">
                  Membres ({profiles.filter((p) => p.team_id === team.id).length})
                </summary>
                <ul className="mt-2 space-y-1">
                  {profiles
                    .filter((p) => p.team_id === team.id)
                    .map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">
                          {p.full_name ?? p.email}
                        </span>
                        <form onSubmit={handle(assignUserToTeam)}>
                          <input type="hidden" name="user_id" value={p.id} />
                          <input type="hidden" name="team_id" value="" />
                          <Button
                            type="submit"
                            size="xs"
                            variant="ghost"
                            disabled={isPending}
                          >
                            Retirer
                          </Button>
                        </form>
                      </li>
                    ))}
                </ul>
              </details>

              <form
                onSubmit={handle(addEmailInvite)}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="team_id" value={team.id} />
                <Input
                  name="email"
                  type="email"
                  placeholder="email@domaine.com"
                  required
                  className="h-8"
                />
                <Button type="submit" size="sm" disabled={isPending}>
                  <MailPlus className="size-4" /> Pré-inscrire
                </Button>
              </form>

              <details className="rounded border p-2 text-sm">
                <summary className="cursor-pointer font-medium">
                  E-mails pré-enregistrés (
                  {invites.filter((i) => i.team_id === team.id).length})
                </summary>
                <ul className="mt-2 space-y-1">
                  {invites
                    .filter((i) => i.team_id === team.id)
                    .map((i) => (
                      <li
                        key={i.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{i.email}</span>
                        <form onSubmit={handle(removeEmailInvite)}>
                          <input type="hidden" name="id" value={i.id} />
                          <Button
                            type="submit"
                            size="icon-xs"
                            variant="ghost"
                            disabled={isPending}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </form>
                      </li>
                    ))}
                </ul>
              </details>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Utilisateurs sans équipe</h2>
        <ul className="space-y-1">
          {profiles
            .filter((p) => !p.team_id)
            .map((p) => (
              <li key={p.id}>
                <form
                  onSubmit={handle(assignUserToTeam)}
                  className="flex items-center gap-2"
                >
                  <input type="hidden" name="user_id" value={p.id} />
                  <span className="flex-1 truncate text-sm">
                    {p.full_name ?? p.email}
                  </span>
                  <Select name="team_id">
                    <SelectTrigger className="h-8 w-44">
                      <SelectValue placeholder="Choisir une équipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" size="sm" disabled={isPending}>
                    <UserPlus className="size-4" />
                  </Button>
                </form>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
