import type { APIRoute } from "astro";
import { z } from "zod";

import type { MessageResponseDto } from "../../../types";

export const prerender = false;

const idSchema = z.string().uuid();

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
