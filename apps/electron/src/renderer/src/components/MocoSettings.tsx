import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { TextField } from "@horva/ui/TextField";

import { client } from "~/lib/orpc.js";

/**
 * Moco credentials (API key + account subdomain). Project↔Moco linking lives
 * in the project drawer (see ProjectDrawer / MocoLinkFields), not here.
 */
export function MocoSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [subdomain, setSubdomain] = useState("");
  const [apiKey, setApiKey] = useState("");

  const { data: status } = useQuery({
    queryKey: ["moco", "config"],
    queryFn: () => client.moco.config.get(),
  });

  const saveMutation = useMutation({
    mutationFn: (input: { apiKey: string; subdomain: string }) =>
      client.moco.config.set(input),
    onSuccess: () => {
      setApiKey("");
      void queryClient.invalidateQueries({ queryKey: ["moco"] });
    },
  });

  const effectiveSubdomain = subdomain.trim() || (status?.subdomain ?? "");

  return (
    <div className="border-border bg-card space-y-4 rounded-xl border p-6">
      <div>
        <h2 className="text-foreground text-lg font-semibold">
          {t("moco.title")}
        </h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t("moco.description")}
        </p>
      </div>

      {status?.configured && (
        <p className="text-muted-foreground text-xs">
          {t("moco.connectedAs", { subdomain: status.subdomain ?? "" })}
        </p>
      )}

      <TextField
        label={t("moco.subdomain")}
        description={t("moco.subdomainHint")}
        value={subdomain}
        onChange={setSubdomain}
        placeholder={status?.subdomain ?? "meinaccount"}
      />
      <TextField
        label={t("moco.apiKey")}
        description={t("moco.apiKeyHint")}
        type="password"
        value={apiKey}
        onChange={setApiKey}
        placeholder={status?.configured ? "••••••••" : ""}
      />

      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          isDisabled={
            !effectiveSubdomain || !apiKey.trim() || saveMutation.isPending
          }
          onPress={() =>
            saveMutation.mutate({
              apiKey: apiKey.trim(),
              subdomain: effectiveSubdomain,
            })
          }
        >
          {t("moco.save")}
        </Button>
        {saveMutation.isSuccess && (
          <span className="text-xs text-green-600 dark:text-green-400">
            {t("moco.saved")}
          </span>
        )}
        {saveMutation.isError && (
          <span className="text-destructive text-xs">
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : t("moco.saveError")}
          </span>
        )}
      </div>

      {status?.configured && (
        <p className="text-muted-foreground border-border border-t pt-3 text-xs">
          {t("moco.linkingMovedHint")}
        </p>
      )}
    </div>
  );
}
