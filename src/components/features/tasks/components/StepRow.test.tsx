import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { StepRow } from './StepRow';
import React from 'react';

describe('StepRow', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  const mockStep = {
    id: '1',
    assignee: 'John Doe',
    role: 'Developer',
    estHours: 4,
    status: 'in_progress'
  };

  async function render(component: React.ReactElement) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(component);
    });
  }

  it('renders step details correctly', async () => {
    await render(<StepRow step={mockStep} />);
    expect(container?.textContent).toContain('John Doe');
    expect(container?.textContent).toContain('Developer');
    expect(container?.textContent).toContain('4 hrs');
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    await render(<StepRow step={mockStep} onSelect={onSelect} />);

    act(() => {
      container?.firstElementChild?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onSelect).toHaveBeenCalled();
  });
});
