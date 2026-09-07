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

        // Inline-style CSS url(). These run against the real DOMPurify with
        // the real SHARED_CONFIG, because `style` is an allowed attribute and
        // stripDangerousCss only ever sees what DOMPurify hands its
        // afterSanitizeAttributes hook -- a regex asserted in isolation would
        // not prove the attribute survives to reach it.
        //
        // Teams chat routes attacker-authored HTML here (TeamsChatMessage
        // sanitizes `contentType === 'html'` bodies), and the backend sets
        // `contententSecurityPolicy: false`, so there is no CSP backstop: a
        // remote load that gets through is a read receipt plus the reader's
        // IP and user agent, for anyone able to send them a message.
        describe('CSS url() in inline styles', () => {
            it('strips an absolute https url()', () => {
                const output = sanitizeRichText('<div style="background:url(https://evil.example/p.gif)">x</div>');
                expect(output).not.toContain('evil.example');
            });

            it('strips a protocol-relative url()', () => {
                // `//host/x` inherits the page's scheme, so it loads exactly
                // like the https case above while matching neither `https?:`
                // nor `javascript:` nor `data:`.
                const output = sanitizeRichText('<div style="background:url(//evil.example/p.gif)">x</div>');
                expect(output).not.toContain('evil.example');
            });

            it('strips a protocol-relative url() inside quotes', () => {
                const output = sanitizeRichText(`<div style="background:url('//evil.example/p.gif')">x</div>`);
                expect(output).not.toContain('evil.example');
            });

            it('strips a protocol-relative url() with padding whitespace', () => {
                const output = sanitizeRichText('<div style="background: url(  //evil.example/p.gif )">x</div>');
                expect(output).not.toContain('evil.example');
            });

            it('leaves a same-origin relative url() alone', () => {
                // Single slash: no host, so it cannot reach a third party. The
                // fix must not widen into a blanket url() ban.
                const output = sanitizeRichText('<div style="background:url(/assets/bullet.png)">x</div>');
                expect(output).toContain('/assets/bullet.png');
            });
        });
    });

    describe('sanitizeRichTextForEditor', () => {
         it('should preserve content same as display sanitizer for normal inputs', () => {
            const input = '<p>Test</p>';
            expect(sanitizeRichTextForEditor(input)).toBe(input);
         });
    });
});
