"use client";

import { signOut } from "@/app/login/actions";
import { Icon } from "@/components/cap/icons";
import { formatUserName, userInitials } from "@/lib/user-name";

type ProfileLite = {
  email: string;
  full_name: string | null;
  is_admin: boolean;
};

export function AppHeader({ profile }: { profile: ProfileLite }) {
  return (
    <header className="cg-header">
      <div className="cg-header-id">
        <div className="cg-header-avatar">{userInitials(profile)}</div>
        <div className="cg-header-meta">
          <span className="cg-header-name">{formatUserName(profile)}</span>
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
