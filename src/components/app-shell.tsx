"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/cap/icons";
import { AppHeader } from "@/components/cap/app-header";
import { TweaksPanel } from "@/components/cap/tweaks-panel";

type ProfileLite = {
  id: string;
  email: string;
  full_name: string | null;
  team_id: string | null;
  is_admin: boolean;
};

type Tab = {
  href: string;
  label: string;
  I: () => React.ReactElement;
  adminOnly?: boolean;
  needsTeam?: boolean;
};

export function AppShell({
  profile,
  children,
}: {
  profile: ProfileLite;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hasTeam = Boolean(profile.team_id);
  const isAdmin = profile.is_admin;

  const tabs: Tab[] = [
    { href: "/classement", label: "Scores", I: Icon.Trophy },
    { href: "/buzzer", label: "Buzzer", I: Icon.Buzzer, needsTeam: true },
    { href: "/sondages", label: "Sondages", I: Icon.Poll, needsTeam: true },
    { href: "/photos", label: "Galerie", I: Icon.Photos },
    { href: "/admin", label: "Admin", I: Icon.Admin, adminOnly: true },
  ];

  const visibleTabs = tabs.filter((t) => !(t.adminOnly && !isAdmin));

  return (
    <div className="cg-app">
      <div className="shell-leak" />
      <div className="screen">
        <AppHeader profile={profile} />
        {children}
        <nav className="tabbar">
          {visibleTabs.map((tab) => {
            const active =
              tab.href === "/classement"
                ? pathname === "/" || pathname.startsWith("/classement")
                : pathname.startsWith(tab.href);
            const locked = Boolean(tab.needsTeam && !hasTeam);
            const TabIcon = tab.I;
            return (
              <Link
                key={tab.href}
                href={locked ? "#" : tab.href}
                className={
                  "tab" +
                  (active ? " active" : "") +
                  (locked ? " locked" : "")
                }
                aria-disabled={locked || undefined}
                onClick={(e) => {
                  if (locked) e.preventDefault();
                }}
              >
                <TabIcon />
                <span>{tab.label}</span>
                {locked && (
                  <span className="tab-lock" aria-hidden>
                    <Icon.Lock />
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
      <TweaksPanel isAdmin={isAdmin} />
    </div>
  );
}
