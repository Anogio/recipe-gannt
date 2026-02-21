"use client";

import React from "react";
import styles from "@/app/page.module.css";

interface LoadingStateProps {
  message: string;
  onBackToSearch?: () => void;
}

export function LoadingState({ message, onBackToSearch }: LoadingStateProps) {
  return (
    <div className={styles.appContainer}>
      <header className={styles.appHeader}>
        <h1>
          {onBackToSearch ? (
            <span onClick={onBackToSearch} className={styles.titleLink}>
              Flow Recipe
            </span>
          ) : (
            <span className={styles.titleLink}>Flow Recipe</span>
          )}
        </h1>
      </header>
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>{message}</p>
      </div>
    </div>
  );
}