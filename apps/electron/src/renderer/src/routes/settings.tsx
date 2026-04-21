import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Select, SelectItem } from "@horva/ui/Select";

import type { TimeFormat } from "~/contexts/SettingsContext.js";
import {
  formatMinutesWithFormat,
  useSettings,
} from "~/contexts/SettingsContext.js";
import i18n, { setLanguage } from "~/i18n/index.js";

function Settings() {
  const { t } = useTranslation();
  const { timeFormat, setTimeFormat } = useSettings();

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">
        {t("settings.title")}
      </h1>

      <div className="space-y-6 rounded-xl border border-gray-200 bg-white p-6">
        {/* Language */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-gray-900">
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

        <hr className="border-gray-100" />

        {/* Time format */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {t("settings.timeFormat")}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
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
        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-500">
          {t("settings.preview")}:{" "}
          <span className="font-mono font-medium text-gray-800">
            {formatMinutesWithFormat(90, timeFormat)}
          </span>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/settings")({ component: Settings });
