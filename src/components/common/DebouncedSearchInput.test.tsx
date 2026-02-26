import { render, screen, fireEvent, act } from '@testing-library/react';
import { DebouncedSearchInput } from './DebouncedSearchInput';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('DebouncedSearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with placeholder', () => {
    render(<DebouncedSearchInput onSearch={vi.fn()} placeholder="Search here..." />);
    expect(screen.getByPlaceholderText('Search here...')).toBeInTheDocument();
  });

  it('calls onSearch after delay', async () => {
    const onSearch = vi.fn();
    render(<DebouncedSearchInput onSearch={onSearch} delay={500} />);

    // Initial call on mount
    act(() => {
      vi.runAllTimers();
    });
    onSearch.mockClear();

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    // Should not call immediately
    expect(onSearch).not.toHaveBeenCalled();

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onSearch).toHaveBeenCalledWith('test');
  });

  it('shows clear button when text is entered and clears on click', () => {
    const onSearch = vi.fn();
    render(<DebouncedSearchInput onSearch={onSearch} delay={500} />);

    // Clear initial call
    act(() => {
        vi.runAllTimers();
    });
    onSearch.mockClear();

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    // Let 'test' commit first so we have a state change to clear from
    act(() => {
        vi.advanceTimersByTime(500);
    });
    expect(onSearch).toHaveBeenCalledWith('test');
    onSearch.mockClear();

    // Clear button should appear
    const clearButton = screen.getByLabelText('Clear search');
    expect(clearButton).toBeInTheDocument();

    // Click clear
    fireEvent.click(clearButton);

    expect(input).toHaveValue('');

    // Should call onSearch with empty string
    act(() => {
        vi.advanceTimersByTime(500);
    });
    expect(onSearch).toHaveBeenCalledWith('');
  });
});
