import type { Components } from 'react-markdown';

/**
 * Shared markdown component configurations for ReactMarkdown rendering.
 * Provides consistent styling across the application.
 */
export const chatMarkdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 text-sm font-medium leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 pl-4 list-disc space-y-1 text-sm font-medium">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 pl-4 list-decimal space-y-1 text-sm font-medium">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="pl-1">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-[#111111]">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a href={href} className="text-[#ff3b3b] underline hover:text-[#cc2f2f]" target="_blank" rel="noopener noreferrer">{children}</a>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded-lg border border-[#EEEEEE]">
      <table className="w-full text-[0.8125rem] text-left">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-[#F7F7F7] font-semibold text-[#111111]">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-[#EEEEEE]">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-[#F7F7F7]/50">{children}</tr>,
  th: ({ children }) => <th className="px-3 py-2 whitespace-nowrap">{children}</th>,
  td: ({ children }) => <td className="px-3 py-2">{children}</td>,
};
