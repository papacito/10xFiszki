import type { APIRoute } from "astro";
import { z } from "zod";

import type { LoginCommand, LoginResponseDto, MessageResponseDto } from "../../types";

export const prerender = false;

const loginSchema = z.object({
  email: z.string().trim().email("email must be valid"),
  password: z.string().min(6, "password must be at least 6 characters"),
});

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const parseJsonBody = async (request: Request): Promise<LoginCommand | Response> => {
  try {
    return (await request.json()) as LoginCommand;
  } catch {
    return jsonResponse(
      {
        message: "Invalid JSON payload.",
      } satisfies MessageResponseDto,
      400
    );
  }
};

/**
 * POST /auth/login
 * Logs a user in via Supabase Auth.
 */
export const POST: APIRoute = async (context) => {
  const body = await parseJsonBody(context.request);
  if (body instanceof Response) {
    return body;
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      {
        message: "Validation failed.",
        details: parsed.error.issues.map((issue) => issue.message),
      },
      422
    );
  }

  const { data, error } = await context.locals.supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.session || !data.user) {
    return jsonResponse(
      {
        message: "Invalid email or password.",
      } satisfies MessageResponseDto,
      401
    );
  }

  return jsonResponse(
    {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: {
        id: data.user.id,
        email: data.user.email ?? parsed.data.email,
      },
    } satisfies LoginResponseDto,
    200
  );
};
