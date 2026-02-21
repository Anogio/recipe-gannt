import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecipeView } from '@/components/RecipeView';
import { PlannedStep } from '@/types';

describe('RecipeView Component', () => {
  const mockRecipe = {
    title: 'Test Recipe',
    url: 'https://example.com/recipe',
    snippet: 'A test recipe',
  };

  const mockSteps: PlannedStep[] = [
    {
      step_id: '1',
      step_name: 'Step 1',
      duration_minute: 5,
      dependencies: [],
      ingredients: ['ingredient1'],
    },
    {
      step_id: '2',
      step_name: 'Step 2',
      duration_minute: null,
      dependencies: ['1'],
      ingredients: ['ingredient2'],
    },
  ];

  const mockProps = {
    recipe: mockRecipe,
    steps: mockSteps,
    completedSteps: new Set(),
    expandedSections: {
      ready: true,
      blocked: false,
      completed: false,
    },
    timerCompleted: new Set(),
    timers: {},
    recipeViewMode: 'checklist' as const,
    onBackToSearch: jest.fn(),
    onToggleStep: jest.fn(),
    onStartTimer: jest.fn(),
    onPauseTimer: jest.fn(),
    onResetTimer: jest.fn(),
    onToggleSection: jest.fn(),
    onShare: jest.fn(),
    shareStatus: 'idle' as const,
    setRecipeViewMode: jest.fn(),
  };

  it('should render recipe information', () => {
    render(<RecipeView {...mockProps} />);
    
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
  });

  it('should show progress bar', () => {
    render(<RecipeView {...mockProps} />);
    
    expect(screen.getByText('0 of 2 steps completed')).toBeInTheDocument();
  });

  it('should show view mode buttons', () => {
    render(<RecipeView {...mockProps} />);
    
    expect(screen.getByText('Checklist')).toBeInTheDocument();
    expect(screen.getByText('Graph')).toBeInTheDocument();
  });

  it('should call onBackToSearch when back button is clicked', () => {
    render(<RecipeView {...mockProps} />);
    
    const backButton = screen.getByText('Select another recipe');
    fireEvent.click(backButton);
    
    expect(mockProps.onBackToSearch).toHaveBeenCalled();
  });

  it('should call onShare when share button is clicked', () => {
    render(<RecipeView {...mockProps} />);
    
    const shareButton = screen.getByText('Share');
    fireEvent.click(shareButton);
    
    expect(mockProps.onShare).toHaveBeenCalled();
  });
});