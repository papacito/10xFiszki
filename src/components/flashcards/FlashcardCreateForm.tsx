import { useCallback, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";

import type { FlashcardDto, MessageResponseDto } from "@/types";
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
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCard, setCreatedCard] = useState<FlashcardDto | null>(null);

  const frontLength = useMemo(() => front.trim().length, [front]);
  const backLength = useMemo(() => back.trim().length, [back]);

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

  return (
    <section className="mt-8 space-y-6">
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
