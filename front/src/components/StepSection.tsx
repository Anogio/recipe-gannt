"use client";

import React, { useCallback } from "react";
import styles from "@/app/page.module.css";

interface StepSectionProps {
  title: string;
  subtitle?: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const StepSection = React.memo(function StepSection({
  title,
  subtitle,
  count,
  isExpanded,
  onToggle,
  children,
}: StepSectionProps) {
  return (
    <section className={styles.section}>
      <button className={styles.sectionHeader} onClick={onToggle}>
        <div className={styles.sectionTitleContainer}>
          <span className={styles.sectionTitle}>
            {title} ({count})
          </span>
          {subtitle && (
            <span className={styles.sectionSubtitle}>{subtitle}</span>
          )}
        </div>
        <span className={styles.chevron}>{isExpanded ? "▼" : "▶"}</span>
      </button>
      {isExpanded && <ul className={styles.stepList}>{children}</ul>}
    </section>
  );
});
