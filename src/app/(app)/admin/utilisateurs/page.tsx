import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/cap/action-form";
import { setAdmin } from "./actions";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_admin, team:teams(name)")
    .order("is_admin", { ascending: false })
    .order("email");

  return (
    <div style={{ padding: "0 22px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="ad-section-head">
        <div className="t-eyebrow">Utilisateurs</div>
        {profiles && <span className="ad-section-sub">{profiles.length} AU TOTAL</span>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(profiles ?? []).map((p) => {
          const teamArr = p.team as unknown as { name: string }[] | { name: string } | null;
          const team = Array.isArray(teamArr) ? (teamArr[0] ?? null) : teamArr;
          return (
            <div
              key={p.id}
              className="card"
              style={{
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {p.full_name ?? p.email}
                </div>
                <div
                  className="t-mono"
                  style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}
                >
                  {p.email}
                  {team ? ` · ${team.name}` : ""}
                </div>
              </div>
              {p.is_admin && <span className="chip gold">ADMIN</span>}
              <ActionForm
                action={setAdmin}
                successMsg={p.is_admin ? "Admin révoqué." : "Admin promu."}
              >
                <input type="hidden" name="user_id" value={p.id} />
                <input
                  type="hidden"
                  name="is_admin"
                  value={p.is_admin ? "false" : "true"}
                />
                <Button size="sm" variant={p.is_admin ? "outline" : "default"}>
                  {p.is_admin ? "Révoquer" : "Promouvoir"}
                </Button>
              </ActionForm>
            </div>
          );
        })}
      </div>
    </div>
  );
}
