import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { TextField } from "@horva/ui/TextField";

import { LoadingSpinner } from "~/components/LoadingSpinner.js";
import { setupBridge } from "~/lib/setup.js";

type GateState =
  | { kind: "loading" }
  | {
      kind: "needs-setup";
      defaultDatabaseUrl: string;
    }
  | { kind: "ready" };

interface SetupGateProps {
  children: ReactNode;
}

export function SetupGate({ children }: SetupGateProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<GateState>({ kind: "loading" });

  useEffect(() => {
    void setupBridge
      .status()
      .then((status) => {
        if (status.ready) {
          setState({ kind: "ready" });
        } else {
          setState({
            kind: "needs-setup",
            defaultDatabaseUrl: status.defaults.databaseUrl,
          });
        }
      })
      .catch((err: unknown) => {
        console.error("setup:status failed", err);
      });
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner size={64} label={t("loading")} />
      </div>
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
    <div className="flex h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">
          {t("setup.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t("setup.subtitle")}</p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t("setup.nameLabel")}
            </label>
            <TextField
              autoFocus
              value={name}
              onChange={setName}
              placeholder={t("setup.namePlaceholder")}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t("setup.databaseUrlLabel")}
            </label>
            <TextField
              value={databaseUrl}
              onChange={setDatabaseUrl}
              placeholder="postgresql://…"
              className="w-full font-mono text-xs"
            />
            <p className="mt-1 text-xs text-gray-400">
              {t("setup.databaseUrlHint")}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-xs text-red-700">
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
