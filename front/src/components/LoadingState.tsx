"use client";

import React from "react";
import styles from "@/app/page.module.css";
import { APP_NAME } from "@/i18n";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface LoadingStateProps {
  message: string;
  onBackToSearch?: () => void;
}

export function LoadingState({ message, onBackToSearch }: LoadingStateProps) {
  return (
    <div className={styles.appContainer}>
      <header className={styles.appHeader}>
        <div className={styles.headerTopRow}>
          <LanguageSwitcher />
        </div>
        <h1>
          {onBackToSearch ? (
            <span onClick={onBackToSearch} className={styles.titleLink}>
              {APP_NAME}
            </span>
          ) : (
            <span className={styles.titleLink}>{APP_NAME}</span>
          )}
        </h1>
      </header>
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>{message}</p>
      </div>
    </div>
  );
}
