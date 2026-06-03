import { requireAdmin } from "@/lib/auth";
import { AdminTabs } from "./admin-tabs";
import { AdminBack } from "./admin-back";

const tabs = [
  { href: "/admin", label: "Cockpit" },
  { href: "/admin/equipes", label: "Équipes" },
  { href: "/admin/quizz", label: "Quizz" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/sondages", label: "Sondages" },
  { href: "/admin/points", label: "Points" },
  { href: "/admin/utilisateurs", label: "Users" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="screen admin-screen">
      <AdminBack />
      <div className="ad-head">
        <div>
          <div
            className="t-eyebrow"
            style={{ color: "var(--tertiary-glow)" }}
          >
            MODE ANIMATEUR
          </div>
          <h1 className="ad-title t-display">
            Cockpit<br />
            <span className="t-serif-it">de soirée.</span>
          </h1>
        </div>
        <span className="chip gold">ADMIN</span>
      </div>

      <AdminTabs tabs={tabs} />

      <div className="scroll-area">{children}</div>
    </div>
  );
}
