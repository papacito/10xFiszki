import { describe, expect, it, vi } from "vitest";

import { GET as listFlashcards, POST as createFlashcard } from "../src/pages/api/flashcards/index.ts";
import {
  DELETE as deleteFlashcard,
  PATCH as updateFlashcard,
} from "../src/pages/api/flashcards/[id].ts";
import {
  createManualFlashcard,
  listFlashcards as listFlashcardsService,
} from "../src/lib/services/flashcards.ts";

vi.mock("../src/lib/services/flashcards.ts", () => ({
  createManualFlashcard: vi.fn(),
  listFlashcards: vi.fn(),
}));

const token = "token-123";
const userId = "user-1";

const makeSupabaseAuthMock = () => ({
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    }),
  },
});

const makeContext = ({
  request,
  supabase,
  params,
}: {
  request: Request;
  supabase: unknown;
  params?: Record<string, string>;
}) => ({
  request,
  locals: { supabase },
  params: params ?? {},
});

const createQueryMock = (result: { data: unknown; error: unknown }) => {
  const query = {
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return query;
};

describe("flashcards API", () => {
  it("creates a manual flashcard", async () => {
    const flashcard = {
      id: "card-1",
      front: "Q",
      back: "A",
      source_type: "manual",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    vi.mocked(createManualFlashcard).mockResolvedValue({
      data: flashcard,
      error: null,
    });

    const request = new Request("http://localhost/api/flashcards", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        front: "Q",
        back: "A",
      }),
    });

    const response = await createFlashcard(
      makeContext({
        request,
        supabase: makeSupabaseAuthMock(),
      })
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe(flashcard.id);
    expect(body.source_type).toBe("manual");
  });

  it("lists flashcards", async () => {
    const flashcards = [
      {
        id: "card-1",
        front: "Q1",
        back: "A1",
        source_type: "manual",
        created_at: "2024-01-01T10:00:00.000Z",
        updated_at: "2024-01-01T10:00:00.000Z",
        deleted_at: null,
      },
    ];

    vi.mocked(listFlashcardsService).mockResolvedValue({
      data: flashcards,
      error: null,
    });

    const request = new Request("http://localhost/api/flashcards?limit=1", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const response = await listFlashcards(
      makeContext({
        request,
        supabase: makeSupabaseAuthMock(),
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toHaveLength(1);
    expect(body.next_cursor).toBe(flashcards[0].created_at);
  });

  it("updates a flashcard", async () => {
    const cardId = "11111111-1111-1111-1111-111111111111";
    const updated = {
      id: cardId,
      front: "Updated Q",
      back: "Updated A",
      updated_at: "2024-01-02T10:00:00.000Z",
    };

    const supabase = {
      ...makeSupabaseAuthMock(),
      from: vi.fn().mockReturnValue(createQueryMock({ data: updated, error: null })),
    };

    const request = new Request(`http://localhost/api/flashcards/${cardId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        front: "Updated Q",
        back: "Updated A",
      }),
    });

    const response = await updateFlashcard(
      makeContext({
        request,
        supabase,
        params: { id: cardId },
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.front).toBe(updated.front);
    expect(body.back).toBe(updated.back);
  });

  it("deletes a flashcard", async () => {
    const cardId = "22222222-2222-2222-2222-222222222222";
    const deleted = { id: cardId };

    const supabase = {
      ...makeSupabaseAuthMock(),
      from: vi.fn().mockReturnValue(createQueryMock({ data: deleted, error: null })),
    };

    const request = new Request(`http://localhost/api/flashcards/${cardId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const response = await deleteFlashcard(
      makeContext({
        request,
        supabase,
        params: { id: cardId },
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.message).toBe("Deleted.");
  });
});
