import type { APIRoute } from 'astro';
import { z } from 'zod';

import type {
  CreateFlashcardCommand,
  FlashcardDto,
  FlashcardListResponseDto,
  MessageResponseDto,
} from '../../../types.ts';
import { createFlashcard, listFlashcards } from '../../../lib/services/flashcards.ts';

export const prerender = false;

const createFlashcardSchema = z.object({
  front: z.string().trim().min(1, 'front is required'),
  back: z.string().trim().min(1, 'back is required'),
  source_type: z.enum(['manual', 'ai']).optional(),
});

const emptyToUndefined = (value: unknown) =>
  value === '' || value === null || value === undefined ? undefined : value;

const listFlashcardsSchema = z.object({
  limit: z
    .preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100))
    .default(20),
  cursor: z.preprocess(emptyToUndefined, z.string().datetime()).optional(),
  sort: z.preprocess(emptyToUndefined, z.literal('created_at')).default('created_at'),
  order: z.preprocess(emptyToUndefined, z.enum(['asc', 'desc'])).default('desc'),
  source_type: z.preprocess(emptyToUndefined, z.enum(['ai', 'manual'])).optional(),
  include_deleted: z
    .preprocess((value) => {
      if (value === undefined || value === null || value === '') {
        return undefined;
      }
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return value;
    }, z.boolean())
    .default(false),
  search: z.preprocess(emptyToUndefined, z.string().trim().min(1)).optional(),
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
 * Ensures the request is authenticated and returns the user id.
 */
const requireAuthenticatedUserId = async (context: Parameters<APIRoute>[0]) => {
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

  return authData.user.id;
};

/**
 * GET /flashcards
 * Lists flashcards for the authenticated user.
 */
export const GET: APIRoute = async (context) => {
  const userId = await requireAuthenticatedUserId(context);
  if (userId instanceof Response) {
    return userId;
  }

  const url = new URL(context.request.url);
  const getQueryParam = (key: string) => {
    const value = url.searchParams.get(key);
    return value === null ? undefined : value;
  };
  const parsed = listFlashcardsSchema.safeParse({
    limit: getQueryParam('limit'),
    cursor: getQueryParam('cursor'),
    sort: getQueryParam('sort'),
    order: getQueryParam('order'),
    source_type: getQueryParam('source_type'),
    include_deleted: getQueryParam('include_deleted'),
    search: getQueryParam('search'),
  });

  if (!parsed.success) {
    return jsonResponse(
      {
        message: 'Validation failed.',
        details: parsed.error.issues.map((issue) => issue.message),
      } satisfies ValidationErrorResponse,
      422
    );
  }

  const { data, error } = await listFlashcards(context.locals.supabase, {
    userId,
    limit: parsed.data.limit,
    cursor: parsed.data.cursor,
    order: parsed.data.order,
    sourceType: parsed.data.source_type,
    includeDeleted: parsed.data.include_deleted,
    search: parsed.data.search,
  });

  if (error) {
    return jsonResponse(
      {
        message: 'Failed to load flashcards.',
      } satisfies MessageResponseDto,
      500
    );
  }

  const nextCursor =
    data.length === parsed.data.limit ? data[data.length - 1]?.created_at ?? null : null;

  return jsonResponse(
    {
      data,
      next_cursor: nextCursor,
    } satisfies FlashcardListResponseDto,
    200
  );
};

/**
 * POST /flashcards
 * Creates a manual flashcard for the authenticated user.
 */
export const POST: APIRoute = async (context) => {
  const userId = await requireAuthenticatedUserId(context);
  if (userId instanceof Response) {
    return userId;
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

  const { data, error } = await createFlashcard(context.locals.supabase, {
    userId,
    front: parsed.data.front,
    back: parsed.data.back,
    sourceType: parsed.data.source_type ?? 'manual',
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
