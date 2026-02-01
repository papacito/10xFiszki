import { useCallback, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";

import type {
  FlashcardDto,
  MessageResponseDto,
  OpenRouterChatResponseDto,
} from "@/types";
import { Button } from "@/components/ui/button";

const getAccessToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("access_token");
};

export default function FlashcardCreateForm() {
  const frontId = useId();
  const backId = useId();
  const generateTextId = useId();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [generateText, setGenerateText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCard, setCreatedCard] = useState<FlashcardDto | null>(null);

  const frontLength = useMemo(() => front.trim().length, [front]);
  const backLength = useMemo(() => back.trim().length, [back]);
  const generateTextLength = useMemo(() => generateText.trim().length, [generateText]);

  const buildGenerationMessages = (input: string) => [
    {
      role: "system" as const,
      content:
        "You generate study flashcards. Return only valid JSON. " +
        "Output a JSON array of objects with keys: front, back. " +
        "Each flashcard should contain exactly one fact. " +
        "Keep answers short and unambiguous. Avoid multi-part questions. " +
        "Prefer definitions, relationships, cause-effect, concept-example.",
    },
    {
      role: "user" as const,
      content: `Notes:\n${input}`,
    },
  ];

  const extractJsonPayload = (content: string) => {
    const trimmed = content.trim();
    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      return fencedMatch[1].trim();
    }

    return trimmed;
  };

  const parseGeneratedCards = (content: string) => {
    const jsonPayload = extractJsonPayload(content);
    const parsed = JSON.parse(jsonPayload) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("Expected a JSON array.");
    }
    const normalized = parsed
      .filter((item) => typeof item === "object" && item !== null)
      .map((item) => {
        const record = item as { front?: unknown; back?: unknown };
        const frontValue = typeof record.front === "string" ? record.front.trim() : "";
        const backValue = typeof record.back === "string" ? record.back.trim() : "";
        return {
          front: frontValue,
          back: backValue,
        };
      })
      .filter((item) => item.front.length > 0 && item.back.length > 0);

    if (normalized.length === 0) {
      throw new Error("No valid flashcards were returned.");
    }

    return normalized;
  };

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);

      const trimmedFront = front.trim();
      const trimmedBack = back.trim();

      if (!trimmedFront || !trimmedBack) {
        setError("Front and back are required.");
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setAuthRequired(true);
        return;
      }

      setAuthRequired(false);
      setIsSaving(true);

      try {
        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            front: trimmedFront,
            back: trimmedBack,
          }),
        });

        if (response.status === 401) {
          setAuthRequired(true);
          return;
        }

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | MessageResponseDto
            | null;
          setError(payload?.message ?? "Failed to create flashcard.");
          return;
        }

        const payload = (await response.json()) as FlashcardDto;
        setCreatedCard(payload);
        setFront("");
        setBack("");
      } catch {
        setError("Network error while creating flashcard.");
      } finally {
        setIsSaving(false);
      }
    },
    [front, back]
  );

  const handleGenerate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setGenerationError(null);
      setGeneratedCount(null);

      const trimmedInput = generateText.trim();
      if (!trimmedInput) {
        setGenerationError("Input text is required.");
        return;
      }

      if (trimmedInput.length > 5000) {
        setGenerationError("Input text is too long. Keep it under 5000 characters.");
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setAuthRequired(true);
        return;
      }

      setAuthRequired(false);
      setIsGenerating(true);

      try {
        const response = await fetch("/api/smart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini",
            messages: buildGenerationMessages(trimmedInput),
            temperature: 0.3,
            max_tokens: 800,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | MessageResponseDto
            | null;
          setGenerationError(payload?.message ?? "Failed to generate flashcards.");
          return;
        }

        const payload = (await response.json()) as OpenRouterChatResponseDto;
        const content = payload.choices?.[0]?.message?.content?.trim();
        if (!content) {
          setGenerationError("The model returned an empty response.");
          return;
        }

        let generatedCards: Array<{ front: string; back: string }>;
        try {
          generatedCards = parseGeneratedCards(content);
        } catch (parseError) {
          const reason =
            parseError instanceof Error ? parseError.message : "Invalid model response.";
          setGenerationError(reason);
          return;
        }

        const createdCards: FlashcardDto[] = [];
        for (const card of generatedCards) {
          const createResponse = await fetch("/api/flashcards", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              front: card.front,
              back: card.back,
              source_type: "ai",
            }),
          });

          if (createResponse.status === 401) {
            setAuthRequired(true);
            break;
          }

          if (!createResponse.ok) {
            const payload = (await createResponse.json().catch(() => null)) as
              | MessageResponseDto
              | null;
            setGenerationError(payload?.message ?? "Failed to save generated flashcards.");
            break;
          }

          const created = (await createResponse.json()) as FlashcardDto;
          createdCards.push(created);
        }

        if (createdCards.length > 0) {
          setGeneratedCount(createdCards.length);
          setGenerateText("");
        }
      } catch {
        setGenerationError("Network error while generating flashcards.");
      } finally {
        setIsGenerating(false);
      }
    },
    [generateText]
  );

  return (
    <section className="mt-8 space-y-6">
      <div
        id="generate"
        className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Generate from text
            </h2>
            <p className="text-sm text-slate-600">
              Paste notes and let AI create flashcards automatically.
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleGenerate}>
          <label
            htmlFor={generateTextId}
            className="flex flex-col gap-1 text-sm font-medium text-slate-700"
          >
            Notes
            <textarea
              id={generateTextId}
              value={generateText}
              onChange={(event) => setGenerateText(event.target.value)}
              rows={6}
              placeholder="Paste your notes here (max 1 page)"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <span className="text-xs text-slate-500">
              {generateTextLength} characters
            </span>
          </label>

          {generationError ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {generationError}
            </div>
          ) : null}

          {authRequired ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Log in to generate flashcards.{" "}
              <a href="/auth" className="text-slate-900 underline">
                Go to login
              </a>
            </div>
          ) : null}

          {generatedCount !== null ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Generated and saved {generatedCount} flashcards.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate from text"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setGenerateText("");
                setGenerationError(null);
                setGeneratedCount(null);
                setAuthRequired(false);
              }}
            >
              Clear
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Create a flashcard</h2>
            <p className="text-sm text-slate-600">
              Add a manual card with a clear prompt and answer.
            </p>
          </div>
          <Button asChild variant="outline" className="self-start sm:self-auto">
            <a href="/flashcards">Back to list</a>
          </Button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label
            htmlFor={frontId}
            className="flex flex-col gap-1 text-sm font-medium text-slate-700"
          >
            Front
            <textarea
              id={frontId}
              value={front}
              onChange={(event) => setFront(event.target.value)}
              rows={3}
              placeholder="Question or prompt"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <span className="text-xs text-slate-500">{frontLength} characters</span>
          </label>

          <label
            htmlFor={backId}
            className="flex flex-col gap-1 text-sm font-medium text-slate-700"
          >
            Back
            <textarea
              id={backId}
              value={back}
              onChange={(event) => setBack(event.target.value)}
              rows={3}
              placeholder="Answer or explanation"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <span className="text-xs text-slate-500">{backLength} characters</span>
          </label>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {authRequired ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Log in to create flashcards.{" "}
              <a href="/auth" className="text-slate-900 underline">
                Go to login
              </a>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save flashcard"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFront("");
                setBack("");
                setError(null);
                setAuthRequired(false);
                setCreatedCard(null);
              }}
            >
              Clear
            </Button>
          </div>
        </form>
      </div>

      {createdCard ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-semibold">Flashcard saved.</p>
          <p className="mt-1 text-emerald-900">
            Front: <span className="font-medium">{createdCard.front}</span>
          </p>
          <p className="mt-1 text-emerald-900">
            Back: <span className="font-medium">{createdCard.back}</span>
          </p>
          <div className="mt-3">
            <Button asChild size="sm">
              <a href="/flashcards">View all flashcards</a>
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
