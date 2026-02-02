import { NextResponse, NextRequest } from "next/server";

export default async function proxy(req: NextRequest) {
  // 1. Consistency: Access cookies and URL directly
  const hasToken = req.cookies.has("_token");
  const { pathname } = req.nextUrl;

  // 2. Extensibility: explicitly type your routes if this list grows
  const publicRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/company-details",
    "/password-reset"
  ];

  // Optimization: specific check or startsWith
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // 3. Logic: Direct return using NextResponse

  // Root path logic
  if (pathname === "/") {
    if (hasToken) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    // Allow landing page for unauth users
    return NextResponse.next();
  }

  // Protected Routes logic
  if (!isPublicRoute && !hasToken) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Auth Pages logic (already logged in)
  if ((pathname === "/login" || pathname === "/register") && hasToken) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};



