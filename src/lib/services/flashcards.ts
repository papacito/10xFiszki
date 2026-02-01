import type { SupabaseClient } from '../../db/supabase.client.ts';
import type { Database } from '../../db/database.types.ts';
import type { FlashcardDto } from '../../types.ts';

type CreateManualFlashcardInput = {
  userId: string;
  front: string;
  back: string;
};

type CreateManualFlashcardResult = {
  data: FlashcardDto | null;
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

  return { data, error: null };
};
