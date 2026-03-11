import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { checkRateLimit } from '@/lib/rate-limit';

const ipStore = new Map<string, { count: number; resetAt: number }>();
const tenantStore = new Map<string, { count: number; resetAt: number }>();

const protectedRoutes = ['/dashboard', '/settings', '/invoices', '/customers', '/reports'];
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

function getClientIp(req: NextRequest): string {
  // Try CF-Connecting-IP, X-Forwarded-For, or fallback to remote address
  return req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // Rate limiting for API routes
  if (pathname.startsWith('/api')) {
    if (pathname.startsWith('/api/auth/')) {
      // Auth routes: 100 req/min per IP
      if (!checkRateLimit(`auth:${ip}`, ipStore, 100, 60 * 1000)) {
        return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests', status: 429 } }, { status: 429 });
      }
    } else if (pathname.startsWith('/api/v1/')) {
      // General API: try to rate limit by tenant
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      const tenantId = token?.tenantId as string | undefined;
      const limitKey = tenantId ? `tenant:${tenantId}` : `ip:${ip}`;
      if (!checkRateLimit(limitKey, tenantStore, 1000, 60 * 1000)) {
        return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Too many requests', status: 429 } }, { status: 429 });
      }
    }
  }

  // Allow static files and other routes to proceed with page auth checks below
  if (pathname.startsWith('/_next') || pathname.startsWith('/static')) {
    return NextResponse.next();
  }

  // Page route protection
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthPage = authRoutes.some((route) => pathname.startsWith(route));

  if (isProtected) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      const url = new URL('/login', request.url);
      return NextResponse.redirect(url);
    }

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