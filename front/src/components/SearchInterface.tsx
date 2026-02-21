"use client";

import React, { useState, useCallback } from "react";
import { SearchResult, InputMode } from "@/types";
import { searchRecipes, getPopularRecipes } from "@/services/api";
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
  searchPage: number;
  popularRecipes: SearchResult[];
  popularRecipesWarning: string;
  error: string;
  setInputMode: (mode: InputMode) => void;
  setSearchQuery: (query: string) => void;
  setManualUrl: (url: string) => void;
  setSearchResults: (results: SearchResult[] | ((prev: SearchResult[]) => SearchResult[])) => void;
  setSearchLoading: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  setSearchPage: (page: number) => void;
  setPopularRecipes: (recipes: SearchResult[]) => void;
  setPopularRecipesWarning: (warning: string) => void;
  setError: (error: string) => void;
  onSelectRecipe: (recipe: SearchResult) => void;
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
  searchPage,
  popularRecipes,
  popularRecipesWarning,
  error,
  setInputMode,
  setSearchQuery,
  setManualUrl,
  setSearchResults,
  setSearchLoading,
  setLoadingMore,
  setHasMore,
  setSearchPage,
  setPopularRecipes,
  setPopularRecipesWarning,
  setError,
  onSelectRecipe,
  onLoadFromUrl,
}: SearchInterfaceProps) {
  
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a recipe name");
      return;
    }

    setError("");
    setSearchLoading(true);
    setSearchResults([]);
    setSearchPage(0);
    setHasMore(false);

    try {
      const data = await searchRecipes(searchQuery, 0);
      setSearchResults(data.results);
      setHasMore(data.has_more);

      if (data.results.length === 0) {
        setError("No recipes found. Try a different search term.");
      }
    } catch {
      setError(
        "Could not search for recipes. Please check your connection and try again."
      );
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, setError, setSearchLoading, setSearchResults, setSearchPage, setHasMore]);

  const handleLoadMore = useCallback(async () => {
    const nextPage = searchPage + 1;
    setLoadingMore(true);

    try {
      const data = await searchRecipes(searchQuery, nextPage);
      setSearchResults((prev: SearchResult[]) => [...prev, ...data.results]);
      setSearchPage(nextPage);
      setHasMore(data.has_more);
    } catch {
      setError("Could not load more recipes. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }, [searchPage, searchQuery, setLoadingMore, setSearchResults, setSearchPage, setHasMore, setError]);

  const refreshPopularRecipes = useCallback(async () => {
    try {
      const data = await getPopularRecipes();
      setPopularRecipes(data.recipes);
      setPopularRecipesWarning("");
    } catch (err) {
      console.error("Failed to refresh popular recipes", err);
      setPopularRecipesWarning("Popular recipes are temporarily unavailable.");
    }
  }, [setPopularRecipes, setPopularRecipesWarning]);

  return (
    <>
      <div className={styles.segmentedPicker}>
        <button
          className={`${styles.segmentButton} ${inputMode === "search" ? styles.segmentButtonActive : ""}`}
          onClick={() => setInputMode("search")}
        >
          Search for a recipe
        </button>
        <button
          className={`${styles.segmentButton} ${inputMode === "url" ? styles.segmentButtonActive : ""}`}
          onClick={() => setInputMode("url")}
        >
          Your own recipe
        </button>
      </div>

      {inputMode === "search" && (
        <>
          <SearchInput
            value={searchQuery}
            placeholder="Search for a recipe (e.g., carbonara)"
            isLoading={searchLoading}
            onChange={setSearchQuery}
            onSubmit={handleSearch}
          />

          {searchResults.length > 0 && (
            <div className={styles.searchResults}>
              <p className={styles.resultsCount}>
                {searchResults.length} recipes found
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
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className={styles.loadMoreButton}
                >
                  {loadingMore ? "Loading..." : "Load more results"}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {inputMode === "url" && (
        <SearchInput
          value={manualUrl}
          placeholder="Paste a recipe URL"
          isLoading={searchLoading}
          onChange={setManualUrl}
          onSubmit={onLoadFromUrl}
        />
      )}

      {!searchLoading &&
        searchResults.length === 0 &&
        popularRecipes.length > 0 && (
          <div className={styles.popularRecipes}>
            <h2 className={styles.popularTitle}>Popular recipes</h2>
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