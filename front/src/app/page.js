"use client"; // This is a client component

import styles from "./page.module.css";
import React from "react";

export default function Home() {
  const [inputValue, setInputValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [steps, setSteps] = React.useState([]);
  const [completedSteps, setCompletedSteps] = React.useState(new Set());
  const [expandedSections, setExpandedSections] = React.useState({
    ready: true,
    blocked: false,
    completed: false,
  });

  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://recipe-gannt.onrender.com"
      : "http://127.0.0.1:8000";

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleGenerate = async () => {
    if (!inputValue) {
      setError("Please provide a URL");
      return;
    }

    setError("");
    setLoading(true);
    setCompletedSteps(new Set());

    try {
      const response = await fetch(`${baseUrl}/ganntify_recipe_data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipe_url: inputValue }),
      });

      if (!response.ok) {
        throw new Error("Failed getting the recipe steps");
      }

      const data = await response.json();
      setSteps(data.planned_steps);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  // Helper to get step name by ID
  const getStepName = (stepId) => {
    const step = steps.find((s) => s.step_id === stepId);
    return step ? step.step_name : stepId;
  };

  // Get blocking dependencies for a step
  const getBlockingDeps = (step) => {
    return step.dependencies.filter((depId) => !completedSteps.has(depId));
  };

  const formatDuration = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <div className={styles.appContainer}>
      <header className={styles.appHeader}>
        <h1>Recipe Checklist</h1>
      </header>
      <div className={styles.inputContainer}>
        <input
          type="text"
          placeholder="Enter the URL of a recipe"
          value={inputValue}
          onChange={handleInputChange}
          className={styles.inputField}
        />
        <button
          onClick={handleGenerate}
          disabled={loading}
          className={styles.submitButton}
        >
          {loading ? "Loading..." : "Load Recipe"}
        </button>
      </div>
      {error && <p className={styles.errorMessage}>{error}</p>}

      {steps.length > 0 && (
        <div className={styles.checklistContainer}>
          {/* Progress indicator */}
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

          {/* Ready Steps - Always visible when there are items */}
          {readySteps.length > 0 && (
            <section className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => toggleSection("ready")}
              >
                <span className={styles.sectionTitle}>
                  Next Steps ({readySteps.length})
                </span>
                <span className={styles.chevron}>
                  {expandedSections.ready ? "▼" : "▶"}
                </span>
              </button>
              {expandedSections.ready && (
                <ul className={styles.stepList}>
                  {readySteps.map((step) => (
                    <li key={step.step_id} className={styles.stepItem}>
                      <label className={styles.stepLabel}>
                        <input
                          type="checkbox"
                          checked={false}
                          onChange={() => toggleStep(step.step_id)}
                          className={styles.checkbox}
                        />
                        <span className={styles.stepName}>{step.step_name}</span>
                        <span className={styles.duration}>
                          {formatDuration(step.duration_minute)}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Blocked Steps */}
          {blockedSteps.length > 0 && (
            <section className={styles.section}>
              <button
                className={styles.sectionHeader}
                onClick={() => toggleSection("blocked")}
              >
                <span className={styles.sectionTitle}>
                  Waiting On... ({blockedSteps.length})
                </span>
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
                        <span className={styles.stepName}>{step.step_name}</span>
                        <span className={styles.duration}>
                          {formatDuration(step.duration_minute)}
                        </span>
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

          {/* Completed Steps */}
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
                        <span
                          className={`${styles.stepName} ${styles.completedText}`}
                        >
                          {step.step_name}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* All done message */}
          {readySteps.length === 0 && blockedSteps.length === 0 && (
            <div className={styles.allDone}>
              All steps completed! Enjoy your meal!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
