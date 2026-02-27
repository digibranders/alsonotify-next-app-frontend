import { describe, it, expect } from 'vitest';
import { sanitizeRichText, sanitizeRichTextForEditor } from './sanitizeHtml';

describe('sanitizeHtml', () => {
    describe('sanitizeRichText', () => {
        it('should preserve allowed tags', () => {
            const input = '<p><b>Bold</b> <i>Italic</i> <u>Underline</u></p>';
            expect(sanitizeRichText(input)).toBe(input);
        });

        it('should preserve lists', () => {
            const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
            expect(sanitizeRichText(input)).toBe(input);
        });

        it('should preserve checklist structure', () => {
            const input = '<li style="list-style: none; position: relative; padding-left: 24px;"><span style="position: absolute; left: 0;">☐</span> Item</li>';
            expect(sanitizeRichText(input)).toBe(input);
        });

        it('should remove script tags', () => {
             const input = '<p>Hello <script>alert("xss")</script>World</p>';
             expect(sanitizeRichText(input)).toBe('<p>Hello World</p>');
        });

        it('should remove event handlers', () => {
             const input = '<img src="x" onerror="alert(1)">';
             expect(sanitizeRichText(input)).toBe('<img src="x">');
        });

        it('should remove javascript: URIs', () => {
            const input = '<a href="javascript:alert(1)">Click me</a>';
            // DOMPurify typically disables the href or removes the tag content depending on config.
            // With standard config it usually strips the javascript: content leaving an empty href or similar.
            // Let's check what it actually outputs. It usually removes the href attribute.
            const output = sanitizeRichText(input);
            expect(output).not.toContain('javascript:');
        });
        
        it('should allow benign styles', () => {
            const input = '<span style="color: red;">Red</span>';
            expect(sanitizeRichText(input)).toBe(input);
        });

        // Security tests for links
        it('should enforce target="_blank" on links without target', () => {
            const input = '<a href="https://example.com">Link</a>';
            const output = sanitizeRichText(input);
            expect(output).toContain('target="_blank"');
        });

        it('should enforce rel="noopener noreferrer" on links without rel', () => {
            const input = '<a href="https://example.com">Link</a>';
            const output = sanitizeRichText(input);
            expect(output).toContain('rel="noopener noreferrer"');
        });

        it('should overwrite existing unsafe target', () => {
           const input = '<a href="https://example.com" target="_self">Link</a>';
           const output = sanitizeRichText(input);
           expect(output).toContain('target="_blank"');
       });
    });

    describe('sanitizeRichTextForEditor', () => {
         it('should preserve content same as display sanitizer for normal inputs', () => {
            const input = '<p>Test</p>';
            expect(sanitizeRichTextForEditor(input)).toBe(input);
         });
    });
});
