// Couleur/short fallback déterministes si non définis sur l'équipe.
const HUES = [28, 75, 280, 45, 145, 350, 200, 100];

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function teamColor(team: { id: string; color?: string | null }): string {
  if (team.color) return team.color;
  const hue = HUES[hashCode(team.id) % HUES.length];
  return `oklch(55% 0.18 ${hue})`;
}

export function teamShort(team: { name: string; short?: string | null }): string {
  if (team.short) return team.short.toUpperCase().slice(0, 3);
  const clean = team.name.replace(/^Équipe\s+/i, "").trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export function teamShortName(name: string): string {
  return name.replace(/^Équipe\s+/i, "");
}
