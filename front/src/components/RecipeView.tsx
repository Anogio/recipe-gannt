"use client";

import React, { useCallback, useMemo } from "react";
import { PlannedStep, SearchResult, Timers, ExpandedSections } from "@/types";
import { APP_NAME, useI18n } from "@/i18n";
import { ChecklistView, LanguageSwitcher, RecipeGraph } from "@/components";
import { getDomain } from "@/services/api";
import styles from "@/app/page.module.css";

interface RecipeViewProps {
  recipe: SearchResult;
  steps: PlannedStep[];
  completedSteps: Set<string>;
  expandedSections: ExpandedSections;
  timerCompleted: Set<string>;
  timers: Timers;
  recipeViewMode: "checklist" | "graph";
  onBackToSearch: () => void;
  onToggleStep: (stepId: string) => void;
  onStartTimer: (stepId: string, durationMinutes: number) => void;
  onPauseTimer: (stepId: string) => void;
  onResetTimer: (stepId: string, durationMinutes: number) => void;
  onToggleSection: (section: keyof ExpandedSections) => void;
  onShare: () => void;
  shareStatus: "idle" | "copied";
  setRecipeViewMode: (mode: "checklist" | "graph") => void;
}

export function RecipeView({
  recipe,
  steps,
  completedSteps,
  expandedSections,
  timerCompleted,
  timers,
  recipeViewMode,
  onBackToSearch,
  onToggleStep,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onToggleSection,
  onShare,
  shareStatus,
  setRecipeViewMode,
}: RecipeViewProps) {
  const { messages } = useI18n();

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

  const getStepName = useCallback(
    (stepId: string): string => {
      const step = steps.find((s) => s.step_id === stepId);
      return step ? step.step_name : stepId;
    },
    [steps]
  );

  const getBlockingDeps = useCallback(
    (step: PlannedStep): string[] => {
      return step.dependencies
        .filter((depId) => !completedSteps.has(depId))
        .map((depId) => getStepName(depId));
    },
    [completedSteps, getStepName]
  );

  const progressPercentage = Math.round(
    (completedSteps.size / steps.length) * 100
  );

  return (
    <div className={styles.appContainer}>
      <header className={styles.appHeader}>
        <div className={styles.headerTopRow}>
          <LanguageSwitcher />
        </div>
        <h1>
          <span onClick={onBackToSearch} className={styles.titleLink}>
            {APP_NAME}
          </span>
        </h1>
      </header>

      <div className={styles.selectedRecipe}>
        <div className={styles.selectedRecipeInfo}>
          <span className={styles.recipeName}>{recipe.title}</span>
          <span className={styles.recipeSource}>{getDomain(recipe.url)}</span>
          <span className={styles.aiDisclaimer}>{messages.recipe.aiDisclaimer}</span>
        </div>
        <div className={styles.selectedRecipeActions}>
          <button onClick={onShare} className={styles.shareButton}>
            {shareStatus === "copied"
              ? messages.recipe.copied
              : messages.recipe.share}
          </button>
          <a
            href={recipe.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.originalLink}
          >
            {messages.recipe.viewOriginal}
          </a>
          <button onClick={onBackToSearch} className={styles.backButton}>
            {messages.recipe.selectAnother}
          </button>
        </div>
      </div>

      <div className={styles.checklistContainer}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className={styles.progressText}>
          {messages.recipe.progressText(completedSteps.size, steps.length)}
        </p>
      </div>

      <div className={styles.segmentedPicker}>
        <button
          className={`${styles.segmentButton} ${
            recipeViewMode === "checklist" ? styles.segmentButtonActive : ""
          }`}
          onClick={() => setRecipeViewMode("checklist")}
        >
          {messages.recipe.checklist}
        </button>
        <button
          className={`${styles.segmentButton} ${
            recipeViewMode === "graph" ? styles.segmentButtonActive : ""
          }`}
          onClick={() => setRecipeViewMode("graph")}
        >
          {messages.recipe.graph}
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
          onToggleStep={onToggleStep}
          onStartTimer={onStartTimer}
          onPauseTimer={onPauseTimer}
          onResetTimer={onResetTimer}
          onToggleReadySection={() => onToggleSection("ready")}
          onToggleBlockedSection={() => onToggleSection("blocked")}
          onToggleCompletedSection={() => onToggleSection("completed")}
        />
      ) : (
        <RecipeGraph
          steps={steps}
          completedSteps={completedSteps}
          onToggleStep={onToggleStep}
        />
      )}
    </div>
  );
}
