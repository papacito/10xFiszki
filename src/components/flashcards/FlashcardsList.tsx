import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";

import type { FlashcardDto, FlashcardListResponseDto } from "@/types";
import { Button } from "@/components/ui/button";

const DEFAULT_LIMIT = 20;

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const getAccessToken = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem("access_token");
};

const buildQueryParams = ({
  cursor,
  search,
  sourceType,
}: {
  cursor?: string | null;
  search?: string;
  sourceType?: "ai" | "manual" | "all";
}) => {
  const params = new URLSearchParams();
  params.set("limit", DEFAULT_LIMIT.toString());
  params.set("sort", "created_at");
  params.set("order", "desc");
  if (cursor) {
    params.set("cursor", cursor);
  }
  if (search) {
    params.set("search", search);
  }
  if (sourceType && sourceType !== "all") {
    params.set("source_type", sourceType);
  }
  return params;
};

export default function FlashcardsList() {
  const [flashcards, setFlashcards] = useState<FlashcardDto[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceType, setSourceType] = useState<"ai" | "manual" | "all">("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const statusMessage = useMemo(() => {
    if (authRequired) {
      return "Log in to view your flashcards.";
    }
    if (error) {
      return error;
    }
    return null;
  }, [authRequired, error]);

  const loadFlashcards = useCallback(
    async ({ cursorParam, append }: { cursorParam?: string | null; append: boolean }) => {
      const token = getAccessToken();
      if (!token) {
        setAuthRequired(true);
        setFlashcards([]);
        setHasMore(false);
        setCursor(null);
        return;
      }

      setAuthRequired(false);
      setError(null);

      const params = buildQueryParams({
        cursor: cursorParam,
        search: searchTerm || undefined,
        sourceType,
      });
      const requestId = ++requestIdRef.current;

      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
        }

        const response = await fetch(`/api/flashcards?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (requestId !== requestIdRef.current) {
          return;
        }

        if (response.status === 401) {
          setAuthRequired(true);
          setFlashcards([]);
          setHasMore(false);
          setCursor(null);
          return;
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(payload?.message ?? "Failed to load flashcards.");
          return;
        }

        const payload = (await response.json()) as FlashcardListResponseDto;
        setFlashcards((current) =>
          append ? [...current, ...payload.data] : payload.data
        );
        setCursor(payload.next_cursor);
        setHasMore(Boolean(payload.next_cursor));
      } catch (err) {
        setError("Network error while loading flashcards.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [searchTerm, sourceType]
  );

  useEffect(() => {
    loadFlashcards({ append: false });
  }, [loadFlashcards]);

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSearchTerm(searchInput.trim());
    },
    [searchInput]
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    setSearchTerm("");
    setSourceType("all");
  }, []);

  const handleLoadMore = useCallback(() => {
    if (cursor && !isLoadingMore) {
      loadFlashcards({ cursorParam: cursor, append: true });
    }
  }, [cursor, isLoadingMore, loadFlashcards]);

  const handleDelete = useCallback(
    async (cardId: string) => {
      if (deletingId) {
        return;
      }

      const confirmed = window.confirm(
        "Delete this flashcard? You can’t undo this action."
      );
      if (!confirmed) {
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setAuthRequired(true);
        return;
      }

      setDeletingId(cardId);
      setError(null);

      try {
        const response = await fetch(`/api/flashcards/${cardId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          setAuthRequired(true);
          return;
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setError(payload?.message ?? "Failed to delete flashcard.");
          return;
        }

        setFlashcards((current) => current.filter((card) => card.id !== cardId));
      } catch {
        setError("Network error while deleting flashcard.");
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId]
  );

  return (
    <section className="mt-8 space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Your flashcards</h2>
            <p className="text-sm text-slate-600">
              Search, filter, and review your saved cards.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-start sm:self-auto">
            <Button asChild>
              <a href="/flashcards/new#generate">Generate from text</a>
            </Button>
            <Button asChild variant="outline">
              <a href="/flashcards/new">Create manual card</a>
            </Button>
          </div>
        </div>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={handleSearchSubmit}
        >
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium text-slate-700">
            Search
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search front or back text"
              className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            Source
            <select
              value={sourceType}
              onChange={(event) =>
                setSourceType(event.target.value as "ai" | "manual" | "all")
              }
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="all">All</option>
              <option value="ai">AI</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              Apply filters
            </Button>
            <Button type="button" variant="outline" onClick={handleClearFilters}>
              Reset
            </Button>
          </div>
        </form>
      </div>

      {statusMessage ? (
        <div
          className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700"
          role="status"
          aria-live="polite"
        >
          <p>{statusMessage}</p>
          {authRequired ? (
            <p className="mt-2">
              <a href="/auth" className="text-slate-900 underline">
                Go to login
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading flashcards...
        </div>
      ) : null}

      {!isLoading && flashcards.length === 0 && !statusMessage ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          No flashcards found. Try adjusting filters or create a new card.
        </div>
      ) : null}

      {flashcards.length > 0 ? (
        <ul className="grid gap-4">
          {flashcards.map((card) => (
            <li
              key={card.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Front
                    </p>
                    <p className="text-sm text-slate-900">{card.front}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Back
                    </p>
                    <p className="text-sm text-slate-700">{card.back}</p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2 text-xs text-slate-500 sm:items-end sm:text-right">
                  <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] uppercase">
                    {card.source_type === "ai" ? "AI" : "Manual"}
                  </span>
                  <span>Updated {formatDate(card.updated_at)}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a href={`/flashcards/${card.id}/edit`}>Edit</a>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(card.id)}
                      disabled={deletingId === card.id}
                    >
                      {deletingId === card.id ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {hasMore ? (
        <div className="flex justify-center">
          <Button onClick={handleLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
