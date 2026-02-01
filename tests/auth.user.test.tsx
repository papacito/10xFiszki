// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import AuthForm from "../src/components/auth/AuthForm";

describe("auth form (user flow)", () => {
  it("logs in and stores tokens", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "access-123",
        refresh_token: "refresh-456",
        user: { id: "user-1", email: "student@example.com" },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<AuthForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "student@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(localStorage.getItem("access_token")).toBe("access-123");
    });

    expect(localStorage.getItem("refresh_token")).toBe("refresh-456");
    expect(screen.getByText("Logged in successfully.")).toBeTruthy();

    vi.unstubAllGlobals();
  });
});
