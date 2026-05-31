"use client";

import { signOut } from "@/app/login/actions";
import { Icon } from "@/components/cap/icons";

type ProfileLite = {
  email: string;
  full_name: string | null;
  is_admin: boolean;
};

function initialsFor(profile: ProfileLite): string {
  const source = profile.full_name?.trim() || profile.email;
  const parts = source.split(/[\s.@]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function displayName(profile: ProfileLite): string {
  if (profile.full_name) return profile.full_name;
  return profile.email.split("@")[0];
}

export function AppHeader({ profile }: { profile: ProfileLite }) {
  return (
    <header className="cg-header">
      <div className="cg-header-id">
        <div className="cg-header-avatar">{initialsFor(profile)}</div>
        <div className="cg-header-meta">
          <span className="cg-header-name">{displayName(profile)}</span>
          {profile.is_admin && <span className="chip gold cg-header-chip">ADMIN</span>}
        </div>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="cg-header-logout"
          aria-label="Se déconnecter"
          title="Se déconnecter"
        >
          <Icon.LogOut />
          <span>Quitter</span>
        </button>
      </form>
    </header>
  );
}
