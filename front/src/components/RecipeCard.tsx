"use client";

import React, { useCallback } from "react";
import styles from "@/app/page.module.css";
import { SearchResult } from "@/types";
import { getDomain } from "@/services/api";
import { useI18n } from "@/i18n";

interface RecipeCardProps {
  recipe: SearchResult;
  onSelect: (recipe: SearchResult) => void;
}

export const RecipeCard = React.memo(function RecipeCard({
  recipe,
  onSelect,
}: RecipeCardProps) {
  const { messages } = useI18n();

  const handleSelect = useCallback(() => {
    onSelect(recipe);
  }, [recipe, onSelect]);

  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <li className={styles.resultItem}>
      <div className={styles.resultContent}>
        <button className={styles.resultButton} onClick={handleSelect}>
          <span className={styles.resultTitle}>{recipe.title}</span>
          <span className={styles.resultSource}>{getDomain(recipe.url)}</span>
          {recipe.snippet && (
            <span className={styles.resultSnippet}>{recipe.snippet}</span>
          )}
        </button>
        <a
          href={recipe.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.resultOriginalLink}
          onClick={handleLinkClick}
        >
          {messages.search.viewOriginal}
        </a>
      </div>
    </li>
  );
});
