"use client";

import React, { useCallback } from "react";
import styles from "@/app/page.module.css";
import { SearchResult } from "@/types";
import { getDomain } from "@/services/api";

interface RecipeCardProps {
  recipe: SearchResult;
  onSelect: (recipe: SearchResult) => void;
}

export const RecipeCard = React.memo(function RecipeCard({
  recipe,
  onSelect,
}: RecipeCardProps) {
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
          View original
        </a>
      </div>
    </li>
  );
});
