import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, team_id, is_admin")
    .eq("id", user.id)
    .single();

  return (
    <AppShell
      profile={
        profile ?? {
          id: user.id,
          email: user.email ?? "",
          full_name: null,
          team_id: null,
          is_admin: false,
        }
      }
    >
      {children}
    </AppShell>
  );
}
