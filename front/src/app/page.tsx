"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
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
} from "@/components";

const LOADING_MESSAGES = [
  "Fetching recipe...",
  "Analyzing ingredients...",
  "Identifying steps...",
  "Building your checklist...",
];

export default function Home() {
  // Input mode state
  const [inputMode, setInputMode] = useState<InputMode>("search");
  const [manualUrl, setManualUrl] = useState("");
  const [recipeViewMode, setRecipeViewMode] = useState<"checklist" | "graph">(
    "checklist"
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<SearchResult | null>(
    null
  );
  const [searchPage, setSearchPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Popular recipes state
  const [popularRecipes, setPopularRecipes] = useState<SearchResult[]>([]);

  // Checklist state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState<PlannedStep[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    ready: true,
    blocked: false,
    completed: false,
  });
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Timer state
  const [timers, setTimers] = useState<Timers>({});
  const [timerCompleted, setTimerCompleted] = useState<Set<string>>(new Set());

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

  // Timer countdown effect
  useEffect(() => {
    const runningTimers = Object.entries(timers).filter(
      ([, timer]) => timer.isRunning && timer.remainingSeconds > 0
    );

    if (runningTimers.length === 0) return;

    const interval = setInterval(() => {
      setTimers((prev) => {
        const updated = { ...prev };
        let hasChanges = false;

        for (const [stepId, timer] of Object.entries(updated)) {
          if (timer.isRunning && timer.remainingSeconds > 0) {
            hasChanges = true;
            updated[stepId] = {
              ...timer,
              remainingSeconds: timer.remainingSeconds - 1,
            };
            if (timer.remainingSeconds - 1 === 0) {
              updated[stepId].isRunning = false;
              setTimerCompleted((prev) => new Set(prev).add(stepId));
            }
          }
        }

        return hasChanges ? updated : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timers]);

  // Fetch popular recipes on mount
  useEffect(() => {
    getPopularRecipes()
      .then((data) => setPopularRecipes(data.recipes))
      .catch(() => {});
  }, []);

  // Helper to refresh popular recipes
  const refreshPopularRecipes = useCallback(() => {
    getPopularRecipes()
      .then((data) => setPopularRecipes(data.recipes))
      .catch(() => {});
  }, []);

  // Search handlers
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
  }, [searchQuery]);

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
  }, [searchPage, searchQuery]);

  const handleSelectRecipe = useCallback(
    async (recipe: SearchResult) => {
      setSelectedRecipe(recipe);
      setRecipeViewMode("checklist");
      setSearchResults([]);
      setError("");
      setLoading(true);
      setCompletedSteps(new Set());
      setTimers({});
      setTimerCompleted(new Set());

      try {
        const data = await loadRecipe(recipe);
        setSteps(data.planned_steps);
        refreshPopularRecipes();
      } catch {
        setError(
          "Could not load this recipe. The website may not be supported."
        );
        setSelectedRecipe(null);
      } finally {
        setLoading(false);
      }
    },
    [refreshPopularRecipes]
  );

  const handleLoadFromUrl = useCallback(async () => {
    if (!manualUrl.trim()) {
      setError("Please enter a recipe URL");
      return;
    }

    setError("");
    setLoading(true);
    setCompletedSteps(new Set());
    setTimers({});
    setTimerCompleted(new Set());

    const url = manualUrl.trim();

    try {
      const data = await loadRecipeFromUrl(url);
      setSteps(data.planned_steps);
      setRecipeViewMode("checklist");
      setSelectedRecipe({
        title: getDomain(url),
        url: url,
        snippet: "",
      });
      refreshPopularRecipes();
    } catch {
      setError(
        "Could not load this recipe. The website may not be supported."
      );
    } finally {
      setLoading(false);
    }
  }, [manualUrl, refreshPopularRecipes]);

  const handleBackToSearch = useCallback(() => {
    setSelectedRecipe(null);
    setRecipeViewMode("checklist");
    setSteps([]);
    setCompletedSteps(new Set());
    setTimers({});
    setTimerCompleted(new Set());
    setError("");
  }, []);

  // Step handlers
  const toggleStep = useCallback((stepId: string) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  }, []);

  const toggleSection = useCallback((section: keyof ExpandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // Timer handlers
  const startTimer = useCallback((stepId: string, durationMinutes: number) => {
    setTimerCompleted((prev) => {
      const newSet = new Set(prev);
      newSet.delete(stepId);
      return newSet;
    });
    setTimers((prev) => ({
      ...prev,
      [stepId]: {
        remainingSeconds: prev[stepId]?.remainingSeconds ?? durationMinutes * 60,
        isRunning: true,
      },
    }));
  }, []);

  const pauseTimer = useCallback((stepId: string) => {
    setTimers((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], isRunning: false },
    }));
  }, []);

  const resetTimer = useCallback((stepId: string, durationMinutes: number) => {
    setTimerCompleted((prev) => {
      const newSet = new Set(prev);
      newSet.delete(stepId);
      return newSet;
    });
    setTimers((prev) => ({
      ...prev,
      [stepId]: { remainingSeconds: durationMinutes * 60, isRunning: false },
    }));
  }, []);

  // Memoized categorized steps
  const readySteps = useMemo(
    () =>
      steps.filter(
        (step) =>
          !completedSteps.has(step.step_id) &&
          step.dependencies.every((depId) => completedSteps.has(depId))
      ),
    [steps, completedSteps]
  );

  const blockedSteps = useMemo(
    () =>
      steps.filter(
        (step) =>
          !completedSteps.has(step.step_id) &&
          !step.dependencies.every((depId) => completedSteps.has(depId))
      ),
    [steps, completedSteps]
  );

  const completedStepsList = useMemo(
    () => steps.filter((step) => completedSteps.has(step.step_id)),
    [steps, completedSteps]
  );

  // Helper to get step name
  const getStepName = useCallback(
    (stepId: string): string => {
      const step = steps.find((s) => s.step_id === stepId);
      return step ? step.step_name : stepId;
    },
    [steps]
  );

  // Helper to get blocking dependencies names
  const getBlockingDeps = useCallback(
    (step: PlannedStep): string[] => {
      return step.dependencies
        .filter((depId) => !completedSteps.has(depId))
        .map((depId) => getStepName(depId));
    },
    [completedSteps, getStepName]
  );

  // Section toggle handlers
  const toggleReadySection = useCallback(
    () => toggleSection("ready"),
    [toggleSection]
  );
  const toggleBlockedSection = useCallback(
    () => toggleSection("blocked"),
    [toggleSection]
  );
  const toggleCompletedSection = useCallback(
    () => toggleSection("completed"),
    [toggleSection]
  );

  // Show checklist if recipe is loaded
  if (selectedRecipe && steps.length > 0) {
    return (
      <div className={styles.appContainer}>
        <header className={styles.appHeader}>
          <h1>Flow Recipe</h1>
        </header>

        <div className={styles.selectedRecipe}>
          <div className={styles.selectedRecipeInfo}>
            <span className={styles.recipeName}>{selectedRecipe.title}</span>
            <span className={styles.recipeSource}>
              {getDomain(selectedRecipe.url)}
            </span>
          </div>
          <div className={styles.selectedRecipeActions}>
            <a
              href={selectedRecipe.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.originalLink}
            >
              View original
            </a>
            <button onClick={handleBackToSearch} className={styles.backButton}>
              Select another recipe
            </button>
          </div>
        </div>

        <div className={styles.checklistContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${(completedSteps.size / steps.length) * 100}%`,
              }}
            />
          </div>
          <p className={styles.progressText}>
            {completedSteps.size} of {steps.length} steps completed
          </p>
        </div>

        <div className={styles.segmentedPicker}>
          <button
            className={`${styles.segmentButton} ${recipeViewMode === "checklist" ? styles.segmentButtonActive : ""}`}
            onClick={() => setRecipeViewMode("checklist")}
          >
            Checklist
          </button>
          <button
            className={`${styles.segmentButton} ${recipeViewMode === "graph" ? styles.segmentButtonActive : ""}`}
            onClick={() => setRecipeViewMode("graph")}
          >
            Graph
          </button>
        </div>

        {recipeViewMode === "checklist" ? (
          <ChecklistView
            readySteps={readySteps}
            blockedSteps={blockedSteps}
            completedStepsList={completedStepsList}
            expandedSections={expandedSections}
            timerCompleted={timerCompleted}
            timers={timers}
            getBlockingDeps={getBlockingDeps}
            onToggleStep={toggleStep}
            onStartTimer={startTimer}
            onPauseTimer={pauseTimer}
            onResetTimer={resetTimer}
            onToggleReadySection={toggleReadySection}
            onToggleBlockedSection={toggleBlockedSection}
            onToggleCompletedSection={toggleCompletedSection}
          />
        ) : (
          <RecipeGraph
            steps={steps}
            completedSteps={completedSteps}
            onToggleStep={toggleStep}
          />
        )}
      </div>
    );
  }

  // Show loading state when fetching recipe
  if (loading) {
    return (
      <div className={styles.appContainer}>
        <header className={styles.appHeader}>
          <h1>Flow Recipe</h1>
        </header>
        <div className={styles.loadingContainer}>
          <p className={styles.loadingText}>
            {LOADING_MESSAGES[loadingMessageIndex]}
          </p>
        </div>
      </div>
    );
  }

  // Show search interface
  return (
    <div className={styles.appContainer}>
      <header className={styles.appHeader}>
        <h1>Flow Recipe</h1>
        <p className={styles.subtitle}>
          Turn any recipe into a smart step-by-step guide
        </p>
      </header>

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
                    onSelect={handleSelectRecipe}
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
          isLoading={loading}
          onChange={setManualUrl}
          onSubmit={handleLoadFromUrl}
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
                  onSelect={handleSelectRecipe}
                />
              ))}
            </ul>
          </div>
        )}

      {error && <p className={styles.errorMessage}>{error}</p>}
    </div>
  );
}
