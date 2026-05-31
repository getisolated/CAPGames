-- =============================================================================
-- CAP Games — Schéma initial
-- ⚠️ DESTRUCTIF : supprime et recrée toutes les tables, types et données.
-- =============================================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- =============================================================================
-- DROP : ordre inverse des dépendances. CASCADE pour entraîner FK + policies.
-- =============================================================================
drop table if exists public.poll_votes         cascade;
drop table if exists public.poll_choices       cascade;
drop table if exists public.polls              cascade;
drop table if exists public.photos             cascade;
drop table if exists public.photo_albums       cascade;
drop table if exists public.buzzes             cascade;
drop table if exists public.rounds             cascade;
drop table if exists public.quiz_rooms         cascade;
drop table if exists public.team_email_invites cascade;
drop table if exists public.profiles           cascade;
drop table if exists public.teams              cascade;

drop type if exists public.room_status   cascade;
drop type if exists public.photo_status  cascade;
drop type if exists public.poll_status   cascade;

-- =============================================================================
-- TABLE: profiles
-- Un profil par utilisateur Supabase Auth. Lié 1→1 à auth.users.
-- =============================================================================
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null unique,
  full_name    text,
  team_id      uuid,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index profiles_team_id_idx on public.profiles (team_id);

-- =============================================================================
-- TABLE: teams
-- =============================================================================
create table public.teams (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  logo_url    text,
  score       integer not null default 0,
  created_at  timestamptz not null default now()
);

-- FK profiles.team_id → teams.id (différée car table créée après)
alter table public.profiles
  add constraint profiles_team_id_fkey
  foreign key (team_id) references public.teams (id) on delete set null;

-- =============================================================================
-- TABLE: team_email_invites
-- E-mails pré-enregistrés par l'admin pour rattacher un futur user à une équipe
-- =============================================================================
create table public.team_email_invites (
  id          uuid primary key default uuid_generate_v4(),
  email       text not null unique,
  team_id     uuid not null references public.teams (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index team_email_invites_email_idx on public.team_email_invites (lower(email));

-- =============================================================================
-- TABLE: quiz_rooms
-- =============================================================================
create type public.room_status as enum ('draft', 'open', 'closed');

create table public.quiz_rooms (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  status      public.room_status not null default 'draft',
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- TABLE: rounds
-- Une manche par salon. Une seule active à la fois (contrainte applicative).
-- =============================================================================
create table public.rounds (
  id            uuid primary key default uuid_generate_v4(),
  room_id       uuid not null references public.quiz_rooms (id) on delete cascade,
  round_number  integer not null,
  is_active     boolean not null default true,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  unique (room_id, round_number)
);

create unique index rounds_one_active_per_room
  on public.rounds (room_id) where is_active;

create index rounds_room_id_idx on public.rounds (room_id);

-- =============================================================================
-- TABLE: buzzes
-- Un buzz par utilisateur par manche (le serveur ignore les doublons via UNIQUE)
-- =============================================================================
create table public.buzzes (
  id          uuid primary key default uuid_generate_v4(),
  round_id    uuid not null references public.rounds (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  buzzed_at   timestamptz not null default clock_timestamp(),
  unique (round_id, user_id)
);

create index buzzes_round_id_buzzed_at_idx on public.buzzes (round_id, buzzed_at);

-- =============================================================================
-- TABLE: photo_albums
-- Albums créés librement par l'admin pour ranger les photos validées
-- =============================================================================
create table public.photo_albums (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- TABLE: photos
-- =============================================================================
create type public.photo_status as enum ('pending', 'approved', 'rejected');

create table public.photos (
  id                uuid primary key default uuid_generate_v4(),
  storage_path      text not null unique,
  uploaded_by       uuid references public.profiles (id) on delete set null,
  album_id          uuid references public.photo_albums (id) on delete set null,
  status            public.photo_status not null default 'pending',
  original_filename text,
  width             integer,
  height            integer,
  created_at        timestamptz not null default now(),
  approved_at       timestamptz
);

create index photos_status_idx on public.photos (status);
create index photos_album_id_idx on public.photos (album_id);

-- =============================================================================
-- TABLE: polls
-- =============================================================================
create type public.poll_status as enum ('draft', 'open', 'closed');

create table public.polls (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  description  text,
  status       public.poll_status not null default 'draft',
  created_at   timestamptz not null default now(),
  closed_at    timestamptz
);

-- =============================================================================
-- TABLE: poll_choices
-- =============================================================================
create table public.poll_choices (
  id                  uuid primary key default uuid_generate_v4(),
  poll_id             uuid not null references public.polls (id) on delete cascade,
  label               text,
  image_path          text,
  restricted_team_id  uuid references public.teams (id) on delete set null,
  restriction_message text,
  position            integer not null default 0,
  check (label is not null or image_path is not null)
);

create index poll_choices_poll_id_idx on public.poll_choices (poll_id);

-- =============================================================================
-- TABLE: poll_votes
-- =============================================================================
create table public.poll_votes (
  id         uuid primary key default uuid_generate_v4(),
  poll_id    uuid not null references public.polls (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  choice_id  uuid not null references public.poll_choices (id) on delete cascade,
  voted_at   timestamptz not null default now(),
  unique (poll_id, user_id)
);

create index poll_votes_poll_id_idx on public.poll_votes (poll_id);
create index poll_votes_choice_id_idx on public.poll_votes (choice_id);
