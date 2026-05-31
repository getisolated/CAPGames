import { redirect } from "next/navigation";
import { getCachedUser, getCachedProfile } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getCachedUser();
  if (!user) redirect("/login");

  const profile = await getCachedProfile();

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
