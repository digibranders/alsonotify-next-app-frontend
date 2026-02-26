import { describe, it, expect } from 'vitest';
import nextConfig from '../../next.config.mjs';

describe('Security Headers', () => {
  it('should have security headers configured', async () => {
    // @ts-expect-error - headers() is not in the default NextConfig type without augmentation, or simply because it's JS file
    const headersConfig = await nextConfig.headers();
    const globalHeaders = headersConfig.find((h: any) => h.source === '/:path*');

    expect(globalHeaders).toBeDefined();

    if (!globalHeaders) {
      throw new Error('Global headers not found');
    }

    const headers = globalHeaders.headers;
    const headerMap = headers.reduce((acc: any, h: any) => {
      acc[h.key] = h.value;
      return acc;
    }, {});

    expect(headerMap['X-DNS-Prefetch-Control']).toBe('on');
    expect(headerMap['Strict-Transport-Security']).toBe('max-age=63072000; includeSubDomains; preload');
    expect(headerMap['X-Frame-Options']).toBe('SAMEORIGIN');
    expect(headerMap['X-Content-Type-Options']).toBe('nosniff');
    expect(headerMap['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headerMap['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=(), browsing-topics=()');
  });
});
