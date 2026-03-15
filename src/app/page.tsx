'use client';

// Root page - redirect to /login via client-side navigation as fallback.
// Primary auth gating is handled by src/proxy.ts (Next.js 16 request interception).
// The proxy checks _token cookie at the request level and redirects:
//   - "/" with token → /dashboard
//   - "/" without token → allows through (this page then redirects to /login)
//   - Protected routes without token → "/" → /login
// See src/hooks/useAuth.ts for client-side token management.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}

