import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const BUILD_VERSION = 'v2.0-jun2026';

export function middleware(request: NextRequest) {
  const url = request.nextUrl;

  // 1. Redirección especial para limpiar caché manual (/fresh)
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

  // 3. Modificar las cabeceras de caché SIN romper las cookies que vienen del servidor
  const response = NextResponse.next();

  if (!url.pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    response.headers.set('X-Accel-Expires', '0');
    response.headers.set('X-Build-Version', BUILD_VERSION);
    response.headers.delete('ETag');
  }

  return response;
}

// Ignoramos archivos estáticos y assets de la carpeta public para evitar sobrecargar el middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|5s-logo.png|.*\\.png|.*\\.jpg|.*\\.svg).*)'
  ],
};
