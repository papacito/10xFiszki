import type { APIRoute } from "astro";
import { z } from "zod";

import type {
  MessageResponseDto,
  SignupCommand,
  SignupResponseDto,
} from "../../types";

export const prerender = false;

const signupSchema = z.object({
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

const parseJsonBody = async (request: Request): Promise<SignupCommand | Response> => {
  try {
    return (await request.json()) as SignupCommand;
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
 * POST /auth/signup
 * Creates a new user account via Supabase Auth.
 */
export const POST: APIRoute = async (context) => {
  const body = await parseJsonBody(context.request);
  if (body instanceof Response) {
    return body;
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      {
        message: "Validation failed.",
        details: parsed.error.issues.map((issue) => issue.message),
      },
      422
    );
  }

  const { data, error } = await context.locals.supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user || !data.session) {
    return jsonResponse(
      {
        message:
          error?.message ??
          "Unable to sign up. Check email confirmation settings and try again.",
      } satisfies MessageResponseDto,
      400
    );
  }

  return jsonResponse(
    {
      user: {
        id: data.user.id,
        email: data.user.email ?? parsed.data.email,
        created_at: data.user.created_at ?? new Date().toISOString(),
      },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    } satisfies SignupResponseDto,
    201
  );
};
