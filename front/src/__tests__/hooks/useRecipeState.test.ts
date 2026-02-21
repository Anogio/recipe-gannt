import { renderHook, act } from '@testing-library/react';
import { useRecipeState } from '@/hooks/useRecipeState';
import { SearchResult } from '@/types';

// Mock the router and API functions
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
}));

jest.mock('@/services/api', () => ({
  loadRecipe: jest.fn(),
  loadRecipeFromUrl: jest.fn(),
  getDomain: jest.fn((url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return 'example.com';
    }
  }),
}));

describe('useRecipeState Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useRecipeState());
    const [state] = result.current;

    expect(state.selectedRecipe).toBeNull();
    expect(state.steps).toEqual([]);
    expect(state.completedSteps.size).toBe(0);
    expect(state.loading).toBe(false);
    expect(state.error).toBe('');
    expect(state.recipeViewMode).toBe('checklist');
    expect(state.shareStatus).toBe('idle');
  });

  it('should handle recipe selection', async () => {
    const mockRecipe: SearchResult = {
      title: 'Test Recipe',
      url: 'https://example.com/recipe',
      snippet: 'Test snippet',
    };

    const mockRecipeData = {
      planned_steps: [
        {
          step_id: '1',
          step_name: 'Step 1',
          duration_minute: 5,
          dependencies: [],
          ingredients: ['ingredient1'],
        },
      ],
    };

    require('@/services/api').loadRecipe.mockResolvedValue(mockRecipeData);

    const { result } = renderHook(() => useRecipeState());
    const [, { handleSelectRecipe }] = result.current;

    await act(async () => {
      await handleSelectRecipe(mockRecipe);
    });

    const [updatedState] = result.current;
    expect(updatedState.selectedRecipe).toEqual(mockRecipe);
    expect(updatedState.steps).toEqual(mockRecipeData.planned_steps);
    expect(updatedState.loading).toBe(false);
  });

  it('should handle recipe selection error', async () => {
    const mockRecipe: SearchResult = {
      title: 'Test Recipe',
      url: 'https://example.com/recipe',
      snippet: 'Test snippet',
    };

    require('@/services/api').loadRecipe.mockRejectedValue(new Error('Failed to load'));

    const { result } = renderHook(() => useRecipeState());
    const [, { handleSelectRecipe }] = result.current;

    await act(async () => {
      await handleSelectRecipe(mockRecipe);
    });

    // Wait for the state updates to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const [updatedState] = result.current;
    expect(updatedState.error).toBe('Could not load this recipe. The website may not be supported.');
    expect(updatedState.selectedRecipe).toBeNull();
    expect(updatedState.loading).toBe(false);
  });

  it('should handle URL loading', async () => {
    const url = 'https://example.com/test-recipe';
    const mockRecipeData = {
      planned_steps: [
        {
          step_id: '1',
          step_name: 'Step 1',
          duration_minute: 5,
          dependencies: [],
          ingredients: ['ingredient1'],
        },
      ],
    };

    require('@/services/api').loadRecipeFromUrl.mockResolvedValue(mockRecipeData);

    const { result } = renderHook(() => useRecipeState());
    const [, { handleLoadFromUrl }] = result.current;

    await act(async () => {
      await handleLoadFromUrl(url);
    });

    const [updatedState] = result.current;
    expect(updatedState.selectedRecipe).not.toBeNull();
    expect(updatedState.selectedRecipe?.url).toBe(url);
    expect(updatedState.steps).toEqual(mockRecipeData.planned_steps);
    expect(updatedState.recipeViewMode).toBe('checklist');
  });

  it('should handle URL loading with empty URL', async () => {
    const { result } = renderHook(() => useRecipeState());
    const [, { handleLoadFromUrl }] = result.current;

    await act(async () => {
      await handleLoadFromUrl('');
    });

    const [updatedState] = result.current;
    expect(updatedState.error).toBe('Please enter a recipe URL');
    expect(require('@/services/api').loadRecipeFromUrl).not.toHaveBeenCalled();
  });

  it('should toggle steps correctly', () => {
    const { result } = renderHook(() => useRecipeState());
    const [, { toggleStep }] = result.current;

    act(() => {
      toggleStep('step1');
    });

    let [state] = result.current;
    expect(state.completedSteps.has('step1')).toBe(true);

    act(() => {
      toggleStep('step1');
    });

    [state] = result.current;
    expect(state.completedSteps.has('step1')).toBe(false);
  });

  it('should toggle sections correctly', () => {
    const { result } = renderHook(() => useRecipeState());
    const [, { toggleSection }] = result.current;

    act(() => {
      toggleSection('ready');
    });

    const [state] = result.current;
    expect(state.expandedSections.ready).toBe(false);

    act(() => {
      toggleSection('ready');
    });

    const [updatedState] = result.current;
    expect(updatedState.expandedSections.ready).toBe(true);
  });

  it('should handle back to search', () => {
    const { result } = renderHook(() => useRecipeState());
    
    // Set some state first
    act(() => {
      const [, actions] = result.current;
      actions.handleSelectRecipe({
        title: 'Test',
        url: 'https://example.com',
        snippet: 'Test',
      });
    });

    const [stateBefore] = result.current;
    expect(stateBefore.selectedRecipe).not.toBeNull();

    act(() => {
      const [, actions] = result.current;
      actions.handleBackToSearch();
    });

    const [stateAfter] = result.current;
    expect(stateAfter.selectedRecipe).toBeNull();
    expect(stateAfter.steps).toEqual([]);
    expect(stateAfter.completedSteps.size).toBe(0);
  });

  it('should handle share functionality', async () => {
    const mockClipboard = {
      writeText: jest.fn().mockResolvedValue(undefined),
    };
    global.navigator.clipboard = mockClipboard;

    const { result } = renderHook(() => useRecipeState());
    
    // Set a recipe first
    act(() => {
      const [, actions] = result.current;
      actions.handleSelectRecipe({
        title: 'Test',
        url: 'https://example.com/recipe',
        snippet: 'Test',
      });
    });

    await act(async () => {
      const [, actions] = result.current;
      await actions.handleShare();
    });

    // Wait for the share status to update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const [state] = result.current;
    expect(state.shareStatus).toBe('copied');
    expect(mockClipboard.writeText).toHaveBeenCalledWith(
      'http://localhost?recipe=https%3A%2F%2Fexample.com%2Frecipe'
    );
  });
});