import type { ReactNode } from "react";
import type { Key } from "react-aria-components";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Select, SelectItem } from "@horva/ui/Select";
import { ToggleButton } from "@horva/ui/ToggleButton";
import { ToggleButtonGroup } from "@horva/ui/ToggleButtonGroup";

import type {
  ThemePreference,
  TimeFormat,
} from "#/contexts/SettingsContext.js";
import { MocoSettings } from "#/components/MocoSettings.js";
import { useSettings } from "#/contexts/SettingsContext.js";
import i18n, { setLanguage } from "#/i18n/index.js";

/** One setting: name and hint on the left, the control on the right. */
function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-body-strong text-foreground">{label}</p>
        {hint && <p className="text-muted-foreground mt-0.5 text-sm">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/** A segmented switch with one choice from `options`. */
function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <ToggleButtonGroup
      variant="segmented"
      aria-label={label}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys: Set<Key>) => {
        const [next] = keys;
        if (next !== undefined) onChange(String(next) as T);
      }}
    >
      {options.map((option) => (
        <ToggleButton key={option.id} id={option.id}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

function Settings() {
  const { t } = useTranslation();
  const { timeFormat, setTimeFormat, theme, setTheme } = useSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-display text-foreground">{t("settings.title")}</h1>

      <section className="border-border bg-card rounded-lg border p-6 shadow-sm">
        <h2 className="text-heading text-foreground mb-4">
          {t("settings.display")}
        </h2>
        <div className="divide-border divide-y">
          <SettingRow
            label={t("language.label")}
            hint={t("settings.languageHint")}
          >
            <Select
              value={i18n.language}
              onChange={(value) => setLanguage(String(value))}
              aria-label={t("language.label")}
            >
              <SelectItem id="de">{t("language.de")}</SelectItem>
              <SelectItem id="en">{t("language.en")}</SelectItem>
            </Select>
          </SettingRow>

          <SettingRow label={t("settings.theme")}>
            <Segmented<ThemePreference>
              label={t("settings.theme")}
              value={theme}
              onChange={setTheme}
              options={[
                { id: "system", label: t("settings.theme_system") },
                { id: "light", label: t("settings.theme_light") },
                { id: "dark", label: t("settings.theme_dark") },
              ]}
            />
          </SettingRow>

          <SettingRow
            label={t("settings.timeFormat")}
            hint={t("settings.timeFormatHint")}
          >
            <Segmented<TimeFormat>
              label={t("settings.timeFormat")}
              value={timeFormat}
              onChange={setTimeFormat}
              options={[
                { id: "hm", label: t("settings.timeFormat_hm") },
                {
                  id: "decimal-colon",
                  label: t("settings.timeFormat_decimal_colon"),
                },
                {
                  id: "decimal-dot",
                  label: t("settings.timeFormat_decimal_dot"),
                },
              ]}
            />
          </SettingRow>
        </div>
      </section>

      <MocoSettings />
    </div>
  );
}

export const Route = createFileRoute("/settings")({ component: Settings });
