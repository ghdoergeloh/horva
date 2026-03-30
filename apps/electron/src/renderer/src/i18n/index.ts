/* eslint-disable import/no-named-as-default-member */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import de from "./locales/de.json";
import en from "./locales/en.json";

const STORAGE_KEY = "tt-language";

const savedLanguage = localStorage.getItem(STORAGE_KEY) ?? "de";

void i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
  },
  lng: savedLanguage,
  fallbackLng: "de",
  interpolation: {
    escapeValue: false,
  },
});

export function setLanguage(lng: string): void {
  void i18n.changeLanguage(lng);
  localStorage.setItem(STORAGE_KEY, lng);
}

export default i18n;
