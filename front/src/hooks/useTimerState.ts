"use client";

import { useState, useEffect, useCallback } from "react";
import { Timers } from "@/types";

export function useTimerState(): [Timers, Set<string>, (stepId: string, durationMinutes: number) => void, (stepId: string) => void, (stepId: string, durationMinutes: number) => void] {
  const [timers, setTimers] = useState<Timers>({});
  const [timerCompleted, setTimerCompleted] = useState<Set<string>>(new Set());

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

  return [timers, timerCompleted, startTimer, pauseTimer, resetTimer];
}