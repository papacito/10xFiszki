-- migration: create core schema for flashcards and srs
-- purpose: add generation, flashcards, srs, analytics tables and policies
-- affected: generation_sessions, generation_cards, flashcards, flashcard_decisions,
--           srs_card_state, srs_sessions, srs_reviews, analytics_events
-- notes: uses pgcrypto for gen_random_uuid(); rls enabled on all tables

-- ensure uuid generation is available
create extension if not exists pgcrypto;

-- ============================================================================
-- generation sessions
-- ============================================================================
-- stores user prompts and model metadata for ai generations
create table if not exists public.generation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_text text not null,
  input_char_count integer not null check (input_char_count >= 1),
  model_provider text not null,
  model_name text not null,
  created_at timestamptz not null default now()
);

-- enable rls for generation_sessions
alter table public.generation_sessions enable row level security;

-- ============================================================================
-- generation cards
-- ============================================================================
-- stores ai-proposed flashcards for auditing and decisions
create table if not exists public.generation_cards (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.generation_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  front text not null,
  back text not null,
  position integer not null check (position >= 1),
  created_at timestamptz not null default now(),
  unique (session_id, position)
);

-- enable rls for generation_cards
alter table public.generation_cards enable row level security;

-- ============================================================================
-- flashcards
-- ============================================================================
-- canonical flashcard records used by srs
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  front text not null,
  back text not null,
  source_type text not null check (source_type in ('ai', 'manual')),
  source_generation_card_id uuid references public.generation_cards(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- enable rls for flashcards
alter table public.flashcards enable row level security;

-- ============================================================================
-- flashcard decisions
-- ============================================================================
-- stores user decisions for ai-generated cards
create table if not exists public.flashcard_decisions (
  id uuid primary key default gen_random_uuid(),
  generation_card_id uuid not null references public.generation_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('accept', 'edit', 'reject')),
  edited_front text,
  edited_back text,
  accepted_flashcard_id uuid references public.flashcards(id) on delete set null,
  decided_at timestamptz not null default now(),
  unique (generation_card_id),
  -- accepted_flashcard_id should only be set when decision is accept or edit
  check (accepted_flashcard_id is null or decision in ('accept', 'edit'))
);

-- enable rls for flashcard_decisions
alter table public.flashcard_decisions enable row level security;

-- ============================================================================
-- srs card state
-- ============================================================================
-- tracks the current sm-2 state for each flashcard
create table if not exists public.srs_card_state (
  flashcard_id uuid primary key references public.flashcards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  ease_factor numeric(4,2) not null default 2.50 check (ease_factor >= 1.30),
  interval_days integer not null default 0 check (interval_days >= 0),
  repetition integer not null default 0 check (repetition >= 0),
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enable rls for srs_card_state
alter table public.srs_card_state enable row level security;

-- ============================================================================
-- srs sessions
-- ============================================================================
-- represents a user review session
create table if not exists public.srs_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

-- enable rls for srs_sessions
alter table public.srs_sessions enable row level security;

-- ============================================================================
-- srs reviews
-- ============================================================================
-- immutable history of individual card reviews
create table if not exists public.srs_reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.srs_sessions(id) on delete set null,
  flashcard_id uuid not null references public.flashcards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 0 and 5),
  reviewed_at timestamptz not null default now(),
  interval_days_after integer not null check (interval_days_after >= 0),
  ease_factor_after numeric(4,2) not null check (ease_factor_after >= 1.30),
  repetition_after integer not null check (repetition_after >= 0),
  due_at_after timestamptz not null
);

-- enable rls for srs_reviews
alter table public.srs_reviews enable row level security;

-- ============================================================================
-- analytics events
-- ============================================================================
-- lightweight event log for mvp analytics
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in (
    'generate', 'accept', 'edit', 'reject', 'create_manual', 'start_srs', 'complete_srs'
  )),
  generation_session_id uuid references public.generation_sessions(id) on delete set null,
  generation_card_id uuid references public.generation_cards(id) on delete set null,
  flashcard_id uuid references public.flashcards(id) on delete set null,
  srs_session_id uuid references public.srs_sessions(id) on delete set null,
  created_at timestamptz not null default now()
);

-- enable rls for analytics_events
alter table public.analytics_events enable row level security;

-- ============================================================================
-- indexes
-- ============================================================================
-- user activity and sorting indexes
create index if not exists generation_sessions_user_created_at_idx
  on public.generation_sessions (user_id, created_at desc);

create index if not exists generation_cards_user_created_at_idx
  on public.generation_cards (user_id, created_at desc);

create index if not exists flashcards_user_created_at_idx
  on public.flashcards (user_id, created_at desc);

create index if not exists flashcards_user_active_idx
  on public.flashcards (user_id, deleted_at)
  where deleted_at is null;

create index if not exists flashcard_decisions_user_decided_at_idx
  on public.flashcard_decisions (user_id, decided_at desc);

create index if not exists srs_card_state_user_due_at_idx
  on public.srs_card_state (user_id, due_at);

create index if not exists srs_sessions_user_started_at_idx
  on public.srs_sessions (user_id, started_at desc);

create index if not exists srs_reviews_user_reviewed_at_idx
  on public.srs_reviews (user_id, reviewed_at desc);

create index if not exists analytics_events_user_created_at_idx
  on public.analytics_events (user_id, created_at desc);

create index if not exists analytics_events_event_created_at_idx
  on public.analytics_events (event_type, created_at desc);

-- ============================================================================
-- rls policies: generation_sessions
-- ============================================================================
-- anon select: only own rows
create policy generation_sessions_select_anon
  on public.generation_sessions
  for select
  to anon
  using (auth.uid() = user_id);

-- anon insert: only for own user_id
create policy generation_sessions_insert_anon
  on public.generation_sessions
  for insert
  to anon
  with check (auth.uid() = user_id);

-- anon update: only own rows, keep user_id aligned
create policy generation_sessions_update_anon
  on public.generation_sessions
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- anon delete: only own rows
create policy generation_sessions_delete_anon
  on public.generation_sessions
  for delete
  to anon
  using (auth.uid() = user_id);

-- authenticated select: only own rows
create policy generation_sessions_select_authenticated
  on public.generation_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated insert: only for own user_id
create policy generation_sessions_insert_authenticated
  on public.generation_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- authenticated update: only own rows, keep user_id aligned
create policy generation_sessions_update_authenticated
  on public.generation_sessions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- authenticated delete: only own rows
create policy generation_sessions_delete_authenticated
  on public.generation_sessions
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- rls policies: generation_cards
-- ============================================================================
-- anon select: only own rows
create policy generation_cards_select_anon
  on public.generation_cards
  for select
  to anon
  using (auth.uid() = user_id);

-- anon insert: only for own user_id
create policy generation_cards_insert_anon
  on public.generation_cards
  for insert
  to anon
  with check (auth.uid() = user_id);

-- anon update: only own rows, keep user_id aligned
create policy generation_cards_update_anon
  on public.generation_cards
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- anon delete: only own rows
create policy generation_cards_delete_anon
  on public.generation_cards
  for delete
  to anon
  using (auth.uid() = user_id);

-- authenticated select: only own rows
create policy generation_cards_select_authenticated
  on public.generation_cards
  for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated insert: only for own user_id
create policy generation_cards_insert_authenticated
  on public.generation_cards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- authenticated update: only own rows, keep user_id aligned
create policy generation_cards_update_authenticated
  on public.generation_cards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- authenticated delete: only own rows
create policy generation_cards_delete_authenticated
  on public.generation_cards
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- rls policies: flashcards
-- ============================================================================
-- anon select: only own rows
create policy flashcards_select_anon
  on public.flashcards
  for select
  to anon
  using (auth.uid() = user_id);

-- anon insert: only for own user_id
create policy flashcards_insert_anon
  on public.flashcards
  for insert
  to anon
  with check (auth.uid() = user_id);

-- anon update: only own rows, keep user_id aligned
create policy flashcards_update_anon
  on public.flashcards
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- anon delete: only own rows
create policy flashcards_delete_anon
  on public.flashcards
  for delete
  to anon
  using (auth.uid() = user_id);

-- authenticated select: only own rows
create policy flashcards_select_authenticated
  on public.flashcards
  for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated insert: only for own user_id
create policy flashcards_insert_authenticated
  on public.flashcards
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- authenticated update: only own rows, keep user_id aligned
create policy flashcards_update_authenticated
  on public.flashcards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- authenticated delete: only own rows
create policy flashcards_delete_authenticated
  on public.flashcards
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- rls policies: flashcard_decisions
-- ============================================================================
-- anon select: only own rows
create policy flashcard_decisions_select_anon
  on public.flashcard_decisions
  for select
  to anon
  using (auth.uid() = user_id);

-- anon insert: only for own user_id
create policy flashcard_decisions_insert_anon
  on public.flashcard_decisions
  for insert
  to anon
  with check (auth.uid() = user_id);

-- anon update: only own rows, keep user_id aligned
create policy flashcard_decisions_update_anon
  on public.flashcard_decisions
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- anon delete: only own rows
create policy flashcard_decisions_delete_anon
  on public.flashcard_decisions
  for delete
  to anon
  using (auth.uid() = user_id);

-- authenticated select: only own rows
create policy flashcard_decisions_select_authenticated
  on public.flashcard_decisions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated insert: only for own user_id
create policy flashcard_decisions_insert_authenticated
  on public.flashcard_decisions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- authenticated update: only own rows, keep user_id aligned
create policy flashcard_decisions_update_authenticated
  on public.flashcard_decisions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- authenticated delete: only own rows
create policy flashcard_decisions_delete_authenticated
  on public.flashcard_decisions
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- rls policies: srs_card_state
-- ============================================================================
-- anon select: only own rows
create policy srs_card_state_select_anon
  on public.srs_card_state
  for select
  to anon
  using (auth.uid() = user_id);

-- anon insert: only for own user_id
create policy srs_card_state_insert_anon
  on public.srs_card_state
  for insert
  to anon
  with check (auth.uid() = user_id);

-- anon update: only own rows, keep user_id aligned
create policy srs_card_state_update_anon
  on public.srs_card_state
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- anon delete: only own rows
create policy srs_card_state_delete_anon
  on public.srs_card_state
  for delete
  to anon
  using (auth.uid() = user_id);

-- authenticated select: only own rows
create policy srs_card_state_select_authenticated
  on public.srs_card_state
  for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated insert: only for own user_id
create policy srs_card_state_insert_authenticated
  on public.srs_card_state
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- authenticated update: only own rows, keep user_id aligned
create policy srs_card_state_update_authenticated
  on public.srs_card_state
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- authenticated delete: only own rows
create policy srs_card_state_delete_authenticated
  on public.srs_card_state
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- rls policies: srs_sessions
-- ============================================================================
-- anon select: only own rows
create policy srs_sessions_select_anon
  on public.srs_sessions
  for select
  to anon
  using (auth.uid() = user_id);

-- anon insert: only for own user_id
create policy srs_sessions_insert_anon
  on public.srs_sessions
  for insert
  to anon
  with check (auth.uid() = user_id);

-- anon update: only own rows, keep user_id aligned
create policy srs_sessions_update_anon
  on public.srs_sessions
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- anon delete: only own rows
create policy srs_sessions_delete_anon
  on public.srs_sessions
  for delete
  to anon
  using (auth.uid() = user_id);

-- authenticated select: only own rows
create policy srs_sessions_select_authenticated
  on public.srs_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated insert: only for own user_id
create policy srs_sessions_insert_authenticated
  on public.srs_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- authenticated update: only own rows, keep user_id aligned
create policy srs_sessions_update_authenticated
  on public.srs_sessions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- authenticated delete: only own rows
create policy srs_sessions_delete_authenticated
  on public.srs_sessions
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- rls policies: srs_reviews
-- ============================================================================
-- anon select: only own rows
create policy srs_reviews_select_anon
  on public.srs_reviews
  for select
  to anon
  using (auth.uid() = user_id);

-- anon insert: only for own user_id
create policy srs_reviews_insert_anon
  on public.srs_reviews
  for insert
  to anon
  with check (auth.uid() = user_id);

-- anon update: only own rows, keep user_id aligned
create policy srs_reviews_update_anon
  on public.srs_reviews
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- anon delete: only own rows
create policy srs_reviews_delete_anon
  on public.srs_reviews
  for delete
  to anon
  using (auth.uid() = user_id);

-- authenticated select: only own rows
create policy srs_reviews_select_authenticated
  on public.srs_reviews
  for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated insert: only for own user_id
create policy srs_reviews_insert_authenticated
  on public.srs_reviews
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- authenticated update: only own rows, keep user_id aligned
create policy srs_reviews_update_authenticated
  on public.srs_reviews
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- authenticated delete: only own rows
create policy srs_reviews_delete_authenticated
  on public.srs_reviews
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================================
-- rls policies: analytics_events
-- ============================================================================
-- anon select: only own rows
create policy analytics_events_select_anon
  on public.analytics_events
  for select
  to anon
  using (auth.uid() = user_id);

-- anon insert: only for own user_id
create policy analytics_events_insert_anon
  on public.analytics_events
  for insert
  to anon
  with check (auth.uid() = user_id);

-- anon update: only own rows, keep user_id aligned
create policy analytics_events_update_anon
  on public.analytics_events
  for update
  to anon
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- anon delete: only own rows
create policy analytics_events_delete_anon
  on public.analytics_events
  for delete
  to anon
  using (auth.uid() = user_id);

-- authenticated select: only own rows
create policy analytics_events_select_authenticated
  on public.analytics_events
  for select
  to authenticated
  using (auth.uid() = user_id);

-- authenticated insert: only for own user_id
create policy analytics_events_insert_authenticated
  on public.analytics_events
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- authenticated update: only own rows, keep user_id aligned
create policy analytics_events_update_authenticated
  on public.analytics_events
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- authenticated delete: only own rows
create policy analytics_events_delete_authenticated
  on public.analytics_events
  for delete
  to authenticated
  using (auth.uid() = user_id);
