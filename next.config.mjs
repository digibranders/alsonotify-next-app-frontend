
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'github.com',
            },
            {
                protocol: 'https',
                hostname: '*.s3.amazonaws.com',
            },
            {
                protocol: 'https',
                hostname: '*.s3.*.amazonaws.com',
            },
        ],
        // Image optimization enabled (default behavior)
    },
    // Performance optimizations
    compiler: {
        // Remove console logs in production
        removeConsole: process.env.NODE_ENV === 'production' ? {
            exclude: ['error', 'warn'],
        } : false,
    },
    // Enable experimental features for better performance
    experimental: {
        optimizePackageImports: [
            '@fluentui/react-icons',
            'lucide-react',
            'antd',
            '@ant-design/icons',
            'date-fns',
        ],
    },
    // Turbopack configuration (Turbopack handles most optimizations automatically)
    turbopack: {
        // Turbopack automatically optimizes bundling and caching
        // File system caching is enabled by default in Next.js 16.1
        // No additional configuration needed - Turbopack is faster out of the box
    },
    // Optimize build output
    // swcMinify is removed as it is default

    // Reduce bundle size
    modularizeImports: {
        'lucide-react': {
            transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
        },
        // @fluentui/react-icons doesn't need transformation - direct imports work fine
    },
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            // unsafe-inline required for Next.js inline scripts/styles; replace with nonce-based CSP as next step
                            "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
                            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                            "img-src 'self' data: blob: https://s3.amazonaws.com https://*.s3.amazonaws.com https://*.s3.*.amazonaws.com",
                            "font-src 'self' data: https://fonts.gstatic.com",
                            `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'} https://*.sentry.io https://challenges.cloudflare.com ws: wss:`,
                            "frame-src 'self' https://challenges.cloudflare.com",
                            "object-src 'none'",
                            "base-uri 'self'",
                            "form-action 'self'",
                        ].join('; '),
                    },
                ],
            },
        ];
    },
};

export default nextConfig;
