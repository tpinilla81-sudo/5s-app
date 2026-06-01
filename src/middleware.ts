import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BUILD_VERSION = 'v2.0-jun2026';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // Special redirect: /fresh -> / with a unique timestamp to bust browser cache
  // Users can navigate to /fresh to force-reload the app
  if (url.pathname === '/fresh') {
    const timestamp = Date.now();
    const redirectUrl = new URL('/', request.url);
    redirectUrl.searchParams.set('_t', timestamp.toString());
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    redirectResponse.headers.set('Pragma', 'no-cache');
    redirectResponse.headers.set('Expires', '0');
    return redirectResponse;
  }

  // Special endpoint: /version - returns just the build version for debugging
  if (url.pathname === '/version') {
    return new NextResponse(BUILD_VERSION, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Build-Version': BUILD_VERSION,
      },
    });
  }

  const response = NextResponse.next();

  // For HTML pages and API routes: NO caching at any level
  if (!url.pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    // Aggressive anti-caching for CDNs and proxies
    response.headers.set('Surrogate-Control', 'no-store');
    response.headers.set('X-Accel-Expires', '0');
    // Add build version header for debugging
    response.headers.set('X-Build-Version', BUILD_VERSION);
    // Remove ETag
    response.headers.delete('ETag');
  }

  return response;
}

// Match ALL routes to ensure nothing is cached except _next/static
export const config = {
  matcher: ['/((?!_next/static).*)'],
};
