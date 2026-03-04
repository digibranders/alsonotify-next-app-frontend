import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import '../styles/globals.css';
import { AntDesignProvider } from '../components/AntDesignProvider';
import ReactQueryProvider from '../provider/ReactQueryClient';
import BrowserPolyfills from '../components/BrowserPolyfills';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
  weight: ['300', '400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Alsonotify',
  description: 'Alsonotify - Project management Tool',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${manrope.className}`} suppressHydrationWarning>
        <BrowserPolyfills />
        <ReactQueryProvider>
          <AntDesignProvider>
            {children}
            <SpeedInsights />
            <Analytics />
            <Toaster position="top-right" richColors closeButton />
          </AntDesignProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
