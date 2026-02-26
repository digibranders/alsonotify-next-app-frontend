import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { TaskStatusBadge } from './TaskStatusBadge';
import React from 'react';

describe('TaskStatusBadge', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  async function render(component: React.ReactElement) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(component);
    });
  }

  it('renders completed status correctly', async () => {
    await render(<TaskStatusBadge status="completed" showLabel />);
    expect(container?.textContent).toContain('Completed');
    expect(container?.querySelector('.bg-\\[\\#E8F5E9\\]')).toBeTruthy();
  });

  it('renders in-progress status correctly', async () => {
    await render(<TaskStatusBadge status="in_progress" showLabel />);
    expect(container?.textContent).toContain('In Progress');
    expect(container?.querySelector('.text-\\[\\#2F80ED\\]')).toBeTruthy();
  });

  it('renders todo status correctly', async () => {
    await render(<TaskStatusBadge status="todo" showLabel />);
    expect(container?.textContent).toContain('Assigned');
  });
});
