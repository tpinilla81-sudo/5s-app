import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const url = request.nextUrl;

  // For HTML pages and API routes: NO caching at any level
  // This ensures browsers, CDNs, and proxies always fetch fresh content
  if (!url.pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    // Force CDN/proxy to revalidate
    response.headers.set('Surrogate-Control', 'no-store');
    // Remove any ETag that might enable conditional caching
    response.headers.delete('ETag');
  }

  return response;
}

// Match ALL routes to ensure nothing is cached except _next/static (which has content hashes)
export const config = {
  matcher: ['/((?!_next/static).*)'],
};
