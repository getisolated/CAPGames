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

  const noTeam = profiles.filter((p) => !p.team_id);

  return (
    <div
      style={{
        padding: "0 22px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      {/* Créer une équipe */}
      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Créer une équipe</div>
        </div>
        <form onSubmit={handle(createTeam)} className="flex flex-col gap-2">
          <Input name="name" placeholder="Nom de l'équipe" required />
          <Button type="submit" className="w-full" disabled={isPending}>
            Créer
          </Button>
        </form>
      </section>

      {/* Équipes */}
      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Équipes</div>
          <span className="ad-section-sub">{teams.length}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((team) => {
            const members = profiles.filter((p) => p.team_id === team.id);
            const teamInvites = invites.filter((i) => i.team_id === team.id);
            return (
              <Card key={team.id} className="gap-3 p-4">
                <div className="flex items-center gap-3">
                  {team.logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="size-12 shrink-0 rounded-[10px] object-cover"
                    />
                  ) : (
                    <div className="size-12 shrink-0 rounded-[10px] bg-[oklch(100%_0_0_/_0.06)]" />
                  )}
                  <form
                    onSubmit={handle(updateTeam)}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <input type="hidden" name="id" value={team.id} />
                    <Input
                      name="name"
                      defaultValue={team.name}
                      className="min-w-0 flex-1"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="secondary"
                      disabled={isPending}
                    >
                      OK
                    </Button>
                  </form>
                  <form onSubmit={handle(deleteTeam)}>
                    <input type="hidden" name="id" value={team.id} />
                    <Button
                      type="submit"
                      size="icon-sm"
                      variant="ghost"
                      disabled={isPending}
                      title="Supprimer l'équipe"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                </div>

                <div
                  className="t-mono"
                  style={{
                    fontSize: 10,
                    color: "var(--text-3)",
                    letterSpacing: "0.12em",
                  }}
                >
                  {team.score} PTS
                </div>

                {/* Logo */}
                <form
                  onSubmit={handle(uploadTeamLogo)}
                  className="flex flex-col gap-2"
                >
                  <input type="hidden" name="team_id" value={team.id} />
                  <Input type="file" name="logo" accept="image/*" required />
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    disabled={isPending}
                  >
                    <Upload className="size-4" /> Mettre à jour le logo
                  </Button>
                </form>

                {/* Membres */}
                <details className="cg-details">
                  <summary>Membres ({members.length})</summary>
                  <ul className="cg-details-list">
                    {members.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{p.full_name ?? p.email}</span>
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
                    {members.length === 0 && (
                      <li className="text-[var(--text-4)]">Aucun membre.</li>
                    )}
                  </ul>
                </details>

                {/* Pré-inscription */}
                <form
                  onSubmit={handle(addEmailInvite)}
                  className="flex flex-col gap-2"
                >
                  <input type="hidden" name="team_id" value={team.id} />
                  <Input
                    name="email"
                    type="email"
                    placeholder="email@domaine.com"
                    required
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="secondary"
                    className="w-full"
                    disabled={isPending}
                  >
                    <MailPlus className="size-4" /> Pré-inscrire
                  </Button>
                </form>

                <details className="cg-details">
                  <summary>E-mails pré-enregistrés ({teamInvites.length})</summary>
                  <ul className="cg-details-list">
                    {teamInvites.map((i) => (
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
                    {teamInvites.length === 0 && (
                      <li className="text-[var(--text-4)]">Aucun e-mail.</li>
                    )}
                  </ul>
                </details>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Utilisateurs sans équipe */}
      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Utilisateurs sans équipe</div>
          <span className="ad-section-sub">{noTeam.length}</span>
        </div>
        <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {noTeam.map((p) => (
            <li key={p.id} className="card" style={{ padding: "12px 14px" }}>
              <form
                onSubmit={handle(assignUserToTeam)}
                className="flex flex-col gap-2"
              >
                <input type="hidden" name="user_id" value={p.id} />
                <span
                  className="truncate"
                  style={{ fontSize: 14, fontWeight: 600 }}
                >
                  {p.full_name ?? p.email}
                </span>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <Select name="team_id">
                      <SelectTrigger>
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
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isPending}
                    aria-label="Assigner à l'équipe"
                  >
                    <UserPlus className="size-4" />
                  </Button>
                </div>
              </form>
            </li>
          ))}
          {noTeam.length === 0 && (
            <li className="ad-empty card">
              <div className="t-display">Tout le monde a une équipe</div>
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
