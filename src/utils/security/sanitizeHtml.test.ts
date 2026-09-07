import { describe, it, expect } from 'vitest';
import { sanitizeEmailHtml, sanitizeRichText, sanitizeRichTextForEditor } from './sanitizeHtml';

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

/**
 * sanitizeEmailHtml feeds both the iframe srcDoc and the MailPage body and had
 * ZERO tests — coverage showed lines 142-186 entirely uncovered while the rest
 * of this module sat at ~53%.
 *
 * Both recorded XSS findings against this module are genuinely fixed in the
 * code; this is a coverage gap, not a live vulnerability. These tests exist so
 * a future refactor cannot silently reopen them.
 */
describe('sanitizeEmailHtml', () => {
    it('returns an empty string for empty input', () => {
        expect(sanitizeEmailHtml('', true)).toBe('');
    });

    it('strips script tags', () => {
        const out = sanitizeEmailHtml('<p>hi</p><script>alert(1)</script>', true);

        expect(out).not.toContain('<script');
        expect(out).not.toContain('alert(1)');
        expect(out).toContain('hi');
    });

    it('strips on* event handlers', () => {
        const out = sanitizeEmailHtml('<div onclick="alert(1)">x</div>', true);

        expect(out).not.toContain('onclick');
        expect(out).not.toContain('alert(1)');
    });

    it('strips iframe, object, embed and form controls', () => {
        for (const tag of ['iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button']) {
            const out = sanitizeEmailHtml(`<${tag}></${tag}>`, true);
            expect(out).not.toContain(`<${tag}`);
        }
    });

    it('preserves safe formatting markup', () => {
        const out = sanitizeEmailHtml('<p><strong>bold</strong> and <em>italic</em></p>', true);

        expect(out).toContain('<strong>');
        expect(out).toContain('<em>');
        expect(out).toContain('bold');
    });

    it('keeps images when allowImages is true', () => {
        const out = sanitizeEmailHtml('<img src="https://example.com/a.png">', true);

        expect(out).toContain('<img');
    });

    it('removes images when allowImages is false', () => {
        const out = sanitizeEmailHtml('<img src="https://tracker.example/pixel.gif">', false);

        expect(out).not.toContain('<img');
    });

    it('strips background-image urls when images are blocked, so tracking pixels cannot load via CSS', () => {
        const out = sanitizeEmailHtml(
            '<div style="background-image: url(https://tracker.example/p.gif)">x</div>',
            false,
        );

        expect(out).not.toContain('tracker.example');
    });

    /**
     * FINDING, 2026-09-07. The code sets ADD_TAGS: ['style'] with the comment
     * "Allow <style> tags for email layout (Outlook/marketing emails depend on
     * them)", and then ~20 lines scope those blocks under .mail-html.
     *
     * That scoping code is DEAD. DOMPurify with USE_PROFILES: { html: true }
     * removes the <style> element and its contents regardless of ADD_TAGS, so
     * the regex never has a block to rewrite. Verified empirically:
     *   sanitizeEmailHtml('<style>body{color:red}</style><p>x</p>', true)
     *     === '<p>x</p>'
     *
     * These tests assert what the function ACTUALLY does, not what the comment
     * claims, and are deliberately written to fail if <style> ever starts
     * surviving — at which point the scoping logic becomes live and needs its
     * own tests before it can be trusted.
     *
     * Security impact: none. Stripping style is the SAFER direction. The cost
     * is functional: marketing and Outlook emails that depend on <style>
     * render unstyled, which is the opposite of the stated intent.
     */
    it('strips style blocks entirely — the .mail-html scoping code is dead', () => {
        const out = sanitizeEmailHtml('<style>body { color: red; }</style><p>x</p>', true);

        expect(out).not.toContain('<style');
        expect(out).not.toContain('color: red');
        expect(out).toContain('<p>x</p>');
        // If this flips, the scoping branch has become reachable.
        expect(out).not.toContain('.mail-html');
    });

    it('drops a comma-separated rule with the rest of the style block', () => {
        const out = sanitizeEmailHtml('<style>h1, h2 { color: red; }</style>', true);

        expect(out).toBe('');
    });

    it('drops @media blocks too, since the whole element goes', () => {
        const out = sanitizeEmailHtml('<style>@media print { p { color: red; } }</style>', true);

        expect(out).toBe('');
    });

    it('removes dangerous CSS constructs, by removing the style element wholesale', () => {
        const out = sanitizeEmailHtml(
            '<style>p { width: expression(alert(1)); behavior: url(x.htc); } @import url(evil.css);</style>',
            true,
        );

        // Passes because the element is gone, not because stripDangerousCss ran.
        expect(out).toBe('');
        expect(out).not.toContain('expression(');
    });

    it('neutralises javascript: URLs in anchors', () => {
        const out = sanitizeEmailHtml('<a href="javascript:alert(1)">x</a>', true);

        expect(out).not.toContain('javascript:');
    });
});
