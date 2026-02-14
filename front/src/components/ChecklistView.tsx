"use client";

import React from "react";
import styles from "@/app/page.module.css";
import { PlannedStep, Timers, ExpandedSections } from "@/types";
import { StepItem } from "./StepItem";
import { StepSection } from "./StepSection";

interface ChecklistViewProps {
  readySteps: PlannedStep[];
  blockedSteps: PlannedStep[];
  completedStepsList: PlannedStep[];
  expandedSections: ExpandedSections;
  timerCompleted: ReadonlySet<string>;
  timers: Timers;
  getBlockingDeps: (step: PlannedStep) => string[];
  onToggleStep: (stepId: string) => void;
  onStartTimer: (stepId: string, durationMinutes: number) => void;
  onPauseTimer: (stepId: string) => void;
  onResetTimer: (stepId: string, durationMinutes: number) => void;
  onToggleReadySection: () => void;
  onToggleBlockedSection: () => void;
  onToggleCompletedSection: () => void;
}

export function ChecklistView({
  readySteps,
  blockedSteps,
  completedStepsList,
  expandedSections,
  timerCompleted,
  timers,
  getBlockingDeps,
  onToggleStep,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onToggleReadySection,
  onToggleBlockedSection,
  onToggleCompletedSection,
}: ChecklistViewProps) {
  return (
    <div className={styles.checklistContainer}>
      {readySteps.length > 0 && (
        <StepSection
          title="Now"
          subtitle="You can do these steps now. The next steps will appear as you progress in the recipe"
          count={readySteps.length}
          isExpanded={expandedSections.ready}
          onToggle={onToggleReadySection}
        >
          {readySteps.map((step) => (
            <StepItem
              key={step.step_id}
              step={step}
              isCompleted={false}
              isBlocked={false}
              isTimerDone={timerCompleted.has(step.step_id)}
              timer={timers[step.step_id]}
              onToggle={onToggleStep}
              onStartTimer={onStartTimer}
              onPauseTimer={onPauseTimer}
              onResetTimer={onResetTimer}
            />
          ))}
        </StepSection>
      )}

      {blockedSteps.length > 0 && (
        <StepSection
          title="Next up"
          subtitle="You still need to complete other steps to do these"
          count={blockedSteps.length}
          isExpanded={expandedSections.blocked}
          onToggle={onToggleBlockedSection}
        >
          {blockedSteps.map((step) => (
            <StepItem
              key={step.step_id}
              step={step}
              isCompleted={false}
              isBlocked={true}
              isTimerDone={false}
              blockingDeps={getBlockingDeps(step)}
              onToggle={onToggleStep}
              onStartTimer={onStartTimer}
              onPauseTimer={onPauseTimer}
              onResetTimer={onResetTimer}
            />
          ))}
        </StepSection>
      )}

      {completedStepsList.length > 0 && (
        <StepSection
          title="Completed"
          count={completedStepsList.length}
          isExpanded={expandedSections.completed}
          onToggle={onToggleCompletedSection}
        >
          {completedStepsList.map((step) => (
            <StepItem
              key={step.step_id}
              step={step}
              isCompleted={true}
              isBlocked={false}
              isTimerDone={false}
              onToggle={onToggleStep}
              onStartTimer={onStartTimer}
              onPauseTimer={onPauseTimer}
              onResetTimer={onResetTimer}
            />
          ))}
        </StepSection>
      )}

      {readySteps.length === 0 && blockedSteps.length === 0 && (
        <div className={styles.allDone}>All steps completed! Enjoy your meal!</div>
      )}
    </div>
  );
}
