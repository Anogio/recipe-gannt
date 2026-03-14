import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SearchInterface } from "@/components/SearchInterface";
import { SearchResult } from "@/types";

describe("SearchInterface Component", () => {
  const mockProps = {
    inputMode: "search" as const,
    searchQuery: "",
    manualUrl: "",
    searchResults: [],
    searchLoading: false,
    loadingMore: false,
    hasMore: false,
    popularRecipes: [],
    popularRecipesWarning: "",
    error: "",
    setInputMode: jest.fn(),
    setSearchQuery: jest.fn(),
    setManualUrl: jest.fn(),
    onSelectRecipe: jest.fn(),
    onSearch: jest.fn(),
    onLoadMore: jest.fn(),
    onLoadFromUrl: jest.fn(),
  };

  const mockPopularRecipes: SearchResult[] = [
    {
      title: "Popular Recipe 1",
      url: "https://example.com/recipe1",
      snippet: "A popular recipe",
    },
    {
      title: "Popular Recipe 2",
      url: "https://example.com/recipe2",
      snippet: "Another popular recipe",
    },
  ];

  const mockSearchResults: SearchResult[] = [
    {
      title: "Search Result 1",
      url: "https://example.com/result1",
      snippet: "A search result",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render search mode by default", () => {
    render(<SearchInterface {...mockProps} />);

    expect(screen.getByText("Search for a recipe")).toBeInTheDocument();
    expect(screen.getByText("Your own recipe")).toBeInTheDocument();
  });

  it("should show search input when in search mode", () => {
    render(<SearchInterface {...mockProps} />);

    expect(
      screen.getByPlaceholderText("Search for a recipe (e.g., carbonara)")
    ).toBeInTheDocument();
  });

  it("should show URL input when in URL mode", () => {
    render(<SearchInterface {...mockProps} inputMode="url" />);

    expect(screen.getByPlaceholderText("Paste a recipe URL")).toBeInTheDocument();
  });

  it("should display popular recipes when no search results", () => {
    render(<SearchInterface {...mockProps} popularRecipes={mockPopularRecipes} />);

    expect(screen.getByText("Popular recipes")).toBeInTheDocument();
    expect(screen.getByText("Popular Recipe 1")).toBeInTheDocument();
    expect(screen.getByText("Popular Recipe 2")).toBeInTheDocument();
  });

  it("should display search results when available", () => {
    render(<SearchInterface {...mockProps} searchResults={mockSearchResults} />);

    expect(screen.getByText("1 recipe found")).toBeInTheDocument();
    expect(screen.getByText("Search Result 1")).toBeInTheDocument();
  });

  it("should show load more button when hasMore is true", () => {
    render(
      <SearchInterface
        {...mockProps}
        hasMore={true}
        searchResults={mockSearchResults}
      />
    );

    expect(screen.getByText("Load more results")).toBeInTheDocument();
  });

  it("should show loading state when searchLoading is true", () => {
    render(<SearchInterface {...mockProps} searchLoading={true} />);

    const searchInput = screen.getByPlaceholderText(
      "Search for a recipe (e.g., carbonara)"
    );
    expect(searchInput).toBeInTheDocument();
  });

  it("should show error message when error exists", () => {
    render(<SearchInterface {...mockProps} error="Test error message" />);

    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("should show popular recipes warning when set", () => {
    render(
      <SearchInterface
        {...mockProps}
        popularRecipesWarning="Warning message"
      />
    );

    expect(screen.getByText("Warning message")).toBeInTheDocument();
  });

  it("should call setInputMode when switching modes", () => {
    render(<SearchInterface {...mockProps} />);

    const urlModeButton = screen.getByText("Your own recipe");
    fireEvent.click(urlModeButton);

    expect(mockProps.setInputMode).toHaveBeenCalledWith("url");
  });

  it("should call onSelectRecipe when a recipe is selected", () => {
    render(<SearchInterface {...mockProps} searchResults={mockSearchResults} />);

    const recipeCard = screen.getByText("Search Result 1");
    fireEvent.click(recipeCard);

    expect(mockProps.onSelectRecipe).toHaveBeenCalledWith(mockSearchResults[0]);
  });

  it("should call onLoadFromUrl when URL search button is clicked", () => {
    render(
      <SearchInterface
        {...mockProps}
        inputMode="url"
        manualUrl="https://example.com/test"
      />
    );

    const submitButton = screen.getByLabelText("Submit");
    fireEvent.click(submitButton);

    expect(mockProps.onLoadFromUrl).toHaveBeenCalled();
  });

  it("should call onSearch when search submit is clicked", () => {
    render(<SearchInterface {...mockProps} />);

    const submitButton = screen.getByLabelText("Submit");
    fireEvent.click(submitButton);

    expect(mockProps.onSearch).toHaveBeenCalled();
  });

  it("should call onLoadMore when load more is clicked", () => {
    render(
      <SearchInterface
        {...mockProps}
        hasMore={true}
        searchResults={mockSearchResults}
      />
    );

    fireEvent.click(screen.getByText("Load more results"));

    expect(mockProps.onLoadMore).toHaveBeenCalled();
  });
});
