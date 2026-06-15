import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Select, SelectItem } from "@horva/ui/Select";

import type {
  ThemePreference,
  TimeFormat,
} from "~/contexts/SettingsContext.js";
import { MocoSettings } from "~/components/MocoSettings.js";
import {
  formatMinutesWithFormat,
  useSettings,
} from "~/contexts/SettingsContext.js";
import i18n, { setLanguage } from "~/i18n/index.js";

function Settings() {
  const { t } = useTranslation();
  const { timeFormat, setTimeFormat, theme, setTheme } = useSettings();

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <h1 className="text-foreground text-2xl font-bold">
        {t("settings.title")}
      </h1>

      <div className="border-border bg-card space-y-6 rounded-xl border p-6">
        {/* Language */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-foreground text-sm font-medium">
            {t("language.label")}
          </p>
          <Select
            value={i18n.language}
            onChange={(value) => setLanguage(String(value))}
            aria-label={t("language.label")}
          >
            <SelectItem id="de">{t("language.de")}</SelectItem>
            <SelectItem id="en">{t("language.en")}</SelectItem>
          </Select>
        </div>

        <hr className="border-border" />

        {/* Theme */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-foreground text-sm font-medium">
            {t("settings.theme")}
          </p>
          <Select
            value={theme}
            onChange={(value) => setTheme(value as ThemePreference)}
            aria-label={t("settings.theme")}
          >
            <SelectItem id="system">{t("settings.theme_system")}</SelectItem>
            <SelectItem id="light">{t("settings.theme_light")}</SelectItem>
            <SelectItem id="dark">{t("settings.theme_dark")}</SelectItem>
          </Select>
        </div>

        <hr className="border-border" />

        {/* Time format */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-foreground text-sm font-medium">
              {t("settings.timeFormat")}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {t("settings.timeFormatHint")}
            </p>
          </div>
          <Select
            value={timeFormat}
            onChange={(value) => setTimeFormat(value as TimeFormat)}
            aria-label={t("settings.timeFormat")}
          >
            <SelectItem id="hm">{t("settings.timeFormat_hm")}</SelectItem>
            <SelectItem id="decimal-colon">
              {t("settings.timeFormat_decimal_colon")}
            </SelectItem>
            <SelectItem id="decimal-dot">
              {t("settings.timeFormat_decimal_dot")}
            </SelectItem>
          </Select>
        </div>

        {/* Live preview */}
        <div className="bg-background text-muted-foreground rounded-lg px-4 py-3 text-sm">
          {t("settings.preview")}:{" "}
          <span className="text-foreground font-mono font-medium">
            {formatMinutesWithFormat(90, timeFormat)}
          </span>
        </div>
      </div>

      <MocoSettings />
    </div>
  );
}

export const Route = createFileRoute("/settings")({ component: Settings });
