import type { FormEvent, ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { initAuthClient } from "@horva/auth/client";
import { Button } from "@horva/ui/Button";
import { TextField } from "@horva/ui/TextField";

import { LoadingSpinner } from "~/components/LoadingSpinner.js";

// The override module re-exports with the same name (SetupGate) that the
// shared renderer (apps/electron/src/renderer/src/App.tsx) imports. On the
// web build this is a better-auth email/password login wall instead of the
// Electron first-launch wizard.

const API_URL: string =
  (import.meta.env["VITE_API_URL"] as string | undefined) ??
  "http://localhost:3000";
const authClient = initAuthClient({ baseUrl: `${API_URL}/api/auth` });

interface SetupGateProps {
  children: ReactNode;
}

export function SetupGate({ children }: SetupGateProps) {
  const { t } = useTranslation();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner size={64} label={t("loading")} />
      </div>
    );
  }

  if (!session) {
    return <LoginForm />;
  }

  return <>{children}</>;
}

function LoginForm() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    email.trim().length > 0 &&
    password.length > 0 &&
    (mode === "signin" || name.trim().length > 0);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "signup") {
        const { error: err } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
        });
        if (err) throw new Error(err.message ?? "Sign-up failed");
      } else {
        const { error: err } = await authClient.signIn.email({
          email: email.trim(),
          password,
        });
        if (err) throw new Error(err.message ?? "Sign-in failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900">
          {mode === "signin" ? t("auth.signInTitle") : t("auth.signUpTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {mode === "signin"
            ? t("auth.signInSubtitle")
            : t("auth.signUpSubtitle")}
        </p>

        <div className="mt-6 space-y-4">
          {mode === "signup" && (
            <TextField
              autoFocus
              label={t("auth.nameLabel")}
              value={name}
              onChange={setName}
              autoComplete="name"
              className="w-full"
            />
          )}
          <TextField
            autoFocus={mode === "signin"}
            label={t("auth.emailLabel")}
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            isRequired
            className="w-full"
          />
          <TextField
            label={t("auth.passwordLabel")}
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={
              mode === "signin" ? "current-password" : "new-password"
            }
            isRequired
            className="w-full"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="quiet"
            onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            {mode === "signin" ? t("auth.needAccount") : t("auth.haveAccount")}
          </Button>
          <Button
            type="submit"
            variant="primary"
            isDisabled={!canSubmit || submitting}
          >
            {submitting
              ? t("auth.submitting")
              : mode === "signin"
                ? t("auth.signIn")
                : t("auth.signUp")}
          </Button>
        </div>
      </form>
    </div>
  );
}
