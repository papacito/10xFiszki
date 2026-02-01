import type { SupabaseClient } from '../../db/supabase.client.ts';
import type { Database } from '../../db/database.types.ts';
import type { FlashcardDto, FlashcardSourceType } from '../../types.ts';

type CreateManualFlashcardInput = {
  userId: string;
  front: string;
  back: string;
};

type CreateManualFlashcardResult = {
  data: FlashcardDto | null;
  error: Error | null;
};

type ListFlashcardsInput = {
  userId: string;
  limit: number;
  cursor?: string;
  order: 'asc' | 'desc';
  sourceType?: FlashcardSourceType;
  includeDeleted: boolean;
  search?: string;
};

type ListFlashcardsResult = {
  data: FlashcardDto[];
  error: Error | null;
};

/**
 * Creates a manual flashcard for the authenticated user.
 */
export const createManualFlashcard = async (
  supabase: SupabaseClient<Database>,
  input: CreateManualFlashcardInput
): Promise<CreateManualFlashcardResult> => {
  const { data, error } = await supabase
    .from('flashcards')
    .insert({
      user_id: input.userId,
      front: input.front,
      back: input.back,
      source_type: 'manual',
    })
    .select('id, front, back, source_type, created_at, updated_at, deleted_at')
    .single();

  if (error) {
    return { data: null, error };
  }

  const normalized = data
    ? {
        ...data,
        source_type: data.source_type as FlashcardSourceType,
      }
    : null;

  return { data: normalized, error: null };
};

/**
 * Lists flashcards for the authenticated user with filtering and pagination.
 */
export const listFlashcards = async (
  supabase: SupabaseClient<Database>,
  input: ListFlashcardsInput
): Promise<ListFlashcardsResult> => {
  let query = supabase
    .from('flashcards')
    .select('id, front, back, source_type, created_at, updated_at, deleted_at')
    .eq('user_id', input.userId)
    .order('created_at', { ascending: input.order === 'asc' })
    .order('id', { ascending: input.order === 'asc' })
    .limit(input.limit);

  if (!input.includeDeleted) {
    query = query.is('deleted_at', null);
  }

  if (input.sourceType) {
    query = query.eq('source_type', input.sourceType);
  }

  if (input.search) {
    const escaped = input.search.replace(/[%_]/g, (match) => `\\${match}`);
    query = query.or(`front.ilike.%${escaped}%,back.ilike.%${escaped}%`);
  }

  if (input.cursor) {
    query =
      input.order === 'desc'
        ? query.lt('created_at', input.cursor)
        : query.gt('created_at', input.cursor);
  }

  const { data, error } = await query;

  if (error) {
    return { data: [], error };
  }

  const normalized = (data ?? []).map((item) => ({
    ...item,
    source_type: item.source_type as FlashcardSourceType,
  }));

  return { data: normalized, error: null };
};
