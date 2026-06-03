// Types générés à la main qui reflètent le schéma SQL.
// À long terme, remplacer par : `supabase gen types typescript --linked > src/lib/supabase/types.generated.ts`

export type RoomStatus = "draft" | "open" | "closed";
export type PhotoStatus = "pending" | "approved" | "rejected";
export type PollStatus = "draft" | "open" | "closed";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  team_id: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Team {
  id: string;
  name: string;
  logo_url: string | null;
  score: number;
  color: string | null;
  short: string | null;
  created_at: string;
}

export interface TeamEmailInvite {
  id: string;
  email: string;
  team_id: string;
  created_at: string;
}

export type BuzzerStyle = "circle" | "arcade" | "physical";
export type QuizMode = "buzzer" | "questions";

export interface QuizRoom {
  id: string;
  name: string;
  status: RoomStatus;
  buzzer_style: BuzzerStyle;
  color: string;
  icon: string;
  mode: QuizMode;
  created_by: string | null;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  room_id: string;
  position: number;
  text: string;
  image_path: string | null;
  reveal_message: string | null;
  created_at: string;
}

export interface QuizOption {
  id: string;
  question_id: string;
  label: string;
  is_correct: boolean;
  image_path: string | null;
  position: number;
}

export interface QuizAnswer {
  id: string;
  round_id: string;
  user_id: string;
  option_id: string;
  answered_at: string;
}

export interface QuizAnswerCount {
  round_id: string;
  question_id: string;
  option_id: string;
  label: string;
  is_correct: boolean;
  n_votes: number;
}

export interface Round {
  id: string;
  room_id: string;
  round_number: number;
  is_active: boolean;
  started_at: string;
  ended_at: string | null;
  question_id: string | null;
  revealed: boolean;
}

export interface Buzz {
  id: string;
  round_id: string;
  user_id: string;
  buzzed_at: string;
}

export interface BuzzOrdered extends Buzz {
  position: number;
  user_name: string | null;
  user_email: string;
  team_id: string | null;
  team_name: string | null;
  team_logo_url: string | null;
}

export interface PhotoAlbum {
  id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface Photo {
  id: string;
  storage_path: string;
  uploaded_by: string | null;
  album_id: string | null;
  status: PhotoStatus;
  original_filename: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  approved_at: string | null;
}

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  status: PollStatus;
  created_at: string;
  closed_at: string | null;
}

export interface PollChoice {
  id: string;
  poll_id: string;
  label: string | null;
  image_path: string | null;
  restricted_team_id: string | null;
  restriction_message: string | null;
  position: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  choice_id: string;
  voted_at: string;
}

export interface PollResult {
  poll_id: string;
  choice_id: string;
  label: string | null;
  image_path: string | null;
  votes: number;
}

export interface LeaderboardRow {
  id: string;
  name: string;
  logo_url: string | null;
  score: number;
  color: string | null;
  short: string | null;
  rank: number;
}
