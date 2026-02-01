import { useCallback, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";

import type {
  LoginResponseDto,
  MessageResponseDto,
  SignupResponseDto,
} from "@/types";
import { Button } from "@/components/ui/button";

type AuthMode = "login" | "signup";

const getEndpoint = (mode: AuthMode) =>
  mode === "login" ? "/auth/login" : "/auth/signup";

const persistSession = (payload: LoginResponseDto | SignupResponseDto) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem("access_token", payload.access_token);
  window.localStorage.setItem("refresh_token", payload.refresh_token);
  window.localStorage.setItem("auth_user", JSON.stringify(payload.user));
  window.dispatchEvent(new Event("auth:changed"));
};

export default function AuthForm() {
  const emailId = useId();
  const passwordId = useId();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const modeLabel = mode === "login" ? "Log in" : "Create account";
  const helperText = useMemo(
    () =>
      mode === "login"
        ? "Use your existing account credentials."
        : "Create a new account to start building flashcards.",
    [mode]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setError(null);
      setSuccessMessage(null);

      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();
      if (!trimmedEmail || !trimmedPassword) {
        setError("Email and password are required.");
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch(getEndpoint(mode), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: trimmedEmail,
            password: trimmedPassword,
          }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | MessageResponseDto
            | null;
          setError(payload?.message ?? "Authentication failed.");
          return;
        }

        const payload = (await response.json()) as
          | LoginResponseDto
          | SignupResponseDto;
        persistSession(payload);
        setSuccessMessage(
          mode === "login"
            ? "Logged in successfully."
            : "Account created. You are now logged in."
        );
        setPassword("");
      } catch {
        setError("Network error while authenticating.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, mode]
  );

  const toggleMode = useCallback(() => {
    setMode((current) => (current === "login" ? "signup" : "login"));
    setError(null);
    setSuccessMessage(null);
  }, []);

  return (
    <section className="mt-8 space-y-6">
      {successMessage ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Next steps</p>
          <p className="mt-1">Choose how you want to add or review cards.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href="/flashcards/new#generate">Generate from text</a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href="/flashcards/new">Create manual card</a>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <a href="/flashcards">List flashcards</a>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <header className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Authentication
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Sign in to continue
            </h1>
            <p className="text-base text-slate-600">
              Access your flashcards across devices with your account.
            </p>
            <div className="pt-2">
              <h2 className="text-xl font-semibold text-slate-900">{modeLabel}</h2>
              <p className="text-sm text-slate-600">{helperText}</p>
            </div>
          </header>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label
              htmlFor={emailId}
              className="flex flex-col gap-1 text-sm font-medium text-slate-700"
            >
              Email
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>

            <label
              htmlFor={passwordId}
              className="flex flex-col gap-1 text-sm font-medium text-slate-700"
            >
              Password
              <input
                id={passwordId}
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </label>

            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : modeLabel}
              </Button>
              <Button type="button" variant="outline" onClick={toggleMode}>
                {mode === "login" ? "Create account" : "Use existing account"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
