import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BUILD_VERSION = '20260720-110042';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // 1. Redirección para limpiar caché manual (/fresh)
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

  // 2. Ruta de depuración de versión
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

  // 3. Health check para monitoring
  if (url.pathname === '/health') {
    return new NextResponse(JSON.stringify({ status: 'ok', version: BUILD_VERSION }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 4. Procesar request normal
  const response = NextResponse.next();

  // Security headers para producción
  // X-Frame-Options: evitar clickjacking (la app no se embebe en iframes)
  response.headers.set('X-Frame-Options', 'DENY');
  // X-Content-Type-Options: evitar MIME-type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // Referrer-Policy: control de información de referencia
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions-Policy: limitar APIs del navegador
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  // X-XSS-Protection: protección legacy contra XSS
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Cache control: no cachear páginas dinámicas, pero sí assets estáticos
  if (!url.pathname.startsWith('/_next/static/') && !url.pathname.startsWith('/_next/image/')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    response.headers.set('X-Accel-Expires', '0');
    response.headers.delete('ETag');
  } else {
    // Assets estáticos: caché agresivo (1 año, inmutable)
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  response.headers.set('X-Build-Version', BUILD_VERSION);

  return response;
}

// Matcher: ignorar archivos estáticos y assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|5s-logo.png|robots.txt|.*\\.png|.*\\.jpg|.*\\.svg|.*\\.ico|.*\\.woff2?).*)'
  ],
};
