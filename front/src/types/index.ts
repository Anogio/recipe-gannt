export interface PlannedStep {
  step_id: string;
  step_name: string;
  duration_minute: number | null;
  dependencies: string[];
  ingredients: string[];
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  results: SearchResult[];
  has_more: boolean;
}

export interface PopularRecipesResponse {
  recipes: SearchResult[];
}

export interface PlannedStepsResponse {
  planned_steps: PlannedStep[];
}

export interface TimerState {
  remainingSeconds: number;
  isRunning: boolean;
}

export interface Timers {
  [stepId: string]: TimerState;
}

export interface ExpandedSections {
  ready: boolean;
  blocked: boolean;
  completed: boolean;
}

export type InputMode = "search" | "url";
