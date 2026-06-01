import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const url = request.nextUrl;

  // For HTML pages: NO caching (always get the latest version)
  if (!url.pathname.startsWith('/_next/static/') && !url.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  // For static assets (_next/static/*): long cache (they have content hashes in filenames)
  // Next.js already handles this correctly, so we don't override

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|Manual_Usuario_5S.pdf).*)',
  ],
};
