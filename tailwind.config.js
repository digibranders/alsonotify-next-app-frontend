/* eslint-env node */
/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            fontFamily: {
                manrope: ['var(--font-manrope)', 'sans-serif'],
            },
            colors: {
                border: "var(--border)",
                input: "var(--input)",
                ring: "var(--ring)",
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT: "var(--primary)",
                    foreground: "var(--primary-foreground)",
                },
                secondary: {
                    DEFAULT: "var(--secondary)",
                    foreground: "var(--secondary-foreground)",
                },
                destructive: {
                    DEFAULT: "var(--destructive)",
                    foreground: "var(--destructive-foreground)",
                },
                muted: {
                    DEFAULT: "var(--muted)",
                    foreground: "var(--muted-foreground)",
                },
                accent: {
                    DEFAULT: "var(--accent)",
                    foreground: "var(--accent-foreground)",
                },
                popover: {
                    DEFAULT: "var(--popover)",
                    foreground: "var(--popover-foreground)",
                },
                card: {
                    DEFAULT: "var(--card)",
                    foreground: "var(--card-foreground)",
                },
                sidebar: {
                    DEFAULT: "var(--sidebar)",
                    foreground: "var(--sidebar-foreground)",
                    primary: "var(--sidebar-primary)",
                    "primary-foreground": "var(--sidebar-primary-foreground)",
                    accent: "var(--sidebar-accent)",
                    "accent-foreground": "var(--sidebar-accent-foreground)",
                    border: "var(--sidebar-border)",
                    ring: "var(--sidebar-ring)",
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                shimmer: "shimmer 2s infinite",
            },
            fontSize: {
                '4xs': ['0.5rem', { lineHeight: '0.75rem' }], // 8px
                '3xs': ['0.5625rem', { lineHeight: '0.875rem' }], // 9px
                'xxs': ['0.625rem', { lineHeight: '1rem' }], // 10px
                'xs-tight': ['0.6875rem', { lineHeight: '1rem' }], // 11px
                'xs': ['0.75rem', { lineHeight: '1.25rem' }], // 12px
                'sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px
                'sm-plus': ['0.9375rem', { lineHeight: '1.25rem' }], // 15px
                'base': ['1rem', { lineHeight: '1.5rem' }], // 16px
                'base-plus': ['1.0625rem', { lineHeight: '1.625rem' }], // 17px
                'lg': ['1.125rem', { lineHeight: '1.75rem' }], // 18px
                'xl': ['1.25rem', { lineHeight: '1.75rem' }], // 20px
                '2xl': ['1.5rem', { lineHeight: '1.75rem' }], // 24px
                '3xl': ['1.75rem', { lineHeight: '2.25rem' }], // 28px
                '5xl': ['3rem', { lineHeight: '1.1' }], // 48px
                '6xl': ['3.5rem', { lineHeight: '1.1' }], // 56px
            },
        },
    },
    plugins: [],
}
