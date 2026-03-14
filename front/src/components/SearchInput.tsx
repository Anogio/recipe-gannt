"use client";

import React, { useCallback } from "react";
import styles from "@/app/page.module.css";
import { useI18n } from "@/i18n";

interface SearchInputProps {
  value: string;
  placeholder: string;
  isLoading: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export const SearchInput = React.memo(function SearchInput({
  value,
  placeholder,
  isLoading,
  onChange,
  onSubmit,
}: SearchInputProps) {
  const { messages } = useI18n();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        onSubmit();
      }
    },
    [onSubmit]
  );

  return (
    <div className={styles.inputContainer}>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={styles.inputField}
      />
      <button
        onClick={onSubmit}
        disabled={isLoading}
        className={styles.submitButton}
        aria-label={messages.search.submit}
      >
        {isLoading ? <span className={styles.spinner} /> : "→"}
      </button>
    </div>
  );
});
