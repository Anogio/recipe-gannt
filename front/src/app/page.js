"use client"; // This is a client component

import Image from "next/image";
import styles from "./page.module.css";
import React from "react";

export default function Home() {
  const [inputValue, setInputValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

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
      const response = await fetch(`${baseUrl}/ganntify_recipe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipe_url: inputValue }),
      });

      if (!response.ok) {
        throw new Error("Failed getting the graph");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "recipe_gannt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1>Recipe Ganntifier</h1>
      <div className="input-container">
        <input
          type="text"
          placeholder="Enter the URL of a recipe"
          value={inputValue}
          onChange={handleInputChange}
        />
        <button onClick={handleDownload} disabled={loading}>
          {loading ? "Generating..." : "Generate Gannt Chart"}
        </button>
      </div>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}
