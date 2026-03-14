"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";
import { SearchResult, InputMode } from "@/types";
import { getPopularRecipes, searchRecipes } from "@/services/api";
import { APP_NAME, useI18n } from "@/i18n";
import { LanguageSwitcher, LoadingState, RecipeView, SearchInterface } from "@/components";
import { useRecipeState } from "@/hooks/useRecipeState";
import { useTimerState } from "@/hooks/useTimerState";

function HomeContent() {
  const { locale, messages } = useI18n();

  const [inputMode, setInputMode] = useState<InputMode>("search");
  const [manualUrl, setManualUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [popularRecipes, setPopularRecipes] = useState<SearchResult[]>([]);
  const [popularRecipesWarning, setPopularRecipesWarning] = useState("");

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

  const [timers, timerCompleted, startTimer, pauseTimer, resetTimer] =
    useTimerState();
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const loadingMessages = messages.loading.messages;

  useEffect(() => {
    if (!loading) {
      setLoadingMessageIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingMessageIndex((prev) =>
        prev < loadingMessages.length - 1 ? prev + 1 : prev
      );
    }, 5000);

    return () => window.clearInterval(interval);
  }, [loading, loadingMessages]);

  useEffect(() => {
    getPopularRecipes()
      .then((data) => {
        setPopularRecipes(data.recipes);
        setPopularRecipesWarning("");
      })
      .catch((err) => {
        console.error("Failed to fetch popular recipes", err);
        setPopularRecipesWarning(messages.search.popularUnavailable);
      });
  }, [messages.search.popularUnavailable]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError(messages.search.emptyQueryError);
      return;
    }

    setError("");
    setSearchLoading(true);
    setSearchResults([]);
    setSearchPage(0);
    setHasMore(false);

    try {
      const data = await searchRecipes(searchQuery, locale, 0);
      setSearchResults(data.results);
      setHasMore(data.has_more);

      if (data.results.length === 0) {
        setError(messages.search.noResults);
      }
    } catch {
      setError(messages.search.searchError);
    } finally {
      setSearchLoading(false);
    }
  }, [
    locale,
    messages.search.emptyQueryError,
    messages.search.noResults,
    messages.search.searchError,
    searchQuery,
    setError,
  ]);

  const handleLoadMore = useCallback(async () => {
    const nextPage = searchPage + 1;
    setLoadingMore(true);

    try {
      const data = await searchRecipes(searchQuery, locale, nextPage);
      setSearchResults((prev) => [...prev, ...data.results]);
      setSearchPage(nextPage);
      setHasMore(data.has_more);
    } catch {
      setError(messages.search.loadMoreError);
    } finally {
      setLoadingMore(false);
    }
  }, [locale, messages.search.loadMoreError, searchPage, searchQuery, setError]);

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

  if (loading) {
    return (
      <LoadingState
        message={loadingMessages[loadingMessageIndex] ?? messages.loading.fallback}
        onBackToSearch={handleBackToSearch}
      />
    );
  }

  return (
    <div className={styles.appContainer}>
      <header className={styles.appHeader}>
        <div className={styles.headerTopRow}>
          <LanguageSwitcher />
        </div>
        <h1>
          <span onClick={handleBackToSearch} className={styles.titleLink}>
            {APP_NAME}
          </span>
        </h1>
        <p className={styles.subtitle}>{messages.home.subtitle}</p>
      </header>

      <SearchInterface
        inputMode={inputMode}
        searchQuery={searchQuery}
        manualUrl={manualUrl}
        searchResults={searchResults}
        searchLoading={searchLoading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        popularRecipes={popularRecipes}
        popularRecipesWarning={popularRecipesWarning}
        error={error}
        setInputMode={setInputMode}
        setSearchQuery={setSearchQuery}
        setManualUrl={setManualUrl}
        onSelectRecipe={handleSelectRecipe}
        onSearch={handleSearch}
        onLoadMore={handleLoadMore}
        onLoadFromUrl={() => handleLoadFromUrl(manualUrl)}
      />
    </div>
  );
}

function HomeFallback() {
  const { messages } = useI18n();

  return (
    <div className={styles.appContainer}>
      <header className={styles.appHeader}>
        <div className={styles.headerTopRow}>
          <LanguageSwitcher />
        </div>
        <h1>
          <span className={styles.titleLink}>{APP_NAME}</span>
        </h1>
      </header>
      <div className={styles.loadingContainer}>
        <p className={styles.loadingText}>{messages.loading.fallback}</p>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}
