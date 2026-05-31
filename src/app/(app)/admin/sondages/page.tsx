import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/cap/icons";
import { createPoll, deletePoll, updatePollStatus } from "./actions";

async function submitCreatePoll(fd: FormData) {
  "use server";
  await createPoll(fd);
}
async function submitDeletePoll(fd: FormData) {
  "use server";
  await deletePoll(fd);
}
async function submitUpdatePollStatus(fd: FormData) {
  "use server";
  await updatePollStatus(fd);
}

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
        <form action={submitCreatePoll} className="flex flex-col gap-2">
          <Input name="title" placeholder="Titre du sondage" required />
          <Textarea name="description" placeholder="Description (optionnel)" />
          <Button type="submit" className="self-start">Créer</Button>
        </form>
      </section>

      <section>
        <div className="ad-section-head">
          <div className="t-eyebrow">Sondages</div>
          {polls && <span className="ad-section-sub">{polls.length} AU TOTAL</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(polls ?? []).map((poll) => (
            <div
              key={poll.id}
              className="card"
              style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600 }}>{poll.title}</div>
                {poll.description && (
                  <div className="t-mono" style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                    {poll.description}
                  </div>
                )}
                <span
                  className={
                    "chip " +
                    (poll.status === "open" ? "live" : poll.status === "closed" ? "gold" : "")
                  }
                  style={{ marginTop: 6 }}
                >
                  {poll.status}
                </span>
              </div>
              <Link href={`/admin/sondages/${poll.id}`}>
                <Button size="sm">Éditer</Button>
              </Link>
              {poll.status === "draft" && (
                <form action={submitUpdatePollStatus}>
                  <input type="hidden" name="id" value={poll.id} />
                  <input type="hidden" name="status" value="open" />
                  <Button size="sm" variant="secondary">Ouvrir</Button>
                </form>
              )}
              {poll.status === "open" && (
                <form action={submitUpdatePollStatus}>
                  <input type="hidden" name="id" value={poll.id} />
                  <input type="hidden" name="status" value="closed" />
                  <Button size="sm" variant="secondary">Clôturer</Button>
                </form>
              )}
              <form action={submitDeletePoll}>
                <input type="hidden" name="id" value={poll.id} />
                <Button size="sm" variant="destructive" aria-label="Supprimer">
                  <Icon.X />
                </Button>
              </form>
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
