import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/cap/icons";

export default async function AdminHome() {
  const supabase = await createClient();
  const [{ count: nbTeams }, { count: nbUsers }, { count: nbPhotos }, { count: nbRooms }] =
    await Promise.all([
      supabase.from("teams").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase
        .from("photos")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("quiz_rooms")
        .select("*", { count: "exact", head: true })
        .eq("status", "open"),
    ]);

  const stats = [
    { label: "Équipes", value: nbTeams ?? 0, href: "/admin/equipes" },
    { label: "Utilisateurs", value: nbUsers ?? 0, href: "/admin/utilisateurs" },
    { label: "Photos en attente", value: nbPhotos ?? 0, href: "/admin/photos" },
    { label: "Salons ouverts", value: nbRooms ?? 0, href: "/admin/quizz" },
  ];

  const sections = [
    {
      href: "/admin/equipes",
      title: "Équipes",
      desc: "Créer, assigner, gérer les logos.",
      I: Icon.Trophy,
    },
    {
      href: "/admin/quizz",
      title: "Quizz",
      desc: "Salons, manches, buzzer.",
      I: Icon.Buzzer,
    },
    {
      href: "/admin/photos",
      title: "Photos",
      desc: "Modération, albums.",
      I: Icon.Photos,
    },
    {
      href: "/admin/sondages",
      title: "Sondages",
      desc: "Créer, ouvrir, clôturer.",
      I: Icon.Poll,
    },
    {
      href: "/admin/points",
      title: "Points",
      desc: "Ajuster les scores équipe.",
      I: Icon.Plus,
    },
    {
      href: "/admin/utilisateurs",
      title: "Utilisateurs",
      desc: "Rôles & accès.",
      I: Icon.User,
    },
  ];

  return (
    <div style={{ padding: "0 22px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="ad-section-head">
        <div className="t-eyebrow">RÉCAP DE LA SOIRÉE</div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="card"
            style={{
              padding: "14px 16px",
              textDecoration: "none",
              color: "var(--text)",
            }}
          >
            <div className="t-eyebrow">{s.label}</div>
            <div
              className="t-display"
              style={{ fontSize: 32, marginTop: 6, color: "var(--tertiary-glow)" }}
            >
              {s.value}
            </div>
          </Link>
        ))}
      </div>

      <div className="ad-section-head">
        <div className="t-eyebrow">SECTIONS</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sections.map((s) => {
          const I = s.I;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="pl-poll"
              style={{
                gridTemplateColumns: "auto 1fr auto",
                padding: "14px 16px",
                gap: 14,
              }}
            >
              <div
                className="g-icon-btn"
                style={{
                  width: 44,
                  height: 44,
                  background: "oklch(70% 0.14 57 / 0.18)",
                  color: "var(--tertiary-glow)",
                  border: "1px solid oklch(70% 0.14 57 / 0.3)",
                }}
              >
                <I />
              </div>
              <div>
                <div className="pl-poll-title" style={{ fontSize: 18 }}>
                  {s.title}
                </div>
                <div className="pl-poll-q">{s.desc}</div>
              </div>
              <span className="pl-poll-arrow">
                <Icon.ArrowRight />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
