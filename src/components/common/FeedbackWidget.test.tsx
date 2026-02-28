import { render, screen, fireEvent } from '@testing-library/react';
import { FeedbackWidget } from './FeedbackWidget';
import { App } from 'antd';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock hooks
vi.mock('@/hooks/useFeedback', () => ({
  useCreateFeedback: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

describe('FeedbackWidget', () => {
  it('renders correctly and has proper ARIA attributes', () => {
    const handleClose = vi.fn();
    render(
      <App>
        <FeedbackWidget open={true} onClose={handleClose} />
      </App>
    );

    // Check Close button
    const closeButton = screen.getByLabelText('Close feedback dialog');
    expect(closeButton).toBeInTheDocument();

    // Check category buttons
    const featureRequestBtn = screen.getByRole('button', { name: /Feature Request/i });
    expect(featureRequestBtn).toBeInTheDocument();

    // Check initial aria-pressed state
    expect(featureRequestBtn).toHaveAttribute('aria-pressed', 'true');

    const bugReportBtn = screen.getByRole('button', { name: /Bug Report/i });
    expect(bugReportBtn).toBeInTheDocument();
    expect(bugReportBtn).toHaveAttribute('aria-pressed', 'false');

    // Click to change selection
    fireEvent.click(bugReportBtn);

    // Verify aria-pressed state updated
    expect(featureRequestBtn).toHaveAttribute('aria-pressed', 'false');
    expect(bugReportBtn).toHaveAttribute('aria-pressed', 'true');
  });
});
