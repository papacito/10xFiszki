import type { APIRoute } from 'astro';
import { z } from 'zod';

import type { CreateFlashcardCommand, FlashcardDto, MessageResponseDto } from '../../../types.ts';
import { createManualFlashcard } from '../../../lib/services/flashcards.ts';

export const prerender = false;

const createFlashcardSchema = z.object({
  front: z.string().trim().min(1, 'front is required'),
  back: z.string().trim().min(1, 'back is required'),
});

type ValidationErrorResponse = MessageResponseDto & {
  details: string[];
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

/**
 * Parses a JSON request body and returns a typed payload or an error response.
 */
const parseJsonBody = async (request: Request): Promise<CreateFlashcardCommand | Response> => {
  try {
    return (await request.json()) as CreateFlashcardCommand;
  } catch {
    return jsonResponse(
      {
        message: 'Invalid JSON payload.',
      } satisfies MessageResponseDto,
      400
    );
  }
};

/**
 * Extracts a Bearer token from the Authorization header.
 */
const getBearerToken = (authorizationHeader: string | null): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
};

/**
 * POST /flashcards
 * Creates a manual flashcard for the authenticated user.
 */
export const POST: APIRoute = async (context) => {
  const token = getBearerToken(context.request.headers.get('Authorization'));
  if (!token) {
    return jsonResponse(
      {
        message: 'Missing or invalid Authorization header.',
      } satisfies MessageResponseDto,
      401
    );
  }

  const { data: authData, error: authError } =
    await context.locals.supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return jsonResponse(
      {
        message: 'Unauthorized.',
      } satisfies MessageResponseDto,
      401
    );
  }

  const body = await parseJsonBody(context.request);
  if (body instanceof Response) {
    return body;
  }

  const parsed = createFlashcardSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      {
        message: 'Validation failed.',
        details: parsed.error.issues.map((issue) => issue.message),
      } satisfies ValidationErrorResponse,
      422
    );
  }

  const { data, error } = await createManualFlashcard(context.locals.supabase, {
    userId: authData.user.id,
    front: parsed.data.front,
    back: parsed.data.back,
  });

  if (error || !data) {
    return jsonResponse(
      {
        message: 'Failed to create flashcard.',
      } satisfies MessageResponseDto,
      500
    );
  }

  return jsonResponse(data satisfies FlashcardDto, 201);
};
