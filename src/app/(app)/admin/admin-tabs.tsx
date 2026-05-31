"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminTab = { href: string; label: string };

export function AdminTabs({ tabs }: { tabs: AdminTab[] }) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    // /admin = exact (sinon il match tous les autres /admin/*)
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="ad-tabs">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={"ad-tab" + (isActive(t.href) ? " on" : "")}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
