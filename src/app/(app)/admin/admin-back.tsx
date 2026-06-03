"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/cap/icons";

/**
 * Bouton retour contextuel pour l'interface admin.
 * - /admin                    → retour à l'app (classement)
 * - /admin/<section>          → retour au cockpit (/admin)
 * - /admin/<section>/<id>     → retour à la section (/admin/<section>)
 */
export function AdminBack() {
  const pathname = usePathname();

  let href = "/classement";
  let label = "Retour à l'app";

  if (pathname && pathname !== "/admin") {
    const segs = pathname.split("/").filter(Boolean);
    segs.pop();
    href = "/" + segs.join("/");
    label = "Retour";
  }

  return (
    <Link
      href={href}
      className="pl-back"
      style={{ padding: "0 22px", marginTop: 12, marginBottom: 0 }}
    >
      <Icon.ArrowLeft />
      <span>{label}</span>
    </Link>
  );
}
