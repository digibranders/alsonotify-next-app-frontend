'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatMarkdownComponents } from './MarkdownComponents';

interface LinkifyProps {
  children: string;
  className?: string;
}

/**
 * A component that renders text with automatic linkification and basic markdown support.
 * Uses remark-gfm for URL detection and chatMarkdownComponents for consistent styling.
 */
export function Linkify({ children, className }: LinkifyProps) {
  if (!children) return null;

  return (
    <div className={className}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        components={chatMarkdownComponents}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
