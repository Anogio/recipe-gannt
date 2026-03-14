"use client";

import React, { useCallback } from "react";
import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n";

interface TimerControlsProps {
  stepId: string;
  durationMinutes: number;
  remainingSeconds: number;
  isRunning: boolean;
  onStart: (stepId: string, durationMinutes: number) => void;
  onPause: (stepId: string) => void;
  onReset: (stepId: string, durationMinutes: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export const TimerControls = React.memo(function TimerControls({
  stepId,
  durationMinutes,
  remainingSeconds,
  isRunning,
  onStart,
  onPause,
  onReset,
}: TimerControlsProps) {
  const { messages } = useI18n();

  const totalSeconds = durationMinutes * 60;
  const progress = (remainingSeconds / totalSeconds) * 100;

  const handleStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onStart(stepId, durationMinutes);
    },
    [stepId, durationMinutes, onStart]
  );

  const handlePause = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onPause(stepId);
    },
    [stepId, onPause]
  );

  const handleReset = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onReset(stepId, durationMinutes);
    },
    [stepId, durationMinutes, onReset]
  );

  return (
    <div className={styles.timerContainer}>
      <div className={styles.timerBar}>
        <div className={styles.timerFill} style={{ width: `${progress}%` }} />
      </div>
      <span className={styles.timerText}>{formatTime(remainingSeconds)}</span>
      {isRunning ? (
        <button
          className={styles.timerButton}
          onClick={handlePause}
          aria-label={messages.timer.pause}
        >
          ❚❚
        </button>
      ) : (
        <button
          className={styles.timerButton}
          onClick={handleStart}
          aria-label={messages.timer.start}
        >
          ▶
        </button>
      )}
      {remainingSeconds < totalSeconds && (
        <button
          className={styles.timerResetButton}
          onClick={handleReset}
          aria-label={messages.timer.reset}
        >
          ↺
        </button>
      )}
    </div>
  );
});
