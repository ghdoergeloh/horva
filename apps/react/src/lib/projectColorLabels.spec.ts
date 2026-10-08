import { afterEach, describe, expect, it } from "vitest";

import i18n from "#/i18n/index.js";
import { projectColorLabels } from "./projectColorLabels";

afterEach(async () => {
  await i18n.changeLanguage("de");
});

describe("projectColorLabels", () => {
  it("gives the picker the texts of the current language", async () => {
    await i18n.changeLanguage("en");
    const labels = projectColorLabels(i18n.t);
    expect(labels.custom).toBe("Custom color");
    expect(labels.presets).toHaveLength(18);
  });
});
