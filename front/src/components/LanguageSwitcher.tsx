"use client";

import React from "react";
import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n";
import type { Locale } from "@/i18n";

const LOCALE_OPTIONS: Locale[] = ["en", "fr"];

export function LanguageSwitcher() {
  const { locale, setLocale, messages } = useI18n();

  return (
    <div
      className={styles.languageSwitcher}
      role="group"
      aria-label={messages.languageSwitcher.label}
    >
      {LOCALE_OPTIONS.map((option) => {
        const label =
          option === "en"
            ? messages.languageSwitcher.english
            : messages.languageSwitcher.french;

        return (
          <button
            key={option}
            type="button"
            className={`${styles.languageButton} ${
              locale === option ? styles.languageButtonActive : ""
            }`}
            onClick={() => setLocale(option)}
            aria-pressed={locale === option}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
