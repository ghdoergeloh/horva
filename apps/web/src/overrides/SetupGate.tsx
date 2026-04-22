import type { ReactNode, SyntheticEvent } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { initAuthClient } from "@horva/auth/client";
import { Button } from "@horva/ui/Button";
import { TextField } from "@horva/ui/TextField";

import { LoadingSpinner } from "~/components/LoadingSpinner.js";

// The override module re-exports with the same name (SetupGate) that the
// shared renderer (apps/electron/src/renderer/src/App.tsx) imports. On the
// web build this is a better-auth email/password login wall plus the
// password-reset flow. The reset page lives here (not in src/routes/)
// because it's web-only and must render outside the authenticated shell.

const API_URL: string =
  (import.meta.env["VITE_API_URL"] as string | undefined) ??
  "http://localhost:3000";
const authClient = initAuthClient({ baseUrl: `${API_URL}/api/auth` });

const RESET_PATH = "/reset-password";

interface SetupGateProps {
  children: ReactNode;
}

export function SetupGate({ children }: SetupGateProps) {
  const { t } = useTranslation();
  const { data: session, isPending } = authClient.useSession();

  // The reset-password page is reached via an email link; the user is almost
  // always unauthenticated at that point. Render it outside the session gate
  // so signed-out users land on the reset form and signed-in users can still
  // reset a forgotten password without logging out first.
  if (window.location.pathname === RESET_PATH) {
    return <ResetPasswordForm />;
  }

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

type LoginMode = "signin" | "signup" | "forgot";

function LoginForm() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<LoginMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function switchMode(next: LoginMode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  const canSubmit = (() => {
    if (mode === "forgot") return email.trim().length > 0;
    if (mode === "signup")
      return (
        email.trim().length > 0 && password.length > 0 && name.trim().length > 0
      );
    return email.trim().length > 0 && password.length > 0;
  })();

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signup") {
        const { error: err } = await authClient.signUp.email({
          email: email.trim(),
          password,
          name: name.trim(),
        });
        if (err) throw new Error(err.message ?? "Sign-up failed");
      } else if (mode === "forgot") {
        const { error: err } = await authClient.requestPasswordReset({
          email: email.trim(),
          redirectTo: `${window.location.origin}${RESET_PATH}`,
        });
        if (err) throw new Error(err.message ?? "Could not send reset email");
        setInfo(t("auth.forgotSent"));
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

  const title =
    mode === "signin"
      ? t("auth.signInTitle")
      : mode === "signup"
        ? t("auth.signUpTitle")
        : t("auth.forgotTitle");
  const subtitle =
    mode === "signin"
      ? t("auth.signInSubtitle")
      : mode === "signup"
        ? t("auth.signUpSubtitle")
        : t("auth.forgotSubtitle");

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>

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
            autoFocus={mode !== "signup"}
            label={t("auth.emailLabel")}
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            isRequired
            className="w-full"
          />
          {mode !== "forgot" && (
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
          )}
        </div>

        {mode === "signin" && (
          <div className="mt-2 text-right">
            <Button
              type="button"
              variant="quiet"
              onPress={() => switchMode("forgot")}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              {t("auth.forgotLink")}
            </Button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}
        {info && (
          <div className="mt-4 rounded-md bg-green-50 p-3 text-xs text-green-700">
            {info}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button
            type="button"
            variant="quiet"
            onPress={() => switchMode(mode === "signin" ? "signup" : "signin")}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            {mode === "signin"
              ? t("auth.needAccount")
              : mode === "signup"
                ? t("auth.haveAccount")
                : t("auth.backToSignIn")}
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
                : mode === "signup"
                  ? t("auth.signUp")
                  : t("auth.sendReset")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function ResetPasswordForm() {
  const { t } = useTranslation();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
  }, []);

  const canSubmit = !!token && password.length > 0 && password === confirm;

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      // canSubmit gates on `!!token`, so token is non-null here.
      if (!token) return;
      const { error: err } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (err) throw new Error(err.message ?? "Could not reset password");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            {t("auth.resetInvalidTitle")}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {t("auth.resetInvalidBody")}
          </p>
          <Button
            variant="primary"
            onPress={() => {
              window.location.href = "/";
            }}
            className="mt-4"
          >
            {t("auth.backToSignIn")}
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-gray-900">
            {t("auth.resetDoneTitle")}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {t("auth.resetDoneBody")}
          </p>
          <Button
            variant="primary"
            onPress={() => {
              window.location.href = "/";
            }}
            className="mt-4"
          >
            {t("auth.signIn")}
          </Button>
        </div>
      </div>
    );
  }

  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900">
          {t("auth.resetTitle")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t("auth.resetSubtitle")}</p>

        <div className="mt-6 space-y-4">
          <TextField
            autoFocus
            label={t("auth.newPasswordLabel")}
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            isRequired
            className="w-full"
          />
          <TextField
            label={t("auth.confirmPasswordLabel")}
            type="password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            isRequired
            isInvalid={mismatch}
            errorMessage={mismatch ? t("auth.passwordMismatch") : undefined}
            className="w-full"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            isDisabled={!canSubmit || submitting}
          >
            {submitting ? t("auth.submitting") : t("auth.resetSubmit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
