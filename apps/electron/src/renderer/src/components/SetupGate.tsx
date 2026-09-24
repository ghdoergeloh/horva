import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { LoadingSpinner } from "@horva/react";
import { Button } from "@horva/ui/Button";
import { TextField } from "@horva/ui/TextField";

import { setupBridge } from "../lib/setup.js";

type GateState =
  | { kind: "loading" }
  | {
      kind: "needs-setup";
      defaultDatabaseUrl: string;
    }
  | { kind: "error"; message: string }
  | { kind: "ready" };

interface SetupGateProps {
  children: ReactNode;
}

export function SetupGate({ children }: SetupGateProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<GateState>({ kind: "loading" });

  const fetchStatus = () => {
    void setupBridge
      .status()
      .then((status) => {
        if (status.ready) {
          setState({ kind: "ready" });
        } else if (status.error) {
          setState({ kind: "error", message: status.error });
        } else {
          setState({
            kind: "needs-setup",
            defaultDatabaseUrl: status.defaults.databaseUrl,
          });
        }
      })
      .catch((err: unknown) => {
        console.error("setup:status failed", err);
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      });
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="bg-background flex h-screen items-center justify-center">
        <LoadingSpinner size={64} label={t("loading")} />
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <SetupError
        message={state.message}
        onRetry={() => {
          setState({ kind: "loading" });
          fetchStatus();
        }}
      />
    );
  }

  if (state.kind === "needs-setup") {
    return (
      <SetupWizard
        defaultDatabaseUrl={state.defaultDatabaseUrl}
        onDone={() => setState({ kind: "ready" })}
      />
    );
  }

  return <>{children}</>;
}

interface SetupErrorProps {
  message: string;
  onRetry: () => void;
}

function SetupError({ message, onRetry }: SetupErrorProps) {
  const { t } = useTranslation();
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      await setupBridge.retry();
    } catch {
      // The next status() call will surface the fresh error message.
    } finally {
      setRetrying(false);
      onRetry();
    }
  }

  return (
    <div className="bg-background flex h-screen items-center justify-center p-6">
      <div className="border-border bg-card text-card-foreground w-full max-w-md rounded-xl border p-6 shadow-sm">
        <h1 className="text-foreground text-xl font-semibold">
          {t("bootError.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("bootError.subtitle")}
        </p>
        <div className="bg-destructive/10 text-destructive mt-4 rounded-md p-3 font-mono text-xs break-all">
          {message}
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            variant="primary"
            onPress={() => void handleRetry()}
            isDisabled={retrying}
          >
            {retrying ? t("bootError.retrying") : t("bootError.retry")}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SetupWizardProps {
  defaultDatabaseUrl: string;
  onDone: () => void;
}

function SetupWizard({ defaultDatabaseUrl, onDone }: SetupWizardProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [databaseUrl, setDatabaseUrl] = useState(defaultDatabaseUrl);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && databaseUrl.trim().length > 0;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await setupBridge.complete({
        name: name.trim(),
        databaseUrl: databaseUrl.trim(),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-background flex h-screen items-center justify-center p-6">
      <div className="border-border bg-card text-card-foreground w-full max-w-md rounded-xl border p-6 shadow-sm">
        <h1 className="text-foreground text-xl font-semibold">
          {t("setup.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("setup.subtitle")}
        </p>

        <div className="mt-6 space-y-4">
          <TextField
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- The setup form is the only content on this screen.
            autoFocus
            label={t("setup.nameLabel")}
            value={name}
            onChange={setName}
            placeholder={t("setup.namePlaceholder")}
            className="w-full"
          />
          <TextField
            label={t("setup.databaseUrlLabel")}
            description={t("setup.databaseUrlHint")}
            value={databaseUrl}
            onChange={setDatabaseUrl}
            placeholder="postgresql://…"
            className="w-full"
          />
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive mt-4 rounded-md p-3 text-xs">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            variant="primary"
            onPress={() => void handleSubmit()}
            isDisabled={!canSubmit || submitting}
          >
            {submitting ? t("setup.submitting") : t("setup.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
