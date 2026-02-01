import type { APIRoute } from "astro";
import { z } from "zod";

import type {
  FlashcardDto,
  FlashcardUpdateResponseDto,
  MessageResponseDto,
} from "../../../types";

export const prerender = false;

const idSchema = z.string().uuid();
const updateSchema = z.object({
  front: z.string().trim().min(1, "front is required"),
  back: z.string().trim().min(1, "back is required"),
});

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

/**
 * Extracts a Bearer token from the Authorization header.
 */
const getBearerToken = (authorizationHeader: string | null): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
};

/**
 * Ensures the request is authenticated and returns the user id.
 */
const requireAuthenticatedUserId = async (context: Parameters<APIRoute>[0]) => {
  const token = getBearerToken(context.request.headers.get("Authorization"));
  if (!token) {
    return jsonResponse(
      {
        message: "Missing or invalid Authorization header.",
      } satisfies MessageResponseDto,
      401
    );
  }

  const { data: authData, error: authError } =
    await context.locals.supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return jsonResponse(
      {
        message: "Unauthorized.",
      } satisfies MessageResponseDto,
      401
    );
  }

  return authData.user.id;
};

/**
 * DELETE /flashcards/:id
 * Soft deletes a flashcard for the authenticated user.
 */
export const DELETE: APIRoute = async (context) => {
  const userId = await requireAuthenticatedUserId(context);
  if (userId instanceof Response) {
    return userId;
  }

  const cardId = context.params.id;
  const parsedId = idSchema.safeParse(cardId);
  if (!parsedId.success) {
    return jsonResponse(
      {
        message: "Invalid flashcard id.",
      } satisfies MessageResponseDto,
      422
    );
  }

  const { data, error } = await context.locals.supabase
    .from("flashcards")
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("id", parsedId.data)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return jsonResponse(
      {
        message: "Failed to delete flashcard.",
      } satisfies MessageResponseDto,
      500
    );
  }

  if (!data) {
    return jsonResponse(
      {
        message: "Flashcard not found.",
      } satisfies MessageResponseDto,
      404
    );
  }

  return jsonResponse(
    {
      message: "Deleted.",
    } satisfies MessageResponseDto,
    200
  );
};

/**
 * GET /flashcards/:id
 * Gets a single flashcard for the authenticated user.
 */
export const GET: APIRoute = async (context) => {
  const userId = await requireAuthenticatedUserId(context);
  if (userId instanceof Response) {
    return userId;
  }

  const cardId = context.params.id;
  const parsedId = idSchema.safeParse(cardId);
  if (!parsedId.success) {
    return jsonResponse(
      {
        message: "Invalid flashcard id.",
      } satisfies MessageResponseDto,
      422
    );
  }

  const { data, error } = await context.locals.supabase
    .from("flashcards")
    .select("id, front, back, source_type, created_at, updated_at, deleted_at")
    .eq("id", parsedId.data)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return jsonResponse(
      {
        message: "Failed to load flashcard.",
      } satisfies MessageResponseDto,
      500
    );
  }

  if (!data) {
    return jsonResponse(
      {
        message: "Flashcard not found.",
      } satisfies MessageResponseDto,
      404
    );
  }

  return jsonResponse(
    {
      ...data,
      source_type: data.source_type === "ai" ? "ai" : "manual",
    } satisfies FlashcardDto,
    200
  );
};

/**
 * PATCH /flashcards/:id
 * Updates a flashcard for the authenticated user.
 */
export const PATCH: APIRoute = async (context) => {
  const userId = await requireAuthenticatedUserId(context);
  if (userId instanceof Response) {
    return userId;
  }

  const cardId = context.params.id;
  const parsedId = idSchema.safeParse(cardId);
  if (!parsedId.success) {
    return jsonResponse(
      {
        message: "Invalid flashcard id.",
      } satisfies MessageResponseDto,
      422
    );
  }

  let payload: unknown;
  try {
    payload = await context.request.json();
  } catch {
    return jsonResponse(
      {
        message: "Invalid JSON payload.",
      } satisfies MessageResponseDto,
      400
    );
  }

  const parsed = updateSchema.safeParse(payload);
  if (!parsed.success) {
    return jsonResponse(
      {
        message: "Validation failed.",
        details: parsed.error.issues.map((issue) => issue.message),
      },
      422
    );
  }

  const { data, error } = await context.locals.supabase
    .from("flashcards")
    .update({
      front: parsed.data.front,
      back: parsed.data.back,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsedId.data)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .select("id, front, back, updated_at")
    .maybeSingle();

  if (error) {
    return jsonResponse(
      {
        message: "Failed to update flashcard.",
      } satisfies MessageResponseDto,
      500
    );
  }

  if (!data) {
    return jsonResponse(
      {
        message: "Flashcard not found.",
      } satisfies MessageResponseDto,
      404
    );
  }

  return jsonResponse(data satisfies FlashcardUpdateResponseDto, 200);
};
