1. List of tables with their columns, data types, and constraints

### `users` (managed by Supabase Auth)
- `id` uuid primary key (auth.users.id)
- `email` text unique (auth.users.email)
- `encrypted_password` text (auth.users.encrypted_password; managed by Supabase Auth)
- `created_at` timestamptz (auth.users.created_at)

### `generation_sessions`
- `id` uuid primary key default gen_random_uuid()
- `user_id` uuid not null references auth.users(id) on delete cascade
- `input_text` text not null
- `input_char_count` integer not null check (input_char_count >= 1)
- `model_provider` text not null
- `model_name` text not null
- `created_at` timestamptz not null default now()

### `generation_cards`
- `id` uuid primary key default gen_random_uuid()
- `session_id` uuid not null references generation_sessions(id) on delete cascade
- `user_id` uuid not null references auth.users(id) on delete cascade
- `front` text not null
- `back` text not null
- `position` integer not null check (position >= 1)
- `created_at` timestamptz not null default now()
- unique constraint on (`session_id`, `position`)

### `flashcards`
- `id` uuid primary key default gen_random_uuid()
- `user_id` uuid not null references auth.users(id) on delete cascade
- `front` text not null
- `back` text not null
- `source_type` text not null check (source_type in ('ai', 'manual'))
- `source_generation_card_id` uuid references generation_cards(id) on delete set null
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()
- `deleted_at` timestamptz

### `flashcard_decisions`
- `id` uuid primary key default gen_random_uuid()
- `generation_card_id` uuid not null references generation_cards(id) on delete cascade
- `user_id` uuid not null references auth.users(id) on delete cascade
- `decision` text not null check (decision in ('accept', 'edit', 'reject'))
- `edited_front` text
- `edited_back` text
- `accepted_flashcard_id` uuid references flashcards(id) on delete set null
- `decided_at` timestamptz not null default now()
- unique constraint on (`generation_card_id`)

### `srs_card_state`
- `flashcard_id` uuid primary key references flashcards(id) on delete cascade
- `user_id` uuid not null references auth.users(id) on delete cascade
- `ease_factor` numeric(4,2) not null default 2.50 check (ease_factor >= 1.30)
- `interval_days` integer not null default 0 check (interval_days >= 0)
- `repetition` integer not null default 0 check (repetition >= 0)
- `due_at` timestamptz not null default now()
- `last_reviewed_at` timestamptz
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

### `srs_sessions`
- `id` uuid primary key default gen_random_uuid()
- `user_id` uuid not null references auth.users(id) on delete cascade
- `started_at` timestamptz not null default now()
- `completed_at` timestamptz

### `srs_reviews`
- `id` uuid primary key default gen_random_uuid()
- `session_id` uuid references srs_sessions(id) on delete set null
- `flashcard_id` uuid not null references flashcards(id) on delete cascade
- `user_id` uuid not null references auth.users(id) on delete cascade
- `rating` integer not null check (rating between 0 and 5)
- `reviewed_at` timestamptz not null default now()
- `interval_days_after` integer not null check (interval_days_after >= 0)
- `ease_factor_after` numeric(4,2) not null check (ease_factor_after >= 1.30)
- `repetition_after` integer not null check (repetition_after >= 0)
- `due_at_after` timestamptz not null

### `analytics_events`
- `id` uuid primary key default gen_random_uuid()
- `user_id` uuid not null references auth.users(id) on delete cascade
- `event_type` text not null check (event_type in (
  'generate', 'accept', 'edit', 'reject', 'create_manual', 'start_srs', 'complete_srs'
))
- `generation_session_id` uuid references generation_sessions(id) on delete set null
- `generation_card_id` uuid references generation_cards(id) on delete set null
- `flashcard_id` uuid references flashcards(id) on delete set null
- `srs_session_id` uuid references srs_sessions(id) on delete set null
- `created_at` timestamptz not null default now()

2. Relationships between tables

- auth.users 1—* generation_sessions
- generation_sessions 1—* generation_cards
- auth.users 1—* generation_cards
- generation_cards 1—0..1 flashcard_decisions
- flashcard_decisions 0..1—1 flashcards (via accepted_flashcard_id)
- auth.users 1—* flashcards
- flashcards 1—1 srs_card_state
- auth.users 1—* srs_card_state
- auth.users 1—* srs_sessions
- srs_sessions 1—* srs_reviews
- flashcards 1—* srs_reviews
- auth.users 1—* srs_reviews
- auth.users 1—* analytics_events

3. Indexes

- `generation_sessions`: index on (`user_id`, `created_at` desc)
- `generation_cards`: index on (`user_id`, `created_at` desc)
- `flashcards`: index on (`user_id`, `created_at` desc)
- `flashcards`: index on (`user_id`, `deleted_at`) where deleted_at is null
- `flashcard_decisions`: index on (`user_id`, `decided_at` desc)
- `srs_card_state`: index on (`user_id`, `due_at`)
- `srs_sessions`: index on (`user_id`, `started_at` desc)
- `srs_reviews`: index on (`user_id`, `reviewed_at` desc)
- `analytics_events`: index on (`user_id`, `created_at` desc)
- `analytics_events`: index on (`event_type`, `created_at` desc)

4. PostgreSQL policies (if applicable)

Enable RLS on all application tables listed above. For each table:

- Select: `auth.uid() = user_id`
- Insert: `auth.uid() = user_id`
- Update: `auth.uid() = user_id`
- Delete: `auth.uid() = user_id`

Notes:
- `flashcard_decisions.accepted_flashcard_id` should only be set when decision in ('accept', 'edit').
- `generation_cards.user_id` is stored redundantly to simplify RLS and auditing.

5. Additional notes or explanations about design decisions

- Users are stored in Supabase Auth (`auth.users`) and referenced as `users` in this plan for clarity.
- `generation_cards` stores AI proposals to preserve the full accept/edit/reject audit trail.
- `flashcards` is the canonical card table used by SRS, regardless of AI or manual origin.
- `srs_card_state` stores the current SM-2 state for each card; `srs_reviews` stores immutable history.
- `analytics_events` supports MVP metrics without introducing a full analytics pipeline.
- Input size is tracked as `input_char_count`; hard limits can be enforced at the API layer if desired.
