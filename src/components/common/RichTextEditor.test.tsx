import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { RichTextEditor } from './RichTextEditor';
import { sanitizeRichTextForEditor } from '../../utils/security/sanitizeHtml';

// Mock sanitizeHtml to verify it's being called
vi.mock('../../utils/security/sanitizeHtml', () => ({
  sanitizeRichTextForEditor: vi.fn((html) => {
    if (html && html.includes('<script>')) return html.replace(/<script>.*?<\/script>/g, '');
    return html;
  }),
  sanitizeRichText: vi.fn((html) => html),
}));

describe('RichTextEditor Sanitization', () => {
  let container: HTMLDivElement | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let root: any = null;

  afterEach(async () => {
    if (root) {
        await act(async () => {
            root.unmount();
        });
    }
    if (container) {
        container.remove();
    }
    container = null;
    root = null;
    vi.clearAllMocks();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function render(component: any) {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
      root.render(component);
    });
  }

  it('should sanitize initial value on mount', async () => {
    const dangerousContent = '<p>Hello <script>alert(1)</script></p>';
    
    await render(<RichTextEditor value={dangerousContent} onChange={() => {}} />);
    
    expect(sanitizeRichTextForEditor).toHaveBeenCalledWith(dangerousContent);
  }, 10000);

  it('should sanitize value updates', async () => {
    const dangerousUpdate = '<p>Update <script>alert(1)</script></p>';
    
    // Initial render
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
        root.render(<RichTextEditor value="initial" onChange={() => {}} />);
    });
    
    // Update
    await act(async () => {
        root.render(<RichTextEditor value={dangerousUpdate} onChange={() => {}} />);
    });
    
    expect(sanitizeRichTextForEditor).toHaveBeenCalledWith(dangerousUpdate);
  });
});
