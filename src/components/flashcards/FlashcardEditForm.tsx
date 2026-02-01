import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";

import type {
  FlashcardDto,
  FlashcardUpdateResponseDto,
  MessageResponseDto,
} from "@/types";
import { Button } from "@/components/ui/button";

type Props = {
  cardId: string;
};

const getAccessToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("access_token");
};

export default function FlashcardEditForm({ cardId }: Props) {
  const frontId = useId();
  const backId = useId();
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [originalCard, setOriginalCard] = useState<FlashcardDto | null>(null);

  const frontLength = useMemo(() => front.trim().length, [front]);
  const backLength = useMemo(() => back.trim().length, [back]);

  const loadCard = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setAuthRequired(true);
      setIsLoading(false);
      return;
    }

    setAuthRequired(false);
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`/api/flashcards/${cardId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        setAuthRequired(true);
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | MessageResponseDto
          | null;
        setError(payload?.message ?? "Failed to load flashcard.");
        return;
      }

      const payload = (await response.json()) as FlashcardDto;
      setOriginalCard(payload);
      setFront(payload.front);
      setBack(payload.back);
    } catch {
      setError("Network error while loading flashcard.");
    } finally {
      setIsLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    loadCard();
  }, [loadCard]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setSuccessMessage(null);

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
        const response = await fetch(`/api/flashcards/${cardId}`, {
          method: "PATCH",
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
          setError(payload?.message ?? "Failed to update flashcard.");
          return;
        }

        const payload = (await response.json()) as FlashcardUpdateResponseDto;
        setOriginalCard((current) =>
          current
            ? {
                ...current,
                front: payload.front,
                back: payload.back,
                updated_at: payload.updated_at,
              }
            : current
        );
        setSuccessMessage("Flashcard updated.");
      } catch {
        setError("Network error while updating flashcard.");
      } finally {
        setIsSaving(false);
      }
    },
    [cardId, front, back]
  );

  const handleReset = useCallback(() => {
    if (originalCard) {
      setFront(originalCard.front);
      setBack(originalCard.back);
    }
    setError(null);
    setSuccessMessage(null);
  }, [originalCard]);

  if (isLoading) {
    return (
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
        Loading flashcard...
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700">
        Log in to edit flashcards.{" "}
        <a href="/auth" className="text-slate-900 underline">
          Go to login
        </a>
      </div>
    );
  }

  if (!originalCard && error) {
    return (
      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <section className="mt-8 space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Edit flashcard</h2>
            <p className="text-sm text-slate-600">
              Update the prompt or answer, then save your changes.
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
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            <span className="text-xs text-slate-500">{backLength} characters</span>
          </label>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {successMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save changes"}
            </Button>
            <Button type="button" variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
