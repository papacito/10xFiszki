import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

type CursorPage<T> = {
  data: T[];
  next_cursor: string | null;
};

// Supabase Auth `auth.users` is not included in generated public schema types.
// This is the minimal shape used by API responses.
export type AuthUserDto = {
  id: string;
  email: string;
  created_at: string;
};

export type SignupCommand = {
  email: string;
  password: string;
};

export type SignupResponseDto = {
  user: AuthUserDto;
  access_token: string;
  refresh_token: string;
};

export type LoginCommand = {
  email: string;
  password: string;
};

export type LoginResponseDto = {
  access_token: string;
  refresh_token: string;
  user: Pick<AuthUserDto, "id" | "email">;
};

export type LogoutCommand = {
  refresh_token: string;
};

export type MessageResponseDto = {
  message: string;
};

type GenerationSessionEntity = Tables<"generation_sessions">;
type GenerationSessionInsert = TablesInsert<"generation_sessions">;

export type CreateGenerationSessionCommand = Pick<
  GenerationSessionInsert,
  "input_text" | "model_provider" | "model_name"
>;

export type GenerationSessionDto = Pick<
  GenerationSessionEntity,
  | "id"
  | "user_id"
  | "input_text"
  | "input_char_count"
  | "model_provider"
  | "model_name"
  | "created_at"
>;

export type GenerationSessionListItemDto = Pick<
  GenerationSessionEntity,
  "id" | "created_at" | "input_char_count" | "model_provider" | "model_name"
>;

export type GenerationSessionListResponseDto =
  CursorPage<GenerationSessionListItemDto>;

export type GenerationSessionDetailDto = Pick<
  GenerationSessionEntity,
  | "id"
  | "input_text"
  | "input_char_count"
  | "model_provider"
  | "model_name"
  | "created_at"
>;

type GenerationCardEntity = Tables<"generation_cards">;

export type GenerationCardDto = Pick<
  GenerationCardEntity,
  "id" | "session_id" | "front" | "back" | "position" | "created_at"
>;

export type GenerationCardListResponseDto = CursorPage<GenerationCardDto>;

type FlashcardDecisionEntity = Tables<"flashcard_decisions">;
type FlashcardDecisionInsert = TablesInsert<"flashcard_decisions">;

type FlashcardDecisionEditFields = Pick<
  FlashcardDecisionInsert,
  "edited_front" | "edited_back"
>;

export type FlashcardDecisionCommand =
  | {
      decision: "accept" | "reject";
    }
  | ({
      decision: "edit";
    } & {
      edited_front: NonNullable<FlashcardDecisionEditFields["edited_front"]>;
      edited_back: NonNullable<FlashcardDecisionEditFields["edited_back"]>;
    });

export type FlashcardDecisionDto = Pick<
  FlashcardDecisionEntity,
  | "id"
  | "generation_card_id"
  | "decision"
  | "edited_front"
  | "edited_back"
  | "accepted_flashcard_id"
  | "decided_at"
>;

type FlashcardEntity = Tables<"flashcards">;
type FlashcardInsert = TablesInsert<"flashcards">;
type FlashcardUpdate = TablesUpdate<"flashcards">;

export type FlashcardSourceType = "ai" | "manual";

export type CreateFlashcardCommand = Pick<FlashcardInsert, "front" | "back">;

export type UpdateFlashcardCommand = Pick<FlashcardUpdate, "front" | "back">;

export type FlashcardDto = Omit<
  Pick<
    FlashcardEntity,
    | "id"
    | "front"
    | "back"
    | "source_type"
    | "created_at"
    | "updated_at"
    | "deleted_at"
  >,
  "source_type"
> & {
  source_type: FlashcardSourceType;
};

export type FlashcardListResponseDto = CursorPage<FlashcardDto>;

export type FlashcardUpdateResponseDto = Pick<
  FlashcardEntity,
  "id" | "front" | "back" | "updated_at"
>;

type SrsCardStateEntity = Tables<"srs_card_state">;

export type SrsDueCardDto = Pick<
  SrsCardStateEntity,
  "flashcard_id" | "due_at" | "ease_factor" | "interval_days" | "repetition"
>;

export type SrsDueCardsResponseDto = CursorPage<SrsDueCardDto>;

export type SrsCardStateDto = Pick<
  SrsCardStateEntity,
  | "flashcard_id"
  | "ease_factor"
  | "interval_days"
  | "repetition"
  | "due_at"
  | "last_reviewed_at"
>;

type SrsSessionEntity = Tables<"srs_sessions">;

export type StartSrsSessionCommand = {
  initial_due_before: string | null;
};

export type SrsSessionDto = Pick<
  SrsSessionEntity,
  "id" | "started_at" | "completed_at"
>;

export type StartSrsSessionResponseDto = Pick<
  SrsSessionEntity,
  "id" | "started_at"
>;

export type CompleteSrsSessionResponseDto = Pick<
  SrsSessionEntity,
  "id" | "completed_at"
>;

export type SrsSessionListResponseDto = CursorPage<SrsSessionDto>;

type SrsReviewEntity = Tables<"srs_reviews">;
type SrsReviewInsert = TablesInsert<"srs_reviews">;

export type SrsRating = 0 | 1 | 2 | 3 | 4 | 5;

export type CreateSrsReviewCommand = Omit<
  Pick<SrsReviewInsert, "session_id" | "flashcard_id" | "rating">,
  "rating"
> & {
  rating: SrsRating;
  reviewed_at: string | null;
};

export type SrsReviewDto = Omit<
  Pick<
    SrsReviewEntity,
    | "id"
    | "flashcard_id"
    | "rating"
    | "reviewed_at"
    | "interval_days_after"
    | "ease_factor_after"
    | "repetition_after"
    | "due_at_after"
  >,
  "rating"
> & {
  rating: SrsRating;
};

export type SrsReviewListItemDto = Omit<
  Pick<SrsReviewEntity, "id" | "flashcard_id" | "rating" | "reviewed_at">,
  "rating"
> & {
  rating: SrsRating;
};

export type SrsReviewListResponseDto = CursorPage<SrsReviewListItemDto>;

type AnalyticsEventEntity = Tables<"analytics_events">;
type AnalyticsEventInsert = TablesInsert<"analytics_events">;

export type AnalyticsEventType =
  | "generate"
  | "accept"
  | "edit"
  | "reject"
  | "create_manual"
  | "start_srs"
  | "complete_srs";

export type CreateAnalyticsEventCommand = Omit<
  Pick<
    AnalyticsEventInsert,
    | "event_type"
    | "generation_session_id"
    | "generation_card_id"
    | "flashcard_id"
    | "srs_session_id"
  >,
  "event_type"
> & {
  event_type: AnalyticsEventType;
};

export type AnalyticsEventDto = Omit<
  Pick<AnalyticsEventEntity, "id" | "event_type" | "created_at">,
  "event_type"
> & {
  event_type: AnalyticsEventType;
};

export type AnalyticsEventListResponseDto = CursorPage<AnalyticsEventDto>;
