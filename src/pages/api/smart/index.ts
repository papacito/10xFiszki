import type { APIRoute } from "astro";
import { z } from "zod";

import type {
  MessageResponseDto,
  OpenRouterChatErrorResponseDto,
  OpenRouterChatRequestDto,
  OpenRouterChatResponseDto,
} from "../../../types.ts";
import { OpenRouterError, OpenRouterService } from "../../../lib/services/openrouter.ts";

export const prerender = false;

const MAX_MESSAGE_LENGTH = 5000;
const MAX_TOTAL_MESSAGE_LENGTH = 8000;
const MAX_MESSAGES = 32;

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().trim().min(1, "message content is required").max(MAX_MESSAGE_LENGTH),
  name: z.string().trim().min(1).max(64).optional(),
});

const chatSchema = z.object({
  model: z.string().trim().min(1, "model is required").max(100),
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(2048).optional(),
  top_p: z.number().min(0).max(1).optional(),
});

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

const parseJsonBody = async (request: Request): Promise<OpenRouterChatRequestDto | Response> => {
  try {
    return (await request.json()) as OpenRouterChatRequestDto;
  } catch {
    return jsonResponse(
      {
        message: "Invalid JSON payload.",
      } satisfies MessageResponseDto,
      400
    );
  }
};

const validateTotalContentLength = (messages: OpenRouterChatRequestDto["messages"]) => {
  const totalLength = messages.reduce((sum, message) => sum + message.content.length, 0);
  if (totalLength > MAX_TOTAL_MESSAGE_LENGTH) {
    return jsonResponse(
      {
        message: "Total message content is too large.",
        details: `Maximum total characters allowed is ${MAX_TOTAL_MESSAGE_LENGTH}.`,
      } satisfies OpenRouterChatErrorResponseDto,
      422
    );
  }

  return null;
};

/**
 * POST /api/smart
 * Proxies chat completion requests to OpenRouter.
 */
export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return jsonResponse(
      {
        message: "OpenRouter API key is not configured.",
      } satisfies MessageResponseDto,
      500
    );
  }

  const body = await parseJsonBody(request);
  if (body instanceof Response) {
    return body;
  }

  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      {
        message: "Validation failed.",
        details: parsed.error.issues.map((issue) => issue.message),
      } satisfies OpenRouterChatErrorResponseDto,
      422
    );
  }

  const totalLengthError = validateTotalContentLength(parsed.data.messages);
  if (totalLengthError) {
    return totalLengthError;
  }

  const service = new OpenRouterService({ apiKey });

  try {
    const data = await service.createChatCompletion(parsed.data);
    return jsonResponse(data satisfies OpenRouterChatResponseDto, 200);
  } catch (error) {
    if (error instanceof OpenRouterError) {
      return jsonResponse(
        {
          message: error.message,
          status: error.status,
          code: error.code,
          details: error.details,
        } satisfies OpenRouterChatErrorResponseDto,
        error.status ?? 502
      );
    }

    return jsonResponse(
      {
        message: "Failed to contact OpenRouter.",
      } satisfies OpenRouterChatErrorResponseDto,
      502
    );
  }
};
