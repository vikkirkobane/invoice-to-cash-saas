import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const protectedRoutes = ['/dashboard', '/settings', '/invoices', '/customers', '/reports'];
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files and API routes to bypass
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthPage = authRoutes.some((route) => pathname.startsWith(route));

  if (isProtected) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }

    // Verify email for any protected access
    // In real app you'd check email_verified flag from DB; placeholder here
    // if (!token.emailVerified) { ... }

    // Add tenantId and role to headers for downstream route handlers
    const response = NextResponse.next();
    response.headers.set('x-tenant-id', token.tenantId as string);
    response.headers.set('x-user-role', token.role as string);
    return response;
  }

  if (isAuthPage) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};