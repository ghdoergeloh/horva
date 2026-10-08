import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { TextField } from "@horva/ui/TextField";

import { client } from "#/lib/orpc.js";

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
    <section className="border-border bg-card space-y-4 rounded-lg border p-6 shadow-sm">
      <div>
        <h2 className="text-heading text-foreground">{t("moco.title")}</h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {t("moco.description")}
        </p>
      </div>

      {status?.configured && (
        <p className="text-foreground text-sm">
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

      <div className="flex flex-wrap items-center gap-3">
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
          <span className="text-success inline-flex items-center gap-1 text-sm">
            <Check aria-hidden className="size-4" />
            {t("moco.saved")}
          </span>
        )}
        {saveMutation.isError && (
          <span role="alert" className="text-destructive text-sm">
            {saveMutation.error instanceof Error
              ? saveMutation.error.message
              : t("moco.saveError")}
          </span>
        )}
      </div>

      {status?.configured && (
        <p className="text-muted-foreground border-border border-t pt-3 text-sm">
          {t("moco.linkingMovedHint")}
        </p>
      )}
    </section>
  );
}
