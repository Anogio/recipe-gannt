export const APP_NAME = "Flow Recipe";
export const DEFAULT_LOCALE = "en";
export const LOCALE_STORAGE_KEY = "flow-recipe-locale";
export const SUPPORTED_LOCALES = ["en", "fr"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export interface TranslationMessages {
  meta: {
    title: string;
    description: string;
  };
  languageSwitcher: {
    label: string;
    english: string;
    french: string;
  };
  loading: {
    fallback: string;
    messages: string[];
  };
  home: {
    subtitle: string;
  };
  search: {
    searchMode: string;
    urlMode: string;
    submit: string;
    searchPlaceholder: string;
    urlPlaceholder: string;
    popularTitle: string;
    loadMore: string;
    loadingMore: string;
    viewOriginal: string;
    emptyQueryError: string;
    noResults: string;
    searchError: string;
    loadMoreError: string;
    popularUnavailable: string;
    urlRequired: string;
    resultsCount: (count: number) => string;
  };
  recipe: {
    aiDisclaimer: string;
    share: string;
    copied: string;
    viewOriginal: string;
    selectAnother: string;
    checklist: string;
    graph: string;
    loadError: string;
    refreshError: string;
    progressText: (completed: number, total: number) => string;
  };
  checklist: {
    readyTitle: string;
    readySubtitle: string;
    blockedTitle: string;
    blockedSubtitle: string;
    completedTitle: string;
    allDone: string;
    waitingFor: (dependencies: string) => string;
  };
  graph: {
    subtitle: string;
    legendCompleted: string;
    legendReady: string;
    legendBlocked: string;
    ariaLabel: string;
  };
  timer: {
    start: string;
    pause: string;
    reset: string;
  };
}

export const translations: Record<Locale, TranslationMessages> = {
  en: {
    meta: {
      title: APP_NAME,
      description: "Turn any recipe into an interactive cooking checklist",
    },
    languageSwitcher: {
      label: "Language",
      english: "English",
      french: "Français",
    },
    loading: {
      fallback: "Loading...",
      messages: [
        "Fetching recipe...",
        "Analyzing ingredients...",
        "Identifying steps...",
        "Building your checklist...",
      ],
    },
    home: {
      subtitle: "Turn any recipe into a smart step-by-step guide",
    },
    search: {
      searchMode: "Search for a recipe",
      urlMode: "Your own recipe",
      submit: "Submit",
      searchPlaceholder: "Search for a recipe (e.g., carbonara)",
      urlPlaceholder: "Paste a recipe URL",
      popularTitle: "Popular recipes",
      loadMore: "Load more results",
      loadingMore: "Loading...",
      viewOriginal: "View original",
      emptyQueryError: "Please enter a recipe name",
      noResults: "No recipes found. Try a different search term.",
      searchError:
        "Could not search for recipes. Please check your connection and try again.",
      loadMoreError: "Could not load more recipes. Please try again.",
      popularUnavailable: "Popular recipes are temporarily unavailable.",
      urlRequired: "Please enter a recipe URL",
      resultsCount: (count) => `${count} recipe${count === 1 ? "" : "s"} found`,
    },
    recipe: {
      aiDisclaimer:
        "AI was used to extract and structure these steps. Double-check key details.",
      share: "Share",
      copied: "Copied!",
      viewOriginal: "View original",
      selectAnother: "Select another recipe",
      checklist: "Checklist",
      graph: "Graph",
      loadError: "Could not load this recipe. The website may not be supported.",
      refreshError: "Could not refresh this recipe.",
      progressText: (completed, total) =>
        `${completed} of ${total} step${total === 1 ? "" : "s"} completed`,
    },
    checklist: {
      readyTitle: "Now",
      readySubtitle:
        "You can do these steps now. The next steps will appear as you progress in the recipe",
      blockedTitle: "Next up",
      blockedSubtitle: "You still need to complete other steps to do these",
      completedTitle: "Completed",
      allDone: "All steps completed! Enjoy your meal!",
      waitingFor: (dependencies) => `Waiting for: ${dependencies}`,
    },
    graph: {
      subtitle: "Click a step to mark it as completed",
      legendCompleted: "Completed",
      legendReady: "Now",
      legendBlocked: "Next up",
      ariaLabel: "Recipe dependency graph",
    },
    timer: {
      start: "Start timer",
      pause: "Pause timer",
      reset: "Reset timer",
    },
  },
  fr: {
    meta: {
      title: APP_NAME,
      description: "Transformez n'importe quelle recette en checklist de cuisine interactive",
    },
    languageSwitcher: {
      label: "Langue",
      english: "English",
      french: "Français",
    },
    loading: {
      fallback: "Chargement...",
      messages: [
        "Récupération de la recette...",
        "Analyse des ingrédients...",
        "Identification des étapes...",
        "Création de votre checklist...",
      ],
    },
    home: {
      subtitle: "Transformez n'importe quelle recette en guide intelligent étape par étape",
    },
    search: {
      searchMode: "Chercher une recette",
      urlMode: "Votre propre recette",
      submit: "Valider",
      searchPlaceholder: "Chercher une recette (ex. carbonara)",
      urlPlaceholder: "Collez l'URL d'une recette",
      popularTitle: "Recettes populaires",
      loadMore: "Voir plus de résultats",
      loadingMore: "Chargement...",
      viewOriginal: "Voir l'original",
      emptyQueryError: "Veuillez saisir le nom d'une recette",
      noResults: "Aucune recette trouvée. Essayez une autre recherche.",
      searchError:
        "Impossible de chercher des recettes. Vérifiez votre connexion puis réessayez.",
      loadMoreError: "Impossible de charger plus de recettes. Réessayez.",
      popularUnavailable: "Les recettes populaires sont temporairement indisponibles.",
      urlRequired: "Veuillez saisir l'URL d'une recette",
      resultsCount: (count) => `${count} recette${count === 1 ? "" : "s"} trouvée${count === 1 ? "" : "s"}`,
    },
    recipe: {
      aiDisclaimer:
        "Une IA a été utilisée pour extraire et structurer ces étapes. Vérifiez les informations importantes.",
      share: "Partager",
      copied: "Copié !",
      viewOriginal: "Voir l'original",
      selectAnother: "Choisir une autre recette",
      checklist: "Checklist",
      graph: "Graphe",
      loadError: "Impossible de charger cette recette. Le site n'est peut-être pas pris en charge.",
      refreshError: "Impossible d'actualiser cette recette.",
      progressText: (completed, total) =>
        `${completed} étape${completed === 1 ? "" : "s"} terminée${completed === 1 ? "" : "s"} sur ${total}`,
    },
    checklist: {
      readyTitle: "Maintenant",
      readySubtitle:
        "Vous pouvez faire ces étapes maintenant. Les suivantes apparaîtront au fur et à mesure de votre progression.",
      blockedTitle: "À venir",
      blockedSubtitle: "Vous devez encore terminer d'autres étapes avant de les faire",
      completedTitle: "Terminées",
      allDone: "Toutes les étapes sont terminées. Bon appétit !",
      waitingFor: (dependencies) => `En attente de : ${dependencies}`,
    },
    graph: {
      subtitle: "Cliquez sur une étape pour la marquer comme terminée",
      legendCompleted: "Terminée",
      legendReady: "Maintenant",
      legendBlocked: "À venir",
      ariaLabel: "Graphe des dépendances de la recette",
    },
    timer: {
      start: "Démarrer le minuteur",
      pause: "Mettre en pause le minuteur",
      reset: "Réinitialiser le minuteur",
    },
  },
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value !== null && value !== undefined && SUPPORTED_LOCALES.includes(value as Locale);
}

export function getPreferredLocale(): Locale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (isLocale(storedLocale)) {
    return storedLocale;
  }

  const language = window.navigator.language.toLowerCase();
  return language.startsWith("fr") ? "fr" : DEFAULT_LOCALE;
}
