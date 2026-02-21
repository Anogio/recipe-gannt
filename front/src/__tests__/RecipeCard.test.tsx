import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RecipeCard } from '@/components/RecipeCard';
import { SearchResult } from '@/types';

describe('RecipeCard Component', () => {
  const mockRecipe: SearchResult = {
    title: 'Test Recipe',
    url: 'https://example.com/recipe',
    snippet: 'This is a test recipe snippet that describes the recipe.',
  };

  const mockOnSelect = jest.fn();

  it('should render recipe title and snippet', () => {
    render(<RecipeCard recipe={mockRecipe} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.getByText('This is a test recipe snippet that describes the recipe.')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    render(<RecipeCard recipe={mockRecipe} onSelect={mockOnSelect} />);
    
    const card = screen.getByText('Test Recipe');
    fireEvent.click(card);
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockRecipe);
  });

  it('should render with different recipe data', () => {
    const anotherRecipe: SearchResult = {
      title: 'Another Recipe',
      url: 'https://example.com/another',
      snippet: 'Another test snippet.',
    };
    
    render(<RecipeCard recipe={anotherRecipe} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('Another Recipe')).toBeInTheDocument();
    expect(screen.getByText('Another test snippet.')).toBeInTheDocument();
  });

  it('should handle long snippets', () => {
    const longSnippet = 'A'.repeat(300); // Long snippet
    const longRecipe: SearchResult = {
      title: 'Long Recipe',
      url: 'https://example.com/long',
      snippet: longSnippet,
    };
    
    render(<RecipeCard recipe={longRecipe} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('Long Recipe')).toBeInTheDocument();
    expect(screen.getByText(longSnippet)).toBeInTheDocument();
  });

  it('should handle recipe with empty snippet', () => {
    const emptySnippetRecipe: SearchResult = {
      title: 'No Snippet Recipe',
      url: 'https://example.com/empty',
      snippet: '',
    };
    
    render(<RecipeCard recipe={emptySnippetRecipe} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('No Snippet Recipe')).toBeInTheDocument();
  });

  it('should handle recipe with long URL', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(100);
    const longUrlRecipe: SearchResult = {
      title: 'Long URL Recipe',
      url: longUrl,
      snippet: 'Test snippet',
    };
    
    render(<RecipeCard recipe={longUrlRecipe} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('Long URL Recipe')).toBeInTheDocument();
  });
});