import type { TFunction } from "i18next";

import type { ProjectColorPickerLabels } from "@horva/ui/ProjectColorPicker";

/** The texts of the project color picker in the current language. */
export function projectColorLabels(t: TFunction): ProjectColorPickerLabels {
  return {
    presets: t("projectColors.presets", { returnObjects: true }) as string[],
    custom: t("projectColors.custom"),
    customPlaceholder: t("projectColors.customPlaceholder"),
    invalid: t("projectColors.invalid"),
  };
}
