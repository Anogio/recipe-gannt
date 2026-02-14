import {
  PlannedStepsResponse,
  PopularRecipesResponse,
  SearchResponse,
  SearchResult,
} from "@/types";

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://recipe-gannt.onrender.com"
    : "http://127.0.0.1:8000";

export async function searchRecipes(
  query: string,
  page: number = 0
): Promise<SearchResponse> {
  const response = await fetch(
    `${BASE_URL}/search_recipes?query=${encodeURIComponent(query)}&page=${page}`
  );

  if (!response.ok) {
    throw new Error("Failed to search recipes");
  }

  return response.json();
}

export async function getPopularRecipes(): Promise<PopularRecipesResponse> {
  const response = await fetch(`${BASE_URL}/popular_recipes`);

  if (!response.ok) {
    return { recipes: [] };
  }

  return response.json();
}

export async function loadRecipe(
  recipe: SearchResult
): Promise<PlannedStepsResponse> {
  const response = await fetch(`${BASE_URL}/ganntify_recipe_data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipe_url: recipe.url,
      title: recipe.title,
      snippet: recipe.snippet,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to load recipe steps");
  }

  return response.json();
}

export async function loadRecipeFromUrl(
  url: string
): Promise<PlannedStepsResponse> {
  const response = await fetch(`${BASE_URL}/ganntify_recipe_data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipe_url: url }),
  });

  if (!response.ok) {
    throw new Error("Failed to load recipe steps");
  }

  return response.json();
}

export function getDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
