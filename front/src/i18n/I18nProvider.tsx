"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  getPreferredLocale,
  LOCALE_STORAGE_KEY,
  Locale,
  translations,
  TranslationMessages,
} from "./translations";

interface I18nContextValue {
  locale: Locale;
  messages: TranslationMessages;
  setLocale: (locale: Locale) => void;
}

const defaultContext: I18nContextValue = {
  locale: DEFAULT_LOCALE,
  messages: translations[DEFAULT_LOCALE],
  setLocale: () => {},
};

const I18nContext = createContext<I18nContextValue>(defaultContext);

function syncDocument(locale: Locale, messages: TranslationMessages) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = locale;
  document.title = messages.meta.title;

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute("content", messages.meta.description);
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setLocale(getPreferredLocale());
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      messages: translations[locale],
      setLocale,
    }),
    [locale]
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    }
    syncDocument(locale, value.messages);
  }, [locale, value.messages]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
