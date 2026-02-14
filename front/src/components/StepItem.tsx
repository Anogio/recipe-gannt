"use client";

import React, { useCallback } from "react";
import styles from "@/app/page.module.css";
import { PlannedStep, TimerState } from "@/types";
import { TimerControls } from "./TimerControls";

interface StepItemProps {
  step: PlannedStep;
  isCompleted: boolean;
  isBlocked: boolean;
  isTimerDone: boolean;
  timer?: TimerState;
  blockingDeps?: string[];
  onToggle: (stepId: string) => void;
  onStartTimer: (stepId: string, durationMinutes: number) => void;
  onPauseTimer: (stepId: string) => void;
  onResetTimer: (stepId: string, durationMinutes: number) => void;
}

export const StepItem = React.memo(function StepItem({
  step,
  isCompleted,
  isBlocked,
  isTimerDone,
  timer,
  blockingDeps,
  onToggle,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
}: StepItemProps) {
  const handleToggle = useCallback(() => {
    onToggle(step.step_id);
  }, [step.step_id, onToggle]);

  const itemClassName = `${styles.stepItem} ${
    isCompleted ? styles.completedItem : ""
  } ${isBlocked ? styles.blockedItem : ""} ${isTimerDone ? styles.timerDone : ""}`;

  if (isBlocked) {
    return (
      <li className={itemClassName}>
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
        {blockingDeps && blockingDeps.length > 0 && (
          <div className={styles.blockingDeps}>
            Waiting for: {blockingDeps.join(", ")}
          </div>
        )}
      </li>
    );
  }

  const remainingSeconds =
    timer?.remainingSeconds ?? (step.duration_minute ?? 0) * 60;

  return (
    <li className={itemClassName}>
      <label className={styles.stepLabel}>
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={handleToggle}
          className={styles.checkbox}
        />
        <div className={styles.stepContent}>
          <span
            className={`${styles.stepName} ${isCompleted ? styles.completedText : ""}`}
          >
            {step.step_name}
          </span>
          {step.ingredients && step.ingredients.length > 0 && (
            <span
              className={`${styles.stepIngredients} ${isCompleted ? styles.completedText : ""}`}
            >
              {step.ingredients.join(", ")}
            </span>
          )}
          {step.duration_minute && !isCompleted && (
            <TimerControls
              stepId={step.step_id}
              durationMinutes={step.duration_minute}
              remainingSeconds={remainingSeconds}
              isRunning={timer?.isRunning ?? false}
              onStart={onStartTimer}
              onPause={onPauseTimer}
              onReset={onResetTimer}
            />
          )}
        </div>
      </label>
    </li>
  );
});
