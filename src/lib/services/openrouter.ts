import type {
  OpenRouterChatMessage,
  OpenRouterChatRequestDto,
  OpenRouterChatResponseDto,
} from "../../types.ts";

type OpenRouterServiceOptions = {
  apiKey: string;
  fetcher?: typeof fetch;
  baseUrl?: string;
  maxRetries?: number;
  minRetryDelayMs?: number;
  timeoutMs?: number;
};

type OpenRouterChatApiChoice = {
  index: number;
  message: OpenRouterChatMessage;
  finish_reason: string | null;
};

type OpenRouterChatApiResponse = {
  id: string;
  model: string;
  created: number;
  choices: OpenRouterChatApiChoice[];
};

export class OpenRouterError extends Error {
  status?: number;
  code?: string;
  details?: string;

  constructor(message: string, options?: { status?: number; code?: string; details?: string }) {
    super(message);
    this.name = "OpenRouterError";
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export class OpenRouterService {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;
  private readonly baseUrl: string;
  private readonly maxRetries: number;
  private readonly minRetryDelayMs: number;
  private readonly timeoutMs: number;

  constructor(options: OpenRouterServiceOptions) {
    if (!options.apiKey) {
      throw new OpenRouterError("OpenRouter API key is missing.");
    }

    this.apiKey = options.apiKey;
    this.fetcher = options.fetcher ?? fetch;
    this.baseUrl = options.baseUrl ?? "https://openrouter.ai/api/v1";
    this.maxRetries = options.maxRetries ?? 2;
    this.minRetryDelayMs = options.minRetryDelayMs ?? 300;
    this.timeoutMs = options.timeoutMs ?? 20000;
  }

  public async createChatCompletion(
    input: OpenRouterChatRequestDto
  ): Promise<OpenRouterChatResponseDto> {
    if (!input.messages.length) {
      throw new OpenRouterError("At least one message is required.");
    }

    const payload = this.buildPayload(input);
    const response = await this.requestWithRetry(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw await this.buildErrorFromResponse(response);
    }

    const data = (await response.json()) as OpenRouterChatApiResponse;
    return {
      id: data.id,
      model: data.model,
      created: data.created,
      choices: (data.choices ?? []).map((choice) => ({
        index: choice.index,
        message: choice.message,
        finish_reason: choice.finish_reason ?? null,
      })),
    };
  }

  private buildPayload(input: OpenRouterChatRequestDto) {
    return {
      model: input.model,
      messages: input.messages,
      ...(input.temperature !== undefined ? { temperature: input.temperature } : {}),
      ...(input.max_tokens !== undefined ? { max_tokens: input.max_tokens } : {}),
      ...(input.top_p !== undefined ? { top_p: input.top_p } : {}),
    };
  }

  private async requestWithRetry(url: string, init: RequestInit): Promise<Response> {
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt <= this.maxRetries) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await this.fetcher(url, {
          ...init,
          signal: controller.signal,
        });

        if (this.isRetryableStatus(response.status) && attempt < this.maxRetries) {
          await this.delay(this.getBackoffDelay(attempt));
          attempt += 1;
          continue;
        }

        return response;
      } catch (error) {
        lastError = error;

        if (!this.isRetryableError(error) || attempt >= this.maxRetries) {
          throw error;
        }

        await this.delay(this.getBackoffDelay(attempt));
        attempt += 1;
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new OpenRouterError("Failed to reach OpenRouter.");
  }

  private isRetryableStatus(status: number): boolean {
    return status === 429 || (status >= 500 && status <= 599);
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof DOMException && error.name === "AbortError") {
      return true;
    }

    if (error instanceof Error) {
      return true;
    }

    return false;
  }

  private getBackoffDelay(attempt: number): number {
    const jitter = Math.random() * 100;
    return Math.min(2000, this.minRetryDelayMs * Math.pow(2, attempt) + jitter);
  }

  private delay(durationMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, durationMs));
  }

  private async buildErrorFromResponse(response: Response): Promise<OpenRouterError> {
    const status = response.status;
    const text = await response.text();
    let message = `OpenRouter request failed with status ${status}.`;
    let details: string | undefined;
    let code: string | undefined;

    if (text) {
      try {
        const parsed = JSON.parse(text) as { error?: { message?: string; code?: string } };
        const errorPayload = parsed?.error;
        if (errorPayload?.message) {
          message = errorPayload.message;
        }
        if (errorPayload?.code) {
          code = errorPayload.code;
        }
        details = text;
      } catch {
        details = text;
      }
    }

    return new OpenRouterError(message, { status, code, details });
  }
}
