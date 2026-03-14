"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlannedStep, SearchResult, ExpandedSections } from "@/types";
import { loadRecipe, loadRecipeFromUrl, getDomain } from "@/services/api";
import { useI18n } from "@/i18n";

interface RecipeState {
  selectedRecipe: SearchResult | null;
  steps: PlannedStep[];
  completedSteps: Set<string>;
  expandedSections: ExpandedSections;
  loading: boolean;
  error: string;
  recipeViewMode: "checklist" | "graph";
  shareStatus: "idle" | "copied";
  recipeUrl: string | null;
}

interface RecipeActions {
  handleSelectRecipe: (recipe: SearchResult) => Promise<void>;
  handleLoadFromUrl: (url: string) => Promise<void>;
  handleBackToSearch: () => void;
  toggleStep: (stepId: string) => void;
  toggleSection: (section: keyof ExpandedSections) => void;
  handleShare: () => void;
  setRecipeViewMode: (mode: "checklist" | "graph") => void;
  refreshRecipe: () => Promise<void>;
  setError: (error: string) => void;
}

export function useRecipeState(): [RecipeState, RecipeActions] {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { messages } = useI18n();

  const [selectedRecipe, setSelectedRecipe] = useState<SearchResult | null>(null);
  const [steps, setSteps] = useState<PlannedStep[]>([]);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    ready: true,
    blocked: false,
    completed: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recipeViewMode, setRecipeViewMode] = useState<"checklist" | "graph">(
    "checklist"
  );
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const [recipeUrl, setRecipeUrl] = useState<string | null>(null);

  useEffect(() => {
    const recipeUrl = searchParams.get("recipe");
    if (recipeUrl) {
      setRecipeUrl(recipeUrl);
      loadRecipeFromUrl(recipeUrl)
        .then((data) => {
          setSteps(data.planned_steps);
          setRecipeViewMode("checklist");
          setSelectedRecipe({
            title: getDomain(recipeUrl),
            url: recipeUrl,
            snippet: "",
          });
        })
        .catch(() => {
          setError(messages.recipe.loadError);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [messages.recipe.loadError, searchParams]);

  const handleSelectRecipe = useCallback(
    async (recipe: SearchResult) => {
      setSelectedRecipe(recipe);
      setRecipeViewMode("checklist");
      setLoading(true);
      setCompletedSteps(new Set());
      setError("");
      setShareStatus("idle");

      try {
        const data = await loadRecipe(recipe);
        setSteps(data.planned_steps);
        setRecipeUrl(recipe.url);
        router.push(`?recipe=${encodeURIComponent(recipe.url)}`, {
          scroll: false,
        });
      } catch {
        setError(messages.recipe.loadError);
        setSelectedRecipe(null);
      } finally {
        setLoading(false);
      }
    },
    [messages.recipe.loadError, router]
  );

  const handleLoadFromUrl = useCallback(
    async (url: string) => {
      if (!url.trim()) {
        setError(messages.search.urlRequired);
        return;
      }

      setLoading(true);
      setCompletedSteps(new Set());
      setError("");
      setShareStatus("idle");

      const trimmedUrl = url.trim();

      try {
        const data = await loadRecipeFromUrl(trimmedUrl);
        setSteps(data.planned_steps);
        setRecipeViewMode("checklist");
        setSelectedRecipe({
          title: getDomain(trimmedUrl),
          url: trimmedUrl,
          snippet: "",
        });
        setRecipeUrl(trimmedUrl);
        router.push(`?recipe=${encodeURIComponent(trimmedUrl)}`, {
          scroll: false,
        });
      } catch {
        setError(messages.recipe.loadError);
      } finally {
        setLoading(false);
      }
    },
    [messages.recipe.loadError, messages.search.urlRequired, router]
  );

  const handleBackToSearch = useCallback(() => {
    setSelectedRecipe(null);
    setRecipeViewMode("checklist");
    setSteps([]);
    setCompletedSteps(new Set());
    setError("");
    setShareStatus("idle");
    setRecipeUrl(null);
    router.push("/", { scroll: false });
  }, [router]);

  const toggleStep = useCallback((stepId: string) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  }, []);

  const toggleSection = useCallback((section: keyof ExpandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const handleShare = useCallback(() => {
    if (!selectedRecipe) return;
    const shareUrl = `${window.location.origin}?recipe=${encodeURIComponent(
      selectedRecipe.url
    )}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShareStatus("copied");
      setTimeout(() => setShareStatus("idle"), 2000);
    });
  }, [selectedRecipe]);

  const refreshRecipe = useCallback(async () => {
    if (!recipeUrl) return;

    setLoading(true);
    try {
      const data = await loadRecipeFromUrl(recipeUrl);
      setSteps(data.planned_steps);
    } catch {
      setError(messages.recipe.refreshError);
    } finally {
      setLoading(false);
    }
  }, [messages.recipe.refreshError, recipeUrl]);

  return [
    {
      selectedRecipe,
      steps,
      completedSteps,
      expandedSections,
      loading,
      error,
      recipeViewMode,
      shareStatus,
      recipeUrl,
    },
    {
      handleSelectRecipe,
      handleLoadFromUrl,
      handleBackToSearch,
      toggleStep,
      toggleSection,
      handleShare,
      setRecipeViewMode,
      refreshRecipe,
      setError,
    },
  ];
}
