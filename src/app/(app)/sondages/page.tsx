import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/cap/icons";

type MontageChoice = { id: string; image_path: string | null; label: string | null };

export default async function PollsListPage() {
  const supabase = await createClient();
  const { data: polls } = await supabase
    .from("polls")
    .select("*")
    .neq("status", "draft")
    .order("created_at", { ascending: false });

  const open = polls?.filter((p) => p.status === "open").length ?? 0;

  // Choix de chaque sondage (pour le montage d'aperçu)
  const pollIds = (polls ?? []).map((p) => p.id);
  const { data: choiceRows } = pollIds.length
    ? await supabase
        .from("poll_choices")
        .select("id, poll_id, label, image_path, position")
        .in("poll_id", pollIds)
        .order("position")
    : { data: [] as { id: string; poll_id: string; label: string | null; image_path: string | null }[] };

  const choicesByPoll = new Map<string, MontageChoice[]>();
  for (const c of choiceRows ?? []) {
    const arr = choicesByPoll.get(c.poll_id) ?? [];
    const url = c.image_path
      ? supabase.storage.from("poll-choices").getPublicUrl(c.image_path).data
          .publicUrl
      : null;
    arr.push({ id: c.id, image_path: url, label: c.label });
    choicesByPoll.set(c.poll_id, arr);
  }

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
                <PollMontage choices={choicesByPoll.get(p.id) ?? []} />
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

const MONTAGE_INIT_BG =
  "linear-gradient(150deg, oklch(40% 0.1 30), oklch(15% 0.04 30))";
const MONTAGE_EMPTY_BG =
  "linear-gradient(140deg, oklch(32% 0.02 250), oklch(16% 0.02 250))";

/**
 * Aperçu d'un sondage : photos / initiales des choix (comme sur les lignes).
 * ≥4 → mosaïque 2×2 · 3 → 2 à gauche + 1 à droite · 2 → 1 gauche / 1 droite ·
 * 1 → plein cadre · 0 → cadre vide.
 */
function PollMontage({ choices }: { choices: MontageChoice[] }) {
  const tiles = choices.slice(0, 4);
  const n = tiles.length;

  const areas =
    n >= 4
      ? ["a", "b", "c", "d"]
      : n === 3
        ? ["a", "b", "c"]
        : n === 2
          ? ["a", "b"]
          : ["a"];

  const gridStyle: React.CSSProperties =
    n >= 4
      ? {
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gridTemplateAreas: '"a b" "c d"',
        }
      : n === 3
        ? {
            gridTemplateColumns: "1fr 1fr",
            gridTemplateRows: "1fr 1fr",
            gridTemplateAreas: '"a c" "b c"',
          }
        : n === 2
          ? {
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "1fr",
              gridTemplateAreas: '"a b"',
            }
          : {
              gridTemplateColumns: "1fr",
              gridTemplateRows: "1fr",
              gridTemplateAreas: '"a"',
            };

  return (
    <div className="pl-poll-thumbs" aria-hidden style={gridStyle}>
      {n === 0 ? (
        <span
          className="pl-poll-thumb"
          style={{ gridArea: "a", background: MONTAGE_EMPTY_BG }}
        />
      ) : (
        tiles.map((c, i) =>
          c.image_path ? (
            <span
              key={c.id}
              className="pl-poll-thumb"
              style={{
                gridArea: areas[i],
                backgroundImage: `url(${c.image_path})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ) : (
            <span
              key={c.id}
              className="pl-poll-thumb"
              style={{ gridArea: areas[i], background: MONTAGE_INIT_BG }}
            >
              <em className="t-display">
                {(c.label || "").slice(0, 2).toUpperCase()}
              </em>
            </span>
          )
        )
      )}
    </div>
  );
}
