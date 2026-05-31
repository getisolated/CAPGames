// =============================================================================
// CAP Games — Palette + bibliothèque d'icônes pour les salons quizz
// Référencés par leur key string en BD (quiz_rooms.color / quiz_rooms.icon)
// =============================================================================

export type RoomColorKey =
  | "ember"
  | "or"
  | "nuit"
  | "braise"
  | "violet"
  | "ocean"
  | "foret"
  | "rose";

export const ROOM_COLORS: Record<RoomColorKey, { label: string; value: string }> = {
  ember:  { label: "Ember",  value: "oklch(55% 0.2 28)"  },
  or:     { label: "Or",     value: "oklch(70% 0.15 75)" },
  nuit:   { label: "Nuit",   value: "oklch(45% 0.14 280)" },
  braise: { label: "Braise", value: "oklch(52% 0.18 45)" },
  violet: { label: "Violet", value: "oklch(50% 0.18 320)" },
  ocean:  { label: "Océan",  value: "oklch(55% 0.15 220)" },
  foret:  { label: "Forêt",  value: "oklch(50% 0.13 145)" },
  rose:   { label: "Rose",   value: "oklch(65% 0.18 10)"  },
};

export function roomColor(key: string | null | undefined): string {
  if (key && key in ROOM_COLORS) {
    return ROOM_COLORS[key as RoomColorKey].value;
  }
  return ROOM_COLORS.ember.value;
}

export type RoomIconKey =
  | "buzzer"
  | "music"
  | "movie"
  | "sport"
  | "art"
  | "food"
  | "travel"
  | "history"
  | "tech"
  | "star"
  | "heart"
  | "sparkle";

export const ROOM_ICONS: { key: RoomIconKey; label: string }[] = [
  { key: "buzzer",  label: "Buzzer" },
  { key: "music",   label: "Musique" },
  { key: "movie",   label: "Cinéma" },
  { key: "sport",   label: "Sport" },
  { key: "art",     label: "Art" },
  { key: "food",    label: "Cuisine" },
  { key: "travel",  label: "Voyage" },
  { key: "history", label: "Histoire" },
  { key: "tech",    label: "Tech" },
  { key: "star",    label: "Star" },
  { key: "heart",   label: "Coup de cœur" },
  { key: "sparkle", label: "Magique" },
];
