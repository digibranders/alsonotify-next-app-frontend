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
     * <style> handling, repaired 2026-09-07.
     *
     * The code set ADD_TAGS: ['style'] with the comment "Allow <style> tags for
     * email layout (Outlook/marketing emails depend on them)", then scoped
     * those blocks under .mail-html. None of it ran: without FORCE_BODY the
     * HTML parser hoists a leading <style> into <head> and DOMPurify returns
     * only body content, so the element was dropped and ~20 lines of scoping
     * were dead code. FORCE_BODY: true makes the documented intent real.
     *
     * Enabling it exposed a second bug in the scoping regex — see the @media
     * test below.
     */
    it('keeps style blocks, scoped under .mail-html', () => {
        const out = sanitizeEmailHtml('<style>body { color: red; }</style><p>x</p>', true);

        expect(out).toContain('<style>');
        expect(out).toContain('.mail-html body');
        expect(out).toContain('<p>x</p>');
    });

    it('scopes every selector in a comma-separated rule', () => {
        const out = sanitizeEmailHtml('<style>h1, h2 { color: red; }</style>', true);

        expect(out).toContain('.mail-html h1');
        expect(out).toContain('.mail-html h2');
    });

    it('scopes each rule when several follow one another', () => {
        const out = sanitizeEmailHtml('<style>a { color: blue; } b { color: red; }</style>', true);

        expect(out).toContain('.mail-html a');
        expect(out).toContain('.mail-html b');
    });

    /**
     * The previous pattern (/([^\s@{}][^{}]*?)\{/g) excluded '@' only at the
     * first character it tried, so for "@media print {" it started matching one
     * character later and emitted "@.mail-html media print {" — invalid CSS
     * that drops the whole block. The at-rule guard never fired because the
     * captured selector was "media print", not "@media print".
     */
    it('does not mangle @media, and still scopes the rules inside it', () => {
        const out = sanitizeEmailHtml('<style>@media print { p { color: red; } }</style>', true);

        expect(out).toContain('@media print');
        expect(out).not.toContain('@.mail-html');
        expect(out).toContain('.mail-html p');
    });

    it('leaves @font-face alone', () => {
        const out = sanitizeEmailHtml('<style>@font-face { font-family: X; }</style>', true);

        expect(out).toContain('@font-face');
        expect(out).not.toContain('.mail-html @font-face');
        expect(out).not.toContain('@.mail-html');
    });

    // ---- the style path is live now, so its CSS sanitising must hold ----

    it('strips CSS expression() from a style block', () => {
        const out = sanitizeEmailHtml('<style>p { width: expression(alert(1)); }</style>', true);

        expect(out).not.toContain('expression(');
        expect(out).not.toContain('alert');
    });

    it('strips behavior: and -moz-binding from a style block', () => {
        const out = sanitizeEmailHtml(
            '<style>p { behavior: url(x.htc); -moz-binding: url(y.xml); }</style>',
            true,
        );

        expect(out).not.toContain('behavior:');
        expect(out).not.toContain('-moz-binding:');
    });

    it('strips @import so an email cannot pull in an external stylesheet', () => {
        const out = sanitizeEmailHtml('<style>@import url(https://evil.example/x.css);</style>', true);

        expect(out).not.toContain('@import');
        expect(out).not.toContain('evil.example');
    });

    it('strips cross-origin url() from a style block, including protocol-relative', () => {
        const out = sanitizeEmailHtml(
            '<style>p { background: url(//evil.example/pixel.png); }</style>',
            true,
        );

        expect(out).not.toContain('evil.example');
    });

    it('strips javascript: url() from a style block', () => {
        const out = sanitizeEmailHtml('<style>p { background: url(javascript:alert(1)); }</style>', true);

        expect(out).not.toContain('javascript:');
    });

    it('still strips script tags when FORCE_BODY is in play', () => {
        // FORCE_BODY changes the parse context, so re-assert the basics hold.
        const out = sanitizeEmailHtml('<style>a{color:red}</style><script>alert(1)</script>', true);

        expect(out).not.toContain('<script');
        expect(out).not.toContain('alert(1)');
        expect(out).toContain('.mail-html a');
    });

    it('neutralises javascript: URLs in anchors', () => {
        const out = sanitizeEmailHtml('<a href="javascript:alert(1)">x</a>', true);

        expect(out).not.toContain('javascript:');
    });
});
