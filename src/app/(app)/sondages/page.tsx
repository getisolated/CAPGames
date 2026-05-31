import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/cap/icons";

export default async function PollsListPage() {
  const supabase = await createClient();
  const { data: polls } = await supabase
    .from("polls")
    .select("*")
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  const open = polls?.filter((p) => p.status === "open").length ?? 0;

  return (
    <div className="screen">
      <div className="pl-wrap pl-head" style={{ padding: "12px 22px 16px" }}>
        <div className="t-eyebrow">Sondages de la soirée</div>
        <h1 className="pl-title t-display" style={{ fontSize: 36 }}>
          À toi de<br />
          <span className="t-serif-it">choisir.</span>
        </h1>
        {polls && (
          <div className="pl-meta">
            {open} OUVERT{open > 1 ? "S" : ""} · {polls.length} AU TOTAL
          </div>
        )}
      </div>

      <div className="scroll-area">
        {!polls || polls.length === 0 ? (
          <div className="px-6">
            <div className="ad-empty card">
              <div className="t-display">Aucun sondage</div>
              <div className="t-mono ad-empty-sub">
                L&apos;animateur n&apos;a pas encore ouvert de vote.
              </div>
            </div>
          </div>
        ) : (
          <div className="pl-list" style={{ padding: "0 22px" }}>
            {polls.map((p) => (
              <Link
                key={p.id}
                href={`/sondages/${p.id}`}
                className={
                  "pl-poll" + (p.status === "closed" ? " is-closed" : "")
                }
              >
                <div className="pl-poll-thumbs" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="pl-poll-thumb"
                      style={{
                        background: `linear-gradient(140deg, oklch(50% 0.18 ${
                          28 + i * 18
                        }), oklch(20% 0.06 ${22 + i * 18}))`,
                      }}
                    >
                      <em className="t-display">?</em>
                    </span>
                  ))}
                </div>
                <div className="pl-poll-body">
                  <div className="pl-poll-row">
                    <span
                      className={
                        "chip " + (p.status === "closed" ? "gold" : "live")
                      }
                    >
                      {p.status === "closed" ? "CLOS" : "OUVERT"}
                    </span>
                  </div>
                  <div className="pl-poll-title">{p.title}</div>
                  {p.description && (
                    <div className="pl-poll-q">{p.description}</div>
                  )}
                  <div className="pl-poll-foot">
                    <span>
                      {p.status === "closed" ? "VOIR RÉSULTATS" : "TON VOTE COMPTE"}
                    </span>
                    <span className="pl-poll-arrow">
                      <Icon.ArrowRight />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
