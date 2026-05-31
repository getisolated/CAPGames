/**
 * Formate le nom d'affichage d'un utilisateur à partir de son email/full_name.
 *
 * Règles :
 * - Si full_name renseigné → on l'utilise tel quel.
 * - Sinon partie locale de l'email :
 *   - 2 parties séparées par "." → "Prenom NOM" (Prenom capitalisé, nom en MAJUSCULES)
 *   - 3+ parties → on prend 1ère et dernière (ex. "jean.pierre.dupont" → "Jean DUPONT")
 *   - Sinon → tel quel sans transformation
 */
export function formatUserName(profile: {
  email: string;
  full_name?: string | null;
}): string {
  if (profile.full_name?.trim()) return profile.full_name.trim();

  const local = profile.email.split("@")[0] ?? "";
  const parts = local.split(".").filter(Boolean);

  if (parts.length === 2) {
    return `${capitalize(parts[0])} ${parts[1].toUpperCase()}`;
  }
  if (parts.length >= 3) {
    const first = parts[0];
    const last = parts[parts.length - 1];
    return `${capitalize(first)} ${last.toUpperCase()}`;
  }

  return local;
}

/** Initiales pour l'avatar. Inchangé par le format ci-dessus. */
export function userInitials(profile: {
  email: string;
  full_name?: string | null;
}): string {
  const source = profile.full_name?.trim() || profile.email;
  const parts = source.split(/[\s.@]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}
