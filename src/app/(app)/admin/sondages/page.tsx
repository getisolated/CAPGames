import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/cap/icons";
import { ActionForm } from "@/components/cap/action-form";
import { createPoll, deletePoll, updatePollStatus } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  closed: "Fermé",
};

export default async function AdminPollsPage() {
  const supabase = await createClient();
  const { data: polls } = await supabase
    .from("polls")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div style={{ padding: "0 22px", display: "flex", flexDirection: "column", gap: 18 }}>
      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Créer un sondage</div>
        </div>
        <ActionForm
          action={createPoll}
          successMsg="Sondage créé."
          resetOnSuccess
          className="flex flex-col gap-2"
        >
          <Input name="title" placeholder="Titre du sondage" required />
          <Textarea name="description" placeholder="Description (optionnel)" />
          <Button type="submit" className="w-full">Créer</Button>
        </ActionForm>
      </section>

      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Sondages</div>
          {polls && <span className="ad-section-sub">{polls.length} AU TOTAL</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(polls ?? []).map((poll) => (
            <div key={poll.id} className="card" style={{ padding: "14px 16px" }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{poll.title}</div>
              {poll.description && (
                <div
                  className="t-mono"
                  style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}
                >
                  {poll.description}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <span
                  className={
                    "chip " +
                    (poll.status === "open"
                      ? "live"
                      : poll.status === "closed"
                        ? "gold"
                        : "")
                  }
                >
                  {STATUS_LABEL[poll.status] ?? poll.status}
                </span>
              </div>
              <div className="cg-actions">
                <Link href={`/admin/sondages/${poll.id}`}>
                  <Button className="w-full">
                    Éditer <Icon.ArrowRight />
                  </Button>
                </Link>
                {poll.status === "draft" && (
                  <ActionForm action={updatePollStatus} successMsg="Sondage ouvert.">
                    <input type="hidden" name="id" value={poll.id} />
                    <input type="hidden" name="status" value="open" />
                    <Button variant="secondary" className="w-full">Ouvrir</Button>
                  </ActionForm>
                )}
                {poll.status === "open" && (
                  <ActionForm action={updatePollStatus} successMsg="Sondage clôturé.">
                    <input type="hidden" name="id" value={poll.id} />
                    <input type="hidden" name="status" value="closed" />
                    <Button variant="secondary" className="w-full">Clôturer</Button>
                  </ActionForm>
                )}
                <ActionForm action={deletePoll} successMsg="Sondage supprimé.">
                  <input type="hidden" name="id" value={poll.id} />
                  <Button variant="destructive" className="w-full">
                    <Icon.X /> Supprimer
                  </Button>
                </ActionForm>
              </div>
            </div>
          ))}
          {(!polls || polls.length === 0) && (
            <div className="ad-empty card">
              <div className="t-display">Aucun sondage</div>
              <div className="ad-empty-sub">Crée ton premier sondage ci-dessus.</div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
