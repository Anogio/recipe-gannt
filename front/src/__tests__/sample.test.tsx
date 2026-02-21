import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Sample Test', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should render a simple component', () => {
    render(<div data-testid="test-element">Hello World</div>);
    const element = screen.getByTestId('test-element');
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('Hello World');
  });
});