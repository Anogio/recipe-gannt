"use client"; // This is a client component

import styles from "./page.module.css";
import React from "react";
import { Chart } from "react-google-charts";

export default function Home() {
  const [inputValue, setInputValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [ganntData, setGanntData] = React.useState([]);

  const ganntColumns = [
    { type: "string", label: "Task ID" },
    { type: "string", label: "Task Name" },
    { type: "date", label: "Start Date" },
    { type: "date", label: "End Date" },
    { type: "number", label: "Duration" },
    { type: "number", label: "Percent Complete" },
    { type: "string", label: "Dependencies" },
  ];

  const ganntOptions = {
    height: 1000,
    gantt: {
      defaultStartDateMillis: new Date("2000-01-01T00:00:00.000Z"),
    },
  };

  const ganntFormattedData = ganntData.map((step) => [
    step.step_id,
    step.step_name,
    null,
    null,
    step.duration_minute * 1000 * 60,
    100,
    step.dependencies.join(","),
  ]);

  const baseUrl =
    process.env.NODE_ENV === "production"
      ? "https://recipe-gannt.onrender.com"
      : "http://127.0.0.1:8000";

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleDownload = async () => {
    if (!inputValue) {
      setError("Please provide a URL");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${baseUrl}/ganntify_recipe_data`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipe_url: inputValue }),
      });

      if (!response.ok) {
        throw new Error("Failed getting the graph");
      }

      const data = await response.json();
      setGanntData(data.planned_steps);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.appContainer}>
      <header className={styles.appHeader}>
        <h1>Recipe Ganntifier</h1>
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
          onClick={handleDownload}
          disabled={loading}
          className={styles.submitButton}
        >
          {loading ? "Generating..." : "Generate Gannt Chart"}
        </button>
      </div>
      {error && <p className={styles.errorMessage}>{error}</p>}
      {ganntData.length ? (
        <div className={styles.ganntContainer}>
          <Chart
            chartType="Gantt"
            width="100%"
            data={[ganntColumns, ...ganntFormattedData]}
            options={ganntOptions}
          />
        </div>
      ) : null}
    </div>
  );
}
