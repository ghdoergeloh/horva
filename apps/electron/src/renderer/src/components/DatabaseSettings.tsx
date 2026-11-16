import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { Checkbox } from "@horva/ui/Checkbox";
import { Radio, RadioGroup } from "@horva/ui/RadioGroup";
import { TextField } from "@horva/ui/TextField";

import type { Storage } from "../lib/storage.js";
import { databaseBridge } from "../lib/database.js";
import { ipcErrorMessage } from "../lib/ipc-error.js";
import { folderOf } from "../lib/storage.js";

/** The result of the check of the chosen database. */
type Checked = { url: string; empty: boolean } | null;

/**
 * The database section of the settings: shows the database in use and
 * switches to another one, with or without the data of the current one.
 */
export function DatabaseSettings() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<{
    url: string;
    localDatabaseUrl: string;
  } | null>(null);
  useEffect(() => {
    void databaseBridge.status().then(setStatus);
  }, []);
  const [storage, setStorage] = useState<Storage>("server");
  const [otherUrl, setOtherUrl] = useState("");
  const [checked, setChecked] = useState<Checked>(null);
  const [copy, setCopy] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!status) return null;
  const usesLocal = status.url === status.localDatabaseUrl;
  // The app's own folder is no choice while it is in use.
  const choice = usesLocal ? "server" : storage;
  const url = choice === "local" ? status.localDatabaseUrl : otherUrl.trim();

  const reset = () => {
    setChecked(null);
    setError(null);
  };

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(ipcErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const inspect = () =>
    run(async () => {
      const { empty } = await databaseBridge.inspect(url);
      setChecked({ url, empty });
      setCopy(empty);
    });

  const switchNow = () =>
    run(async () => {
      await databaseBridge.switch({ url, copy: copy && !!checked?.empty });
      // A fresh start of the window: every screen loads the new data.
      window.location.reload();
    });

  return (
    <section className="border-border bg-card space-y-4 rounded-lg border p-6 shadow-sm">
      <div>
        <h2 className="text-heading text-foreground">
          {t("databaseSettings.title")}
        </h2>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {t("databaseSettings.description")}
        </p>
      </div>

      <div>
        <p className="text-body-strong text-foreground">
          {t("databaseSettings.current")}
        </p>
        <p className="text-foreground mt-0.5 font-mono text-sm break-all">
          {status.url.startsWith("file:") ? folderOf(status.url) : status.url}
        </p>
      </div>

      <RadioGroup
        label={t("databaseSettings.target")}
        value={choice}
        onChange={(value) => {
          setStorage(value as Storage);
          reset();
        }}
      >
        <Radio
          value="local"
          isDisabled={usesLocal}
          description={t("databaseSettings.localHint", {
            folder: folderOf(status.localDatabaseUrl),
          })}
        >
          {t("setup.storageLocal")}
        </Radio>
        <Radio value="server" description={t("databaseSettings.otherHint")}>
          {t("databaseSettings.other")}
        </Radio>
      </RadioGroup>
      {choice === "server" && (
        <TextField
          label={t("databaseSettings.urlLabel")}
          description={t("databaseSettings.urlHint")}
          value={otherUrl}
          onChange={(value) => {
            setOtherUrl(value);
            reset();
          }}
          placeholder="postgresql://user:password@host:5432/horva"
          className="w-full"
        />
      )}

      {checked && (
        <div className="border-border space-y-3 border-t pt-4">
          <p className="text-foreground text-sm">
            {checked.empty
              ? t("databaseSettings.empty")
              : t("databaseSettings.hasData")}
          </p>
          {checked.empty && (
            <Checkbox
              isSelected={copy}
              onChange={setCopy}
              description={t("databaseSettings.copyHint")}
            >
              {t("databaseSettings.copy")}
            </Checkbox>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="border-destructive text-destructive rounded-md border p-3 text-sm break-words whitespace-pre-line"
        >
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {checked ? (
          <>
            <Button
              variant="primary"
              isPending={busy}
              onPress={() => void switchNow()}
            >
              {t("databaseSettings.switch")}
            </Button>
            <Button variant="secondary" isDisabled={busy} onPress={reset}>
              {t("databaseSettings.cancel")}
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            isDisabled={!url}
            isPending={busy}
            onPress={() => void inspect()}
          >
            {t("databaseSettings.check")}
          </Button>
        )}
      </div>
    </section>
  );
}
