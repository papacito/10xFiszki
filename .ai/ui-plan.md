# UI Architecture for MVP Generator Fiszek z AI (Spaced Repetition)

## 1. UI Structure Overview

The UI is organized around a single core flow: authenticate → generate AI flashcards from notes → explicitly decide per card → begin SRS review. The structure minimizes cognitive load and keeps the user in a linear, decision-focused experience, with supporting views for manual creation and managing existing cards.

Key requirements extracted from PRD:
- Account required for any action; email+password auth.
- Paste notes (max one page) to generate AI flashcard proposals.
- Show each AI card separately with explicit accept/edit/reject.
- Minimal editor for AI cards and manual creation.
- CRUD for flashcards.
- Start SRS sessions using a standard algorithm (SM-2).
- Simple, fast UX; predictable generation.

Main API endpoints (purpose summary):
- Auth: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`.
- Generation: `POST /generation-sessions`, `GET /generation-sessions`, `GET /generation-sessions/{id}`.
- AI proposals: `GET /generation-sessions/{id}/cards`, `GET /generation-cards/{id}`.
- Decisions: `POST /generation-cards/{id}/decision` (accept/edit/reject).
- Flashcards: `POST /flashcards`, `GET /flashcards`, `GET /flashcards/{id}`, `PATCH /flashcards/{id}`, `DELETE /flashcards/{id}`.
- SRS: `GET /srs/cards/due`, `POST /srs/sessions`, `PATCH /srs/sessions/{id}/complete`, `POST /srs/reviews`.
- Analytics: `POST /analytics/events` (client-side events; non-UI-facing).

Compatibility notes:
- Every UI action maps to a REST endpoint above; no UI requirement exceeds API capabilities.
- The accept/edit/reject step is enforced in the UI as the only path from proposals to stored cards, matching the API decision model.

## 2. View List

### 2.1 Auth — Sign up / Log in
- View name: Authentication
- View path: `/auth`
- Main purpose: Gate all actions behind account access.
- Key information to display: Email, password fields, error messages, session status.
- Key view components: Auth form, submit actions, inline validation.
- UX, accessibility, security considerations:
  - Clear error feedback for invalid credentials; no ambiguous failures.
  - Keyboard-only support; proper label/field associations.
  - Rate-limit messaging for repeated failures; no password echo.

### 2.2 Notes Input — Generate Flashcards
- View name: Generate
- View path: `/generate`
- Main purpose: Accept pasted notes and trigger AI generation session.
- Key information to display: Input text area, character count, max limit guidance.
- Key view components: Notes textarea, char counter, “Generate” CTA, helper text.
- UX, accessibility, security considerations:
  - Enforce max length client-side aligned with API limits.
  - Save draft in local state to prevent data loss.
  - Explain that content is sent for AI generation.
- Requirements mapped: “Paste notes to generate proposals” → notes input + CTA.

### 2.3 AI Review — Per-card Decision
- View name: AI Review
- View path: `/generate/{sessionId}/review`
- Main purpose: Present AI proposals one at a time and capture decision.
- Key information to display: Card front/back, position/progress, decision state.
- Key view components: Card display, Accept/Edit/Reject actions, progress indicator.
- UX, accessibility, security considerations:
  - One card at a time to reduce cognitive load.
  - Keyboard shortcuts for decisions, with accessible focus states.
  - Confirmation for reject to prevent accidental loss.
- Requirements mapped: “Show each card separately”, “explicit accept/edit/reject”.

### 2.4 AI Edit — Minimal Editor (Inline/Modal)
- View name: AI Edit
- View path: `/generate/{sessionId}/review/edit`
- Main purpose: Minimal editing of a proposal before saving.
- Key information to display: Editable front/back fields, validation errors.
- Key view components: Minimal editor, Save & Accept CTA, Cancel.
- UX, accessibility, security considerations:
  - Keep context visible (original text reference) without clutter.
  - Enforce required fields; no empty front/back.
  - Prevent double submit; show saving state.
- Requirements mapped: “Minimal editor”, “edit before save”.

### 2.5 Flashcards List — Manage Cards
- View name: My Flashcards
- View path: `/flashcards`
- Main purpose: List, search, and manage stored flashcards.
- Key information to display: Front/back preview, source type, updated date.
- Key view components: List/table, search input, filter (AI/manual), actions.
- UX, accessibility, security considerations:
  - Provide quick scan with truncated previews.
  - Confirm delete; use soft-delete messaging.
  - Pagination for large lists; maintain focus on update.
- Requirements mapped: “List cards”, “Edit/delete cards”.

### 2.6 Flashcard Edit — Manual or Existing
- View name: Flashcard Editor
- View path: `/flashcards/new` and `/flashcards/{id}/edit`
- Main purpose: Manual creation and editing of existing cards.
- Key information to display: Front/back fields, save status.
- Key view components: Minimal editor, Save/Cancel actions.
- UX, accessibility, security considerations:
  - Same editor pattern as AI edit to reduce learning curve.
  - Inline validation, auto-focus first field.
- Requirements mapped: “Manual creation”, “CRUD”.

### 2.7 SRS Session — Review Due Cards
- View name: SRS Session
- View path: `/srs/session`
- Main purpose: Run a review session with due cards and capture ratings.
- Key information to display: Card front/back, rating scale, remaining count.
- Key view components: Card display, reveal answer, rating buttons (0–5).
- UX, accessibility, security considerations:
  - Clear separation between question/answer; explicit reveal.
  - Large, tappable rating buttons; keyboard navigation.
  - Prevent skipping without rating; handle no-due state.
- Requirements mapped: “Start SRS session”, “use standard algorithm”.

### 2.8 SRS Session Summary
- View name: SRS Summary
- View path: `/srs/session/summary`
- Main purpose: Confirm completion and encourage next steps.
- Key information to display: Count reviewed, next due info.
- Key view components: Summary stats, CTA to return to Generate/List.
- UX, accessibility, security considerations:
  - Provide clear session completion message.
  - Avoid cognitive overload; keep metrics minimal.

## 3. User Journey Map

Main use case (happy path):
1. User opens app → redirected to `/auth` if not logged in.
2. User logs in or signs up.
3. User navigates to `/generate` and pastes notes (max one page).
4. User triggers generation; session created.
5. User is taken to `/generate/{sessionId}/review`.
6. For each AI card:
   - Accept → decision recorded; card saved.
   - Edit → minimal editor → save & accept.
   - Reject → decision recorded; card removed from queue.
7. After all decisions, user is prompted to start SRS.
8. User begins `/srs/session`, reviews due cards, and completes session.
9. Summary shown; user can go to `/flashcards` to manage cards or generate more.

Alternate flows:
- User skips AI generation and creates a manual card via `/flashcards/new`.
- User manages existing cards in `/flashcards` without starting SRS.

## 4. Layout and Navigation Structure

Navigation structure:
- Public routes: `/auth`.
- Protected routes: `/generate`, `/generate/{sessionId}/review`, `/flashcards`, `/flashcards/new`, `/flashcards/{id}/edit`, `/srs/session`, `/srs/session/summary`.
- Primary navigation (top bar or side): Generate, Flashcards, SRS.
- Contextual navigation:
  - From Generate → Review.
  - From Review → SRS start prompt.
  - From SRS Summary → Generate or Flashcards.

Navigation principles:
- Keep the core flow linear and action-focused.
- Avoid deep menus; prioritize the main CTA per view.
- Preserve progress and drafts where applicable.

## 5. Key Components

- AuthForm: email/password fields with validation and errors.
- NotesInput: multiline input with character counter and limit feedback.
- FlashcardDisplay: reusable front/back card rendering.
- DecisionControls: Accept/Edit/Reject actions with progress indicator.
- MinimalEditor: shared editor for AI edit and manual create/edit.
- FlashcardsList: list view with search, filter, and actions.
- SrsReviewPanel: question/answer reveal and rating controls.
- SessionProgress: count and progress across generation or SRS sessions.
- ErrorState: consistent handling of API errors and retries.

User stories mapped to UI:
- Account access → Auth view.
- Paste notes → Generate view.
- See each card separately → AI Review.
- Accept/Edit/Reject → DecisionControls + AI Edit.
- Manual creation → Flashcard Editor.
- List/edit/delete → Flashcards List + Edit view.
- Start SRS → SRS Session + Summary.

Requirements mapped to UI elements:
- “Account required” → protected routes + auth gating.
- “Max one page input” → NotesInput limit + inline validation.
- “Explicit decision logged” → DecisionControls with confirmed state.
- “Minimal editor” → MinimalEditor component.
- “SRS with standard algorithm” → SrsReviewPanel rating 0–5 + session flow.

Edge cases and error states:
- Over-limit input: disable Generate, show limit guidance.
- Generation failure: retry CTA and preserve input text.
- Empty AI proposals: show fallback suggestion to create manual cards.
- Decision conflict (already decided): show read-only state and continue.
- No due SRS cards: show friendly empty state and suggest Generate.
- Network/auth expiration: redirect to `/auth` with recovery message.
  - Security: never expose card data when token invalid.

User pain points and UI mitigations:
- Cognitive overload during review → one-card-at-a-time UI with progress.
- Fear of losing control → explicit accept/edit/reject, visible save states.
- Time pressure → minimal steps and quick actions.
