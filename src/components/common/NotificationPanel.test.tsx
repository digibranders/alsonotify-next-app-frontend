import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationPanel } from './NotificationPanel';
import { useNotifications } from '@/hooks/useNotification';
import { useIsNarrow } from '@/hooks/useBreakpoint';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock hooks
vi.mock('@/hooks/useNotification');
vi.mock('@/hooks/useBreakpoint');
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('NotificationPanel', () => {
  const mockOnClose = vi.fn();
  const mockOnMarkAsRead = vi.fn();
  const mockOnMarkAllRead = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useNotifications as any).mockReturnValue({
      data: {
        result: [
          {
            id: 1,
            type: 'GENERAL',
            title: 'Test',
            message: 'Test Message',
            created_at: new Date().toISOString(),
            is_read: false,
          },
        ],
      },
      isLoading: false,
    });
  });

  it('renders close button on mobile', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useIsNarrow as any).mockReturnValue(true); // Mobile view

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <NotificationPanel
          open={true}
          onClose={mockOnClose}
          onMarkAsRead={mockOnMarkAsRead}
          onMarkAllRead={mockOnMarkAllRead}
        />
      </QueryClientProvider>
    );

    const closeButton = screen.getByRole('button', { name: /Close/i });
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('renders close button on desktop', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (useIsNarrow as any).mockReturnValue(false); // Desktop view

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <NotificationPanel
          open={true}
          onClose={mockOnClose}
          onMarkAsRead={mockOnMarkAsRead}
          onMarkAllRead={mockOnMarkAllRead}
        />
      </QueryClientProvider>
    );

    const closeButton = screen.getByRole('button', { name: /Close/i });
    expect(closeButton).toBeInTheDocument();

    fireEvent.click(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
