"use client"; // This is a client component

import styles from "./page.module.css";
import React from "react";

const LOADING_MESSAGES = [
  "Fetching recipe...",
  "Analyzing ingredients...",
  "Identifying steps...",
  "Building your checklist...",
];

export default function Home() {
  // Input mode state
  const [inputMode, setInputMode] = React.useState("search"); // "search" or "url"
  const [manualUrl, setManualUrl] = React.useState("");

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [selectedRecipe, setSelectedRecipe] = React.useState(null);
  const [searchPage, setSearchPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);

  // Popular recipes state
  const [popularRecipes, setPopularRecipes] = React.useState([]);

  // Checklist state
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [steps, setSteps] = React.useState([]);
  const [completedSteps, setCompletedSteps] = React.useState(new Set());
  const [expandedSections, setExpandedSections] = React.useState({
    ready: true,
    blocked: false,
    completed: false,
  });
  const [loadingMessageIndex, setLoadingMessageIndex] = React.useState(0);

  // Timer state: { [stepId]: { remainingSeconds, isRunning } }
  const [timers, setTimers] = React.useState({});
  // Steps where timer has completed (for highlighting)
  const [timerCompleted, setTimerCompleted] = React.useState(new Set());

  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://recipe-gannt.onrender.com"
      : "http://127.0.0.1:8000";

  React.useEffect(() => {
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
  React.useEffect(() => {
    const runningTimers = Object.entries(timers).filter(
      ([, timer]) => timer.isRunning && timer.remainingSeconds > 0
    );

    if (runningTimers.length === 0) return;

    const interval = setInterval(() => {
      setTimers((prev) => {
        const updated = { ...prev };
        for (const [stepId, timer] of Object.entries(updated)) {
          if (timer.isRunning && timer.remainingSeconds > 0) {
            updated[stepId] = {
              ...timer,
              remainingSeconds: timer.remainingSeconds - 1,
            };
            // Mark as completed when reaching 0
            if (timer.remainingSeconds - 1 === 0) {
              updated[stepId].isRunning = false;
              setTimerCompleted((prev) => new Set(prev).add(stepId));
            }
          }
        }
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timers]);

  // Fetch popular recipes on mount
  React.useEffect(() => {
    fetch(`${baseUrl}/popular_recipes`)
      .then((res) => (res.ok ? res.json() : { recipes: [] }))
      .then((data) => setPopularRecipes(data.recipes))
      .catch(() => {});
  }, [baseUrl]);

  // Helper to refresh popular recipes
  const refreshPopularRecipes = () => {
    fetch(`${baseUrl}/popular_recipes`)
      .then((res) => (res.ok ? res.json() : { recipes: [] }))
      .then((data) => setPopularRecipes(data.recipes))
      .catch(() => {});
  };

  const handleSearch = async () => {
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
      const response = await fetch(
        `${baseUrl}/search_recipes?query=${encodeURIComponent(searchQuery)}&page=0`
      );

      if (!response.ok) {
        throw new Error("Failed to search recipes");
      }

      const data = await response.json();
      setSearchResults(data.results);
      setHasMore(data.has_more);

      if (data.results.length === 0) {
        setError("No recipes found. Try a different search term.");
      }
    } catch (err) {
      setError("Could not search for recipes. Please check your connection and try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleLoadMore = async () => {
    const nextPage = searchPage + 1;
    setLoadingMore(true);

    try {
      const response = await fetch(
        `${baseUrl}/search_recipes?query=${encodeURIComponent(searchQuery)}&page=${nextPage}`
      );

      if (!response.ok) {
        throw new Error("Failed to load more recipes");
      }

      const data = await response.json();
      setSearchResults((prev) => [...prev, ...data.results]);
      setSearchPage(nextPage);
      setHasMore(data.has_more);
    } catch (err) {
      setError("Could not load more recipes. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSelectRecipe = async (recipe) => {
    setSelectedRecipe(recipe);
    setSearchResults([]);
    setError("");
    setLoading(true);
    setCompletedSteps(new Set());

    try {
      const response = await fetch(`${baseUrl}/ganntify_recipe_data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipe_url: recipe.url,
          title: recipe.title,
          snippet: recipe.snippet,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to load recipe steps");
      }

      const data = await response.json();
      setSteps(data.planned_steps);
      refreshPopularRecipes();
    } catch (err) {
      setError("Could not load this recipe. The website may not be supported.");
      setSelectedRecipe(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSearch = () => {
    setSelectedRecipe(null);
    setSteps([]);
    setCompletedSteps(new Set());
    setError("");
  };

  const toggleStep = (stepId) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Categorize steps
  const readySteps = steps.filter(
    (step) =>
      !completedSteps.has(step.step_id) &&
      step.dependencies.every((depId) => completedSteps.has(depId))
  );

  const blockedSteps = steps.filter(
    (step) =>
      !completedSteps.has(step.step_id) &&
      !step.dependencies.every((depId) => completedSteps.has(depId))
  );

  const completedStepsList = steps.filter((step) =>
    completedSteps.has(step.step_id)
  );

  const getStepName = (stepId) => {
    const step = steps.find((s) => s.step_id === stepId);
    return step ? step.step_name : stepId;
  };

  const getBlockingDeps = (step) => {
    return step.dependencies.filter((depId) => !completedSteps.has(depId));
  };

  // Format seconds to mm:ss display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start or resume a timer
  const startTimer = (stepId, durationMinutes) => {
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
  };

  // Pause a timer
  const pauseTimer = (stepId) => {
    setTimers((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], isRunning: false },
    }));
  };

  // Reset a timer
  const resetTimer = (stepId, durationMinutes) => {
    setTimerCompleted((prev) => {
      const newSet = new Set(prev);
      newSet.delete(stepId);
      return newSet;
    });
    setTimers((prev) => ({
      ...prev,
      [stepId]: { remainingSeconds: durationMinutes * 60, isRunning: false },
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      if (inputMode === "search") {
        handleSearch();
      } else {
        handleLoadFromUrl();
      }
    }
  };

  const handleLoadFromUrl = async () => {
    if (!manualUrl.trim()) {
      setError("Please enter a recipe URL");
      return;
    }

    setError("");
    setLoading(true);
    setCompletedSteps(new Set());

    const url = manualUrl.trim();

    try {
      const response = await fetch(`${baseUrl}/ganntify_recipe_data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipe_url: url }),
      });

      if (!response.ok) {
        throw new Error("Failed to load recipe steps");
      }

      const data = await response.json();
      setSteps(data.planned_steps);
      setSelectedRecipe({
        title: getDomain(url),
        url: url,
      });
      refreshPopularRecipes();
    } catch (err) {
      setError("Could not load this recipe. The website may not be supported.");
    } finally {
      setLoading(false);
    }
  };

  const getDomain = (url) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

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
            <span className={styles.recipeSource}>{getDomain(selectedRecipe.url)}</span>
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

          {readySteps.length > 0 && (
            <section className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => toggleSection("ready")}
              >
                <div className={styles.sectionTitleContainer}>
                  <span className={styles.sectionTitle}>
                    Now ({readySteps.length})
                  </span>
                  <span className={styles.sectionSubtitle}>
                    You can do these steps now. The next steps will appear as you progress in the recipe
                  </span>
                </div>
                <span className={styles.chevron}>
                  {expandedSections.ready ? "▼" : "▶"}
                </span>
              </button>
              {expandedSections.ready && (
                <ul className={styles.stepList}>
                  {readySteps.map((step) => (
                    <li
                      key={step.step_id}
                      className={`${styles.stepItem} ${timerCompleted.has(step.step_id) ? styles.timerDone : ''}`}
                    >
                      <label className={styles.stepLabel}>
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => toggleStep(step.step_id)}
                          className={styles.checkbox}
                        />
                        <div className={styles.stepContent}>
                          <span className={styles.stepName}>{step.step_name}</span>
                          {step.ingredients && step.ingredients.length > 0 && (
                            <span className={styles.stepIngredients}>
                              {step.ingredients.join(", ")}
                            </span>
                          )}
                          {step.duration_minute && (
                            <div className={styles.timerContainer}>
                              <div className={styles.timerBar}>
                                <div
                                  className={styles.timerFill}
                                  style={{
                                    width: `${((timers[step.step_id]?.remainingSeconds ?? step.duration_minute * 60) / (step.duration_minute * 60)) * 100}%`,
                                  }}
                                />
                              </div>
                              <span className={styles.timerText}>
                                {formatTime(timers[step.step_id]?.remainingSeconds ?? step.duration_minute * 60)}
                              </span>
                              {timers[step.step_id]?.isRunning ? (
                                <button
                                  className={styles.timerButton}
                                  onClick={(e) => { e.preventDefault(); pauseTimer(step.step_id); }}
                                  aria-label="Pause timer"
                                >
                                  ❚❚
                                </button>
                              ) : (
                                <button
                                  className={styles.timerButton}
                                  onClick={(e) => { e.preventDefault(); startTimer(step.step_id, step.duration_minute); }}
                                  aria-label="Start timer"
                                >
                                  ▶
                                </button>
                              )}
                              {timers[step.step_id] && (
                                <button
                                  className={styles.timerResetButton}
                                  onClick={(e) => { e.preventDefault(); resetTimer(step.step_id, step.duration_minute); }}
                                  aria-label="Reset timer"
                                >
                                  ↺
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {blockedSteps.length > 0 && (
            <section className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => toggleSection("blocked")}
              >
                <div className={styles.sectionTitleContainer}>
                  <span className={styles.sectionTitle}>
                    Next up ({blockedSteps.length})
                  </span>
                  <span className={styles.sectionSubtitle}>
                    You still need to complete other steps to do these
                  </span>
                </div>
                <span className={styles.chevron}>
                  {expandedSections.blocked ? "▼" : "▶"}
                </span>
              </button>
              {expandedSections.blocked && (
                <ul className={styles.stepList}>
                  {blockedSteps.map((step) => (
                    <li
                      key={step.step_id}
                      className={`${styles.stepItem} ${styles.blockedItem}`}
                    >
                      <div className={styles.blockedStep}>
                        <div className={styles.stepContent}>
                          <span className={styles.stepName}>{step.step_name}</span>
                          {step.ingredients && step.ingredients.length > 0 && (
                            <span className={styles.stepIngredients}>
                              {step.ingredients.join(", ")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.blockingDeps}>
                        Waiting for:{" "}
                        {getBlockingDeps(step)
                          .map((depId) => getStepName(depId))
                          .join(", ")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {completedStepsList.length > 0 && (
            <section className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => toggleSection("completed")}
              >
                <span className={styles.sectionTitle}>
                  Completed ({completedStepsList.length})
                </span>
                <span className={styles.chevron}>
                  {expandedSections.completed ? "▼" : "▶"}
                </span>
              </button>
              {expandedSections.completed && (
                <ul className={styles.stepList}>
                  {completedStepsList.map((step) => (
                    <li
                      key={step.step_id}
                      className={`${styles.stepItem} ${styles.completedItem}`}
                    >
                      <label className={styles.stepLabel}>
                        <input
                          type="checkbox"
                          checked={true}
                          onChange={() => toggleStep(step.step_id)}
                          className={styles.checkbox}
                        />
                        <div className={styles.stepContent}>
                          <span
                            className={`${styles.stepName} ${styles.completedText}`}
                          >
                            {step.step_name}
                          </span>
                          {step.ingredients && step.ingredients.length > 0 && (
                            <span className={`${styles.stepIngredients} ${styles.completedText}`}>
                              {step.ingredients.join(", ")}
                            </span>
                          )}
                        </div>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {readySteps.length === 0 && blockedSteps.length === 0 && (
            <div className={styles.allDone}>
              All steps completed! Enjoy your meal!
            </div>
          )}
        </div>
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
          <p className={styles.loadingText}>{LOADING_MESSAGES[loadingMessageIndex]}</p>
        </div>
      </div>
    );
  }

  // Show search interface
  return (
    <div className={styles.appContainer}>
      <header className={styles.appHeader}>
        <h1>Flow Recipe</h1>
        <p className={styles.subtitle}>Turn any recipe into a smart step-by-step guide</p>
      </header>

      {/* Segmented picker */}
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

      {/* Search mode */}
      {inputMode === "search" && (
        <>
          <div className={styles.inputContainer}>
            <input
              type="text"
              placeholder="Search for a recipe (e.g., carbonara)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className={styles.inputField}
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading}
              className={styles.submitButton}
              aria-label="Search"
            >
              {searchLoading ? <span className={styles.spinner} /> : "→"}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div className={styles.searchResults}>
              <p className={styles.resultsCount}>
                {searchResults.length} recipes found
              </p>
              <ul className={styles.resultsList}>
                {searchResults.map((result, index) => (
                  <li key={index} className={styles.resultItem}>
                    <div className={styles.resultContent}>
                      <button
                        className={styles.resultButton}
                        onClick={() => handleSelectRecipe(result)}
                      >
                        <span className={styles.resultTitle}>{result.title}</span>
                        <span className={styles.resultSource}>{getDomain(result.url)}</span>
                        <span className={styles.resultSnippet}>{result.snippet}</span>
                      </button>
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.resultOriginalLink}
                        onClick={(e) => e.stopPropagation()}
                      >
                        View original
                      </a>
                    </div>
                  </li>
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

      {/* URL mode */}
      {inputMode === "url" && (
        <div className={styles.inputContainer}>
          <input
            type="text"
            placeholder="Paste a recipe URL"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            onKeyPress={handleKeyPress}
            className={styles.inputField}
          />
          <button
            onClick={handleLoadFromUrl}
            disabled={loading}
            className={styles.submitButton}
            aria-label="Load recipe"
          >
            {loading ? <span className={styles.spinner} /> : "→"}
          </button>
        </div>
      )}

      {/* Popular recipes - show in empty state */}
      {!searchLoading && searchResults.length === 0 && popularRecipes.length > 0 && (
        <div className={styles.popularRecipes}>
          <h2 className={styles.popularTitle}>Popular recipes</h2>
          <ul className={styles.resultsList}>
            {popularRecipes.slice(0, 10).map((recipe, index) => (
              <li key={`${recipe.url}-${index}`} className={styles.resultItem}>
                <div className={styles.resultContent}>
                  <button
                    className={styles.resultButton}
                    onClick={() => handleSelectRecipe(recipe)}
                  >
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    View original
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className={styles.errorMessage}>{error}</p>}
    </div>
  );
}
