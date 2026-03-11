import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileCompletionBanner } from './ProfileCompletionBanner';

// Mock the hooks
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard/home',
}));

vi.mock('@/hooks/useProfileCompletion', () => ({
  useProfileCompletion: () => ({ percentage: 50 }),
}));

describe('ProfileCompletionBanner Accessibility', () => {
  beforeEach(() => {
    // Clear storage to ensure it renders
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders with correct accessibility attributes', async () => {
    vi.useFakeTimers();
    render(<ProfileCompletionBanner />);

    // It uses a timeout of 0 to show, so we must advance timers
    act(() => {
      vi.runAllTimers();
    });

    // Check alert role
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'polite');

    // Check "Complete Now" button
    const completeBtn = screen.getByText('Complete Now').closest('button');
    expect(completeBtn).toBeInTheDocument();
    // Verify it has the focus-visible classes we added
    expect(completeBtn?.className).toContain('focus-visible:outline-none');
    expect(completeBtn?.className).toContain('focus-visible:ring-[#2F80ED]');

    // Check close button
    const closeBtn = screen.getByLabelText('Dismiss profile completion banner');
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn?.className).toContain('focus-visible:outline-none');

    vi.useRealTimers();
  });
});
