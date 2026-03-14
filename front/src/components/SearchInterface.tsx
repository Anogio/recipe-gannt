"use client";

import React from "react";
import { SearchResult, InputMode } from "@/types";
import { useI18n } from "@/i18n";
import { SearchInput, RecipeCard } from "@/components";
import styles from "@/app/page.module.css";

interface SearchInterfaceProps {
  inputMode: InputMode;
  searchQuery: string;
  manualUrl: string;
  searchResults: SearchResult[];
  searchLoading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  popularRecipes: SearchResult[];
  popularRecipesWarning: string;
  error: string;
  setInputMode: (mode: InputMode) => void;
  setSearchQuery: (query: string) => void;
  setManualUrl: (url: string) => void;
  onSelectRecipe: (recipe: SearchResult) => void;
  onSearch: () => void;
  onLoadMore: () => void;
  onLoadFromUrl: () => void;
}

export function SearchInterface({
  inputMode,
  searchQuery,
  manualUrl,
  searchResults,
  searchLoading,
  loadingMore,
  hasMore,
  popularRecipes,
  popularRecipesWarning,
  error,
  setInputMode,
  setSearchQuery,
  setManualUrl,
  onSelectRecipe,
  onSearch,
  onLoadMore,
  onLoadFromUrl,
}: SearchInterfaceProps) {
  const { messages } = useI18n();

  return (
    <>
      <div className={styles.segmentedPicker}>
        <button
          className={`${styles.segmentButton} ${
            inputMode === "search" ? styles.segmentButtonActive : ""
          }`}
          onClick={() => setInputMode("search")}
        >
          {messages.search.searchMode}
        </button>
        <button
          className={`${styles.segmentButton} ${
            inputMode === "url" ? styles.segmentButtonActive : ""
          }`}
          onClick={() => setInputMode("url")}
        >
          {messages.search.urlMode}
        </button>
      </div>

      {inputMode === "search" && (
        <>
          <SearchInput
            value={searchQuery}
            placeholder={messages.search.searchPlaceholder}
            isLoading={searchLoading}
            onChange={setSearchQuery}
            onSubmit={onSearch}
          />

          {searchResults.length > 0 && (
            <div className={styles.searchResults}>
              <p className={styles.resultsCount}>
                {messages.search.resultsCount(searchResults.length)}
              </p>
              <ul className={styles.resultsList}>
                {searchResults.map((result, index) => (
                  <RecipeCard
                    key={`${result.url}-${index}`}
                    recipe={result}
                    onSelect={onSelectRecipe}
                  />
                ))}
              </ul>
              {hasMore && (
                <button
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className={styles.loadMoreButton}
                >
                  {loadingMore
                    ? messages.search.loadingMore
                    : messages.search.loadMore}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {inputMode === "url" && (
        <SearchInput
          value={manualUrl}
          placeholder={messages.search.urlPlaceholder}
          isLoading={searchLoading}
          onChange={setManualUrl}
          onSubmit={onLoadFromUrl}
        />
      )}

      {!searchLoading &&
        searchResults.length === 0 &&
        popularRecipes.length > 0 && (
          <div className={styles.popularRecipes}>
            <h2 className={styles.popularTitle}>{messages.search.popularTitle}</h2>
            <ul className={styles.resultsList}>
              {popularRecipes.slice(0, 10).map((recipe, index) => (
                <RecipeCard
                  key={`${recipe.url}-${index}`}
                  recipe={recipe}
                  onSelect={onSelectRecipe}
                />
              ))}
            </ul>
          </div>
        )}

      {popularRecipesWarning && (
        <p className={styles.warningMessage}>{popularRecipesWarning}</p>
      )}

      {error && <p className={styles.errorMessage}>{error}</p>}
    </>
  );
}
