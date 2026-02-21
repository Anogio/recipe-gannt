import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingState } from '@/components/LoadingState';

describe('LoadingState Component', () => {
  it('should render loading message', () => {
    render(<LoadingState message="Loading..." />);
    
    const loadingText = screen.getByText('Loading...');
    expect(loadingText).toBeInTheDocument();
  });

  it('should render with back to search button when provided', () => {
    const mockBackToSearch = jest.fn();
    render(<LoadingState message="Loading..." onBackToSearch={mockBackToSearch} />);
    
    const title = screen.getByText('Flow Recipe');
    expect(title).toBeInTheDocument();
  });

  it('should render title without onClick when no callback provided', () => {
    render(<LoadingState message="Loading..." />);
    
    const title = screen.getByText('Flow Recipe');
    expect(title).toBeInTheDocument();
  });
});