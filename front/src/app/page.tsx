"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./page.module.css";
import {
  PlannedStep,
  SearchResult,
  Timers,
  ExpandedSections,
  InputMode,
} from "@/types";
import {
  searchRecipes,
  getPopularRecipes,
  loadRecipe,
  loadRecipeFromUrl,
  getDomain,
} from "@/services/api";
import {
  ChecklistView,
  RecipeCard,
  RecipeGraph,
  SearchInput,
  SearchInterface,
  RecipeView,
  LoadingState,
} from "@/components";
import { useRecipeState } from "@/hooks/useRecipeState";
import { useTimerState } from "@/hooks/useTimerState";

const LOADING_MESSAGES = [
  "Fetching recipe...",
  "Analyzing ingredients...",
  "Identifying steps...",
  "Building your checklist...",
];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Input mode state
  const [inputMode, setInputMode] = useState<InputMode>("search");
  const [manualUrl, setManualUrl] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Popular recipes state
  const [popularRecipes, setPopularRecipes] = useState<SearchResult[]>([]);
  const [popularRecipesWarning, setPopularRecipesWarning] = useState("");

  // Recipe and timer state using custom hooks
  const [
    {
      selectedRecipe,
      steps,
      completedSteps,
      expandedSections,
      loading,
      error,
      recipeViewMode,
      shareStatus,
    },
    {
      handleSelectRecipe,
      handleLoadFromUrl,
      handleBackToSearch,
      toggleStep,
      toggleSection,
      handleShare,
      setRecipeViewMode,
      setError,
    },
  ] = useRecipeState();

  const [timers, timerCompleted, startTimer, pauseTimer, resetTimer] = useTimerState();

  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Loading message rotation
  useEffect(() => {
    if (!loading) {
      setLoadingMessageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) =>
        prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [loading]);

  // Fetch popular recipes on mount
  useEffect(() => {
    getPopularRecipes()
      .then((data) => {
        setPopularRecipes(data.recipes);
        setPopularRecipesWarning("");
      })
      .catch((err) => {
        console.error("Failed to fetch popular recipes", err);
        setPopularRecipesWarning("Popular recipes are temporarily unavailable.");
      });
  }, []);

  const refreshPopularRecipes = useCallback(() => {
    getPopularRecipes()
      .then((data) => {
        setPopularRecipes(data.recipes);
        setPopularRecipesWarning("");
      })
      .catch((err) => {
        console.error("Failed to refresh popular recipes", err);
        setPopularRecipesWarning("Popular recipes are temporarily unavailable.");
      });
  }, []);

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
      setSearchResults((prev) => [...prev, ...data.results]);
      setSearchPage(nextPage);
      setHasMore(data.has_more);
    } catch {
      setError("Could not load more recipes. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }, [searchPage, searchQuery, setLoadingMore, setSearchResults, setSearchPage, setHasMore, setError]);

  // Show checklist if recipe is loaded
  if (selectedRecipe && steps.length > 0) {
    return (
      <RecipeView
        recipe={selectedRecipe}
        steps={steps}
        completedSteps={completedSteps}
        expandedSections={expandedSections}
        timerCompleted={timerCompleted}
        timers={timers}
        recipeViewMode={recipeViewMode}
        onBackToSearch={handleBackToSearch}
        onToggleStep={toggleStep}
        onStartTimer={startTimer}
        onPauseTimer={pauseTimer}
        onResetTimer={resetTimer}
        onToggleSection={toggleSection}
        onShare={handleShare}
        shareStatus={shareStatus}
        setRecipeViewMode={setRecipeViewMode}
      />
    );
  }

  // Show loading state when fetching recipe
  if (loading) {
    return (
      <LoadingState
        message={LOADING_MESSAGES[loadingMessageIndex]}
        onBackToSearch={handleBackToSearch}
      />
    );
  }

  // Show search interface
  return (
    <div className={styles.appContainer}>
      <header className={styles.appHeader}>
        <h1>
          <span onClick={handleBackToSearch} className={styles.titleLink}>
            Flow Recipe
          </span>
        </h1>
        <p className={styles.subtitle}>
          Turn any recipe into a smart step-by-step guide
        </p>
      </header>

      <SearchInterface
        inputMode={inputMode}
        searchQuery={searchQuery}
        manualUrl={manualUrl}
        searchResults={searchResults}
        searchLoading={searchLoading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        searchPage={searchPage}
        popularRecipes={popularRecipes}
        popularRecipesWarning={popularRecipesWarning}
        error={error}
        setInputMode={setInputMode}
        setSearchQuery={setSearchQuery}
        setManualUrl={setManualUrl}
        setSearchResults={setSearchResults}
        setSearchLoading={setSearchLoading}
        setLoadingMore={setLoadingMore}
        setHasMore={setHasMore}
        setSearchPage={setSearchPage}
        setPopularRecipes={setPopularRecipes}
        setPopularRecipesWarning={setPopularRecipesWarning}
        setError={setError}
        onSelectRecipe={handleSelectRecipe}
        onLoadFromUrl={() => handleLoadFromUrl(manualUrl)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className={styles.appContainer}>
          <header className={styles.appHeader}>
            <h1>
              <span className={styles.titleLink}>Flow Recipe</span>
            </h1>
          </header>
          <div className={styles.loadingContainer}>
            <p className={styles.loadingText}>Loading...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
