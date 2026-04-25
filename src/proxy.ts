import { NextResponse, NextRequest } from "next/server";

function hasValidToken(req: NextRequest): boolean {
  const token = req.cookies.get("_token")?.value;
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

export default async function proxy(req: NextRequest) {
  const isAuthenticated = hasValidToken(req);
  const { pathname } = req.nextUrl;

  const publicRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/company-details",
    "/password-reset"
  ];

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Root path logic
  if (pathname === "/") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Protected Routes logic
  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Auth Pages logic (already logged in)
  if ((pathname === "/login" || pathname === "/register") && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
