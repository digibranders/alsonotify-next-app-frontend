import { useRef, useEffect, useState } from 'react';
import { sanitizeRichTextForEditor } from '../../utils/security/sanitizeHtml';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function RichTextEditor({ value, onChange, placeholder = "Note content...", className = "", style }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Only run on client side
  useEffect(() => {
    Promise.resolve().then(() => setIsMounted(true));
  }, []);

  // Add CSS for placeholder and fix layout - only on client side
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.head.querySelector('style[data-rich-text-editor]')) {
      const style = document.createElement('style');
      style.setAttribute('data-rich-text-editor', 'true');
      style.textContent = `
        .rich-text-editor {
          box-sizing: border-box !important;
          position: relative !important;
          overflow-wrap: break-word !important;
          word-wrap: break-word !important;
          word-break: break-word !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
          width: 100% !important;
          display: block !important;
        }
        .rich-text-editor * {
          box-sizing: border-box !important;
          max-width: 100% !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
        .rich-text-editor:empty:before {
          content: attr(data-placeholder);
          color: #999;
          pointer-events: none;
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rich-text-editor:focus:empty:before {
          color: #ccc;
        }
        .rich-text-editor:not(:empty):before {
          display: none !important;
        }
        .rich-text-editor p {
          margin: 0 0 8px 0 !important;
          padding: 0 !important;
        }
        .rich-text-editor p:last-child {
          margin-bottom: 0 !important;
        }
        .rich-text-editor ul,
        .rich-text-editor ol {
          margin: 0 0 8px 0 !important;
          padding-left: 24px !important;
          padding-right: 0 !important;
        }
        .rich-text-editor li {
          margin: 4px 0 !important;
          padding: 0 !important;
          word-wrap: break-word !important;
        }
        .rich-text-editor h1,
        .rich-text-editor h2,
        .rich-text-editor h3,
        .rich-text-editor h4,
        .rich-text-editor h5,
        .rich-text-editor h6 {
          margin: 8px 0 !important;
          padding: 0 !important;
          font-weight: 600 !important;
          word-wrap: break-word !important;
        }
        .rich-text-editor blockquote {
          margin: 8px 0 !important;
          padding: 0 0 0 12px !important;
          word-wrap: break-word !important;
        }
        .rich-text-editor code {
          display: inline-block !important;
          max-width: 100% !important;
          overflow-wrap: break-word !important;
          word-wrap: break-word !important;
          word-break: break-all !important;
        }
        .rich-text-editor pre {
          margin: 8px 0 !important;
          padding: 8px !important;
          overflow-x: auto !important;
          max-width: 100% !important;
        }
        .rich-text-editor img {
          max-width: 100% !important;
          height: auto !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Update editor content when value prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      // Only update if content actually changed to avoid cursor jumping
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== (value || '')) {
        // Sanitize incoming value before setting it in the editor
        // We use the editor-specific sanitizer which might be more permissive if needed
        editorRef.current.innerHTML = sanitizeRichTextForEditor(value || '');
      }
    }
  }, [value]);

  // Clean up content on mount to prevent any initial rendering issues
  useEffect(() => {
    if (editorRef.current && isMounted) {
      // Ensure proper initial state
      if (!editorRef.current.innerHTML && value) {
        editorRef.current.innerHTML = sanitizeRichTextForEditor(value);
      }
      // Reset any unwanted styles that might cause overlap
      const computedStyle = window.getComputedStyle(editorRef.current);
      if (computedStyle.position === 'static') {
        editorRef.current.style.position = 'relative';
      }
    }
  }, [isMounted, value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (editorRef.current) {
      // Sanitize content before sending it up
      // We generally trust the editor's output mainly for structure, but it's good practice 
      // to sanitize here too, or at least rely on the consumer to sanitize on render.
      // The requirement is to sanitize "Editor write path". 
      // If we strictly sanitize on input (user typing), it might be aggressive.
      // However, the prompt says "sanitize output at the boundary".
      const cleanContent = sanitizeRichTextForEditor(editorRef.current.innerHTML);
      onChange(cleanContent);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (typeof document === 'undefined') return;
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    // Clean the text and insert it
    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    document.execCommand('insertText', false, cleanText);
  };

  const applyFormat = (command: string, value?: string) => {
    if (typeof document === 'undefined') return;
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
      onChange(editorRef.current.innerHTML);
    }
  };

  // Expose format function for parent component
  useEffect(() => {
    if (editorRef.current) {
      (editorRef.current as any).applyFormat = applyFormat;
    }
  }, []);

  // Don't render contentEditable during SSR
  if (!isMounted) {
    return (
      <div
        className={`rich-text-editor ${className}`}
        style={{
          minHeight: '200px',
          maxHeight: '400px',
          padding: '12px',
          border: '1px solid #d9d9d9',
          borderRadius: '8px',
          fontFamily: 'inherit',
          fontSize: "var(--font-size-sm)",
          lineHeight: '1.5',
          color: '#999',
          backgroundColor: '#fff',
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          ...style
        }}
      >
        {placeholder}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`rich-text-editor ${className} ${isFocused ? 'focused' : ''}`}
        style={{
          minHeight: '200px',
          padding: '12px',
          border: 'none',
          borderRadius: '0',
          outline: 'none',
          fontFamily: 'inherit',
          fontSize: "var(--font-size-sm)",
          lineHeight: '1.5',
          color: '#111111',
          backgroundColor: 'transparent',
          boxSizing: 'border-box',
          position: 'relative',
          width: '100%',
          overflowY: 'auto',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
          zIndex: 1,
          ...(isFocused ? {
            outline: 'none'
          } : {}),
          ...style
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
}

// Format button handler functions
export const formatText = (type: string) => {
  // Only work in browser
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    // If no selection, focus the editor first
    const editor = document.querySelector('.rich-text-editor') as HTMLElement;
    if (editor) {
      editor.focus();
      // Try again after focusing
      setTimeout(() => {
        const newSelection = window.getSelection();
        if (newSelection && newSelection.rangeCount > 0) {
          applyFormatToSelection(type, newSelection);
        } else {
          // Insert formatting at cursor for block-level formats
          if (['list', 'checklist', 'heading', 'quote'].includes(type)) {
            insertBlockFormat(type, editor);
          }
        }
      }, 10);
    }
    return;
  }

  applyFormatToSelection(type, selection);
};

const applyFormatToSelection = (type: string, selection: Selection) => {
  if (typeof document === 'undefined') return;

  const range = selection.getRangeAt(0);

  // For block formats, apply even if collapsed
  if (['list', 'checklist', 'heading', 'quote'].includes(type)) {
    if (range.collapsed) {
      const editor = range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement?.closest('.rich-text-editor')
        : (range.commonAncestorContainer as Element).closest('.rich-text-editor');
      if (editor) {
        insertBlockFormat(type, editor as HTMLElement);
      }
      return;
    }
  } else if (range.collapsed) {
    // For inline formats, need selection
    return;
  }

  switch (type) {
    case 'bold':
      document.execCommand('bold', false);
      break;
    case 'italic':
      document.execCommand('italic', false);
      break;
    case 'underline':
      document.execCommand('underline', false);
      break;
    case 'strikethrough':
      document.execCommand('strikethrough', false);
      break;
    case 'justifyLeft':
      document.execCommand('justifyLeft', false);
      break;
    case 'justifyCenter':
      document.execCommand('justifyCenter', false);
      break;
    case 'justifyRight':
      document.execCommand('justifyRight', false);
      break;
    case 'removeFormat':
      document.execCommand('removeFormat', false);
      // Also strip block elements if possible or leave it to standard behavior
      break;
    case 'list':
      document.execCommand('insertUnorderedList', false);
      break;
    case 'insertOrderedList':
      document.execCommand('insertOrderedList', false);
      break;
    case 'checklist': {
      // Create a custom checklist item
      const listItem = document.createElement('li');
      listItem.style.listStyle = 'none';
      listItem.style.position = 'relative';
      listItem.style.paddingLeft = '24px';
      listItem.style.margin = '4px 0';
      const checkbox = document.createElement('span');
      checkbox.textContent = '☐';
      checkbox.style.position = 'absolute';
      checkbox.style.left = '0';
      listItem.appendChild(checkbox);
      const textNode = document.createTextNode(range.extractContents().textContent || '');
      listItem.appendChild(textNode);
      range.insertNode(listItem);
      break;
    }
    case 'heading':
      try {
        document.execCommand('formatBlock', false, 'h3');
      } catch {
        const heading = document.createElement('h3');
        heading.style.fontSize = '18px';
        heading.style.fontWeight = '600';
        heading.style.margin = '8px 0';
        heading.appendChild(range.extractContents());
        range.insertNode(heading);
      }
      break;
    case 'code': {
      // Helper to wrap in code
      const code = document.createElement('code');
      code.style.backgroundColor = '#f5f5f5';
      code.style.padding = '2px 4px';
      code.style.borderRadius = '3px';
      code.style.fontFamily = 'monospace';
      code.style.fontSize = '0.9em';
      const fragment = range.extractContents();
      // If empty, put a space so we can type
      if (!fragment.textContent) code.textContent = '\u00A0';
      else code.appendChild(fragment);
      range.insertNode(code);
      // Move cursor inside
      range.selectNodeContents(code);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
      break;
    }
    case 'quote':
      try {
        document.execCommand('formatBlock', false, 'blockquote');
      } catch {
        const blockquote = document.createElement('blockquote');
        blockquote.style.borderLeft = '3px solid #ddd';
        blockquote.style.paddingLeft = '12px';
        blockquote.style.margin = '8px 0';
        blockquote.style.color = '#666';
        blockquote.appendChild(range.extractContents());
        range.insertNode(blockquote);
      }
      break;
  }

  // Clear selection
  selection.removeAllRanges();
};

const insertBlockFormat = (type: string, editor: HTMLElement) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const selection = window.getSelection();
  if (!selection) return;

  const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : document.createRange();

  switch (type) {
    case 'list':
      document.execCommand('insertUnorderedList', false);
      break;
    case 'checklist': {
      const listItem = document.createElement('li');
      listItem.style.listStyle = 'none';
      listItem.style.position = 'relative';
      listItem.style.paddingLeft = '24px';
      listItem.style.margin = '4px 0';
      const checkbox = document.createElement('span');
      checkbox.textContent = '☐';
      checkbox.style.position = 'absolute';
      checkbox.style.left = '0';
      listItem.appendChild(checkbox);
      listItem.appendChild(document.createTextNode(' '));
      range.insertNode(listItem);
      // Move cursor after the checkbox
      range.setStartAfter(listItem);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      break;
    }
    case 'heading': {
      try {
        document.execCommand('formatBlock', false, 'h3');
      } catch {
        const heading = document.createElement('h3');
        heading.style.fontSize = '18px';
        heading.style.fontWeight = '600';
        heading.style.margin = '8px 0';
        heading.textContent = 'Heading';
        range.insertNode(heading);
        range.selectNodeContents(heading);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      break;
    }
    case 'quote': {
      try {
        document.execCommand('formatBlock', false, 'blockquote');
      } catch {
        const blockquote = document.createElement('blockquote');
        blockquote.style.borderLeft = '3px solid #ddd';
        blockquote.style.paddingLeft = '12px';
        blockquote.style.margin = '8px 0';
        blockquote.style.color = '#666';
        blockquote.textContent = 'Quote';
        range.insertNode(blockquote);
        range.selectNodeContents(blockquote);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      break;
    }
  }
};
