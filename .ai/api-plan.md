# REST API Plan

## 1. Resources
- Users (Supabase Auth `auth.users`)
- Generation Sessions (`generation_sessions`)
- Generation Cards (`generation_cards`)
- Flashcards (`flashcards`)
- Flashcard Decisions (`flashcard_decisions`)
- SRS Card State (`srs_card_state`)
- SRS Sessions (`srs_sessions`)
- SRS Reviews (`srs_reviews`)
- Analytics Events (`analytics_events`)

## 2. Endpoints

### Auth (Supabase Auth)
- **POST** `/auth/signup`
  - Description: Create user account (email + password).
  - Request: `{ "email": "string", "password": "string" }`
  - Response: `{ "user": { "id": "uuid", "email": "string", "created_at": "timestamptz" }, "access_token": "string", "refresh_token": "string" }`
  - Success: `201 Created`
  - Errors: `400 Bad Request`, `409 Conflict`, `422 Unprocessable Entity`
- **POST** `/auth/login`
  - Description: Login and get access token.
  - Request: `{ "email": "string", "password": "string" }`
  - Response: `{ "access_token": "string", "refresh_token": "string", "user": { "id": "uuid", "email": "string" } }`
  - Success: `200 OK`
  - Errors: `401 Unauthorized`, `422 Unprocessable Entity`
- **POST** `/auth/logout`
  - Description: Revoke refresh token.
  - Request: `{ "refresh_token": "string" }`
  - Response: `{ "message": "Logged out" }`
  - Success: `200 OK`

### Generation Sessions
- **POST** `/generation-sessions`
  - Description: Create a generation session and trigger AI proposal generation.
  - Request: `{ "input_text": "string", "model_provider": "string", "model_name": "string" }`
  - Response: `{ "id": "uuid", "user_id": "uuid", "input_text": "string", "input_char_count": 123, "model_provider": "string", "model_name": "string", "created_at": "timestamptz" }`
  - Success: `201 Created`
  - Errors: `400 Bad Request`, `401 Unauthorized`, `422 Unprocessable Entity`
- **GET** `/generation-sessions`
  - Description: List user’s generation sessions.
  - Query: `limit`, `cursor`, `sort=created_at`, `order=desc`
  - Response: `{ "data": [ { "id": "uuid", "created_at": "timestamptz", "input_char_count": 123, "model_provider": "string", "model_name": "string" } ], "next_cursor": "string|null" }`
  - Success: `200 OK`
- **GET** `/generation-sessions/{id}`
  - Description: Get a single generation session.
  - Response: `{ "id": "uuid", "input_text": "string", "input_char_count": 123, "model_provider": "string", "model_name": "string", "created_at": "timestamptz" }`
  - Success: `200 OK`
  - Errors: `404 Not Found`

### Generation Cards
- **GET** `/generation-sessions/{id}/cards`
  - Description: List AI-generated card proposals for a session.
  - Query: `limit`, `cursor`, `sort=position`, `order=asc`
  - Response: `{ "data": [ { "id": "uuid", "session_id": "uuid", "front": "string", "back": "string", "position": 1, "created_at": "timestamptz" } ], "next_cursor": "string|null" }`
  - Success: `200 OK`
- **GET** `/generation-cards/{id}`
  - Description: Get a single AI-generated card proposal.
  - Response: `{ "id": "uuid", "session_id": "uuid", "front": "string", "back": "string", "position": 1, "created_at": "timestamptz" }`
  - Success: `200 OK`
  - Errors: `404 Not Found`

### Flashcard Decisions (accept/edit/reject)
- **POST** `/generation-cards/{id}/decision`
  - Description: Record decision for a generated card.
  - Request:
    - Accept: `{ "decision": "accept" }`
    - Edit: `{ "decision": "edit", "edited_front": "string", "edited_back": "string" }`
    - Reject: `{ "decision": "reject" }`
  - Response: `{ "id": "uuid", "generation_card_id": "uuid", "decision": "accept|edit|reject", "edited_front": "string|null", "edited_back": "string|null", "accepted_flashcard_id": "uuid|null", "decided_at": "timestamptz" }`
  - Success: `201 Created`
  - Errors: `400 Bad Request`, `409 Conflict`, `422 Unprocessable Entity`

### Flashcards
- **POST** `/flashcards`
  - Description: Create a manual flashcard.
  - Request: `{ "front": "string", "back": "string" }`
  - Response: `{ "id": "uuid", "front": "string", "back": "string", "source_type": "manual", "created_at": "timestamptz", "updated_at": "timestamptz" }`
  - Success: `201 Created`
  - Errors: `400 Bad Request`, `401 Unauthorized`, `422 Unprocessable Entity`
- **GET** `/flashcards`
  - Description: List flashcards (excluding soft-deleted by default).
  - Query: `limit`, `cursor`, `sort=created_at`, `order=desc`, `source_type=ai|manual`, `include_deleted=false|true`, `search=string`
  - Response: `{ "data": [ { "id": "uuid", "front": "string", "back": "string", "source_type": "ai|manual", "created_at": "timestamptz", "updated_at": "timestamptz", "deleted_at": "timestamptz|null" } ], "next_cursor": "string|null" }`
  - Success: `200 OK`
- **GET** `/flashcards/{id}`
  - Description: Get a single flashcard.
  - Response: `{ "id": "uuid", "front": "string", "back": "string", "source_type": "ai|manual", "created_at": "timestamptz", "updated_at": "timestamptz", "deleted_at": "timestamptz|null" }`
  - Success: `200 OK`
  - Errors: `404 Not Found`
- **PATCH** `/flashcards/{id}`
  - Description: Update a flashcard (front/back).
  - Request: `{ "front": "string", "back": "string" }`
  - Response: `{ "id": "uuid", "front": "string", "back": "string", "updated_at": "timestamptz" }`
  - Success: `200 OK`
  - Errors: `400 Bad Request`, `404 Not Found`, `422 Unprocessable Entity`
- **DELETE** `/flashcards/{id}`
  - Description: Soft delete a flashcard.
  - Response: `{ "message": "Deleted" }`
  - Success: `200 OK`
  - Errors: `404 Not Found`

### SRS Card State
- **GET** `/srs/cards/due`
  - Description: List due cards for review.
  - Query: `limit`, `cursor`, `due_before` (default now), `sort=due_at`, `order=asc`
  - Response: `{ "data": [ { "flashcard_id": "uuid", "due_at": "timestamptz", "ease_factor": 2.5, "interval_days": 0, "repetition": 0 } ], "next_cursor": "string|null" }`
  - Success: `200 OK`
- **GET** `/srs/card-states/{flashcard_id}`
  - Description: Get SRS state for a flashcard.
  - Response: `{ "flashcard_id": "uuid", "ease_factor": 2.5, "interval_days": 0, "repetition": 0, "due_at": "timestamptz", "last_reviewed_at": "timestamptz|null" }`
  - Success: `200 OK`
  - Errors: `404 Not Found`

### SRS Sessions
- **POST** `/srs/sessions`
  - Description: Start an SRS session.
  - Request: `{ "initial_due_before": "timestamptz|null" }`
  - Response: `{ "id": "uuid", "started_at": "timestamptz" }`
  - Success: `201 Created`
  - Errors: `401 Unauthorized`
- **PATCH** `/srs/sessions/{id}/complete`
  - Description: Complete an SRS session.
  - Response: `{ "id": "uuid", "completed_at": "timestamptz" }`
  - Success: `200 OK`
- **GET** `/srs/sessions`
  - Description: List SRS sessions.
  - Query: `limit`, `cursor`, `sort=started_at`, `order=desc`
  - Response: `{ "data": [ { "id": "uuid", "started_at": "timestamptz", "completed_at": "timestamptz|null" } ], "next_cursor": "string|null" }`
  - Success: `200 OK`

### SRS Reviews
- **POST** `/srs/reviews`
  - Description: Submit a review rating and update SRS state (SM-2).
  - Request: `{ "session_id": "uuid|null", "flashcard_id": "uuid", "rating": 0, "reviewed_at": "timestamptz|null" }`
  - Response: `{ "id": "uuid", "flashcard_id": "uuid", "rating": 0, "reviewed_at": "timestamptz", "interval_days_after": 0, "ease_factor_after": 2.5, "repetition_after": 0, "due_at_after": "timestamptz" }`
  - Success: `201 Created`
  - Errors: `400 Bad Request`, `404 Not Found`, `422 Unprocessable Entity`
- **GET** `/srs/reviews`
  - Description: List SRS reviews.
  - Query: `limit`, `cursor`, `sort=reviewed_at`, `order=desc`, `flashcard_id=uuid`, `session_id=uuid`
  - Response: `{ "data": [ { "id": "uuid", "flashcard_id": "uuid", "rating": 0, "reviewed_at": "timestamptz" } ], "next_cursor": "string|null" }`
  - Success: `200 OK`

### Analytics Events
- **POST** `/analytics/events`
  - Description: Record a product analytics event.
  - Request: `{ "event_type": "generate|accept|edit|reject|create_manual|start_srs|complete_srs", "generation_session_id": "uuid|null", "generation_card_id": "uuid|null", "flashcard_id": "uuid|null", "srs_session_id": "uuid|null" }`
  - Response: `{ "id": "uuid", "event_type": "string", "created_at": "timestamptz" }`
  - Success: `201 Created`
  - Errors: `400 Bad Request`, `422 Unprocessable Entity`
- **GET** `/analytics/events`
  - Description: List analytics events (admin/internal only).
  - Query: `limit`, `cursor`, `sort=created_at`, `order=desc`, `event_type=string`
  - Response: `{ "data": [ { "id": "uuid", "event_type": "string", "created_at": "timestamptz" } ], "next_cursor": "string|null" }`
  - Success: `200 OK`
  - Errors: `403 Forbidden`

## 3. Authentication and Authorization
- Use Supabase Auth (JWT) for all endpoints except signup/login.
- Require `Authorization: Bearer <access_token>` for all protected routes.
- Enforce RLS on all application tables with `auth.uid() = user_id`.
- Rate limiting: basic per-user limits for generation requests and analytics event ingestion.
- Soft deletes: default queries exclude `flashcards.deleted_at IS NOT NULL`.

## 4. Validation and Business Logic
- **Generation Sessions**
  - `input_text` required; enforce max ~1 page (assumption: 3,000–5,000 chars).
  - `input_char_count >= 1` (from schema).
  - `model_provider`, `model_name` required.
- **Generation Cards**
  - `front`, `back` required.
  - `position >= 1` and unique per `session_id`.
- **Flashcards**
  - `front`, `back` required.
  - `source_type` in `ai|manual`.
  - `deleted_at` set on DELETE (soft delete).
- **Flashcard Decisions**
  - `decision` in `accept|edit|reject`.
  - `edited_front`, `edited_back` required when decision is `edit`.
  - `accepted_flashcard_id` only set when decision is `accept` or `edit`.
  - One decision per `generation_card_id`.
- **SRS Card State**
  - `ease_factor >= 1.30`, `interval_days >= 0`, `repetition >= 0`.
  - `due_at` required.
- **SRS Reviews**
  - `rating` integer 0–5.
  - `interval_days_after >= 0`, `ease_factor_after >= 1.30`, `repetition_after >= 0`.
  - `due_at_after` required.
- **Analytics Events**
  - `event_type` in `generate|accept|edit|reject|create_manual|start_srs|complete_srs`.

- **Business logic mapping**
  - AI generation flow: create `generation_sessions` then populate `generation_cards`.
  - Decision flow: POST decision creates `flashcard_decisions`; if `accept`/`edit`, create `flashcards` and link `accepted_flashcard_id`.
  - Manual creation: POST `/flashcards` with `source_type = manual`.
  - SRS: POST review updates `srs_card_state` using SM-2; responses return computed fields.
  - Analytics: client or server emits events for KPI tracking.

Assumptions:
- The API will use REST endpoints backed by Supabase edge functions or a server layer using the Supabase SDK.
- Input “one page” limit will be enforced by a character cap in the API.
