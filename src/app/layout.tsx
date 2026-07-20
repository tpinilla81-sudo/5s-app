import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Force dynamic rendering — prevents Vercel Edge from caching static HTML
// This ensures every request hits the server and respects cache-control headers
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "5S App — Metodología 5S Digital",
    template: "%s | 5S App",
  },
  description:
    "Plataforma digital para la implementación y seguimiento de la metodología 5S: Seiri, Seiton, Seiso, Seiketsu, Shitsuke. Mejora continua para tu empresa.",
  keywords: [
    "5S", "metodología 5S", "lean manufacturing", "mejora continua",
    "Seiri", "Seiton", "Seiso", "Seiketsu", "Shitsuke",
    "auditoría 5S", "gestión visual", "orden y limpieza",
  ],
  authors: [{ name: "5S App" }],
  creator: "5S App",
  publisher: "5S App",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "5S App",
    title: "5S App — Metodología 5S Digital",
    description:
      "Plataforma digital para implementar y seguir la metodología 5S en tu empresa. Progreso, auditorías y mejora continua.",
    images: [
      {
        url: "/5s-logo.png",
        width: 512,
        height: 512,
        alt: "5S App",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "5S App — Metodología 5S Digital",
    description:
      "Plataforma digital para implementar y seguir la metodología 5S en tu empresa.",
    images: ["/5s-logo.png"],
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/5s-logo.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/5s-logo.png", sizes: "512x512" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "5S App",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        {/* Force no-cache for the HTML shell */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-right" richColors closeButton />
        {/*
          NO Service Worker registration.
          Instead: aggressively UNREGISTER any existing SW and clear ALL caches.
          This is the only reliable way to break out of a stale SW cache loop.
          We keep /sw.js as a self-unregistering passthrough so old SWs get replaced.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // STEP 1: Immediately clear ALL browser caches
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    console.log('[App] Clearing caches:', names);
                    names.forEach(function(name) { caches.delete(name); });
                  });
                }

                // STEP 2: Unregister ALL service workers immediately
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    console.log('[App] Found ' + registrations.length + ' service worker(s), unregistering...');
                    registrations.forEach(function(reg) {
                      reg.unregister();
                    });
                    // If we just unregistered a controlling SW, we need a hard reload
                    if (registrations.length > 0 && navigator.serviceWorker.controller) {
                      console.log('[App] Had active SW — hard reload needed');
                      // Small delay to let unregister complete, then reload
                      setTimeout(function() {
                        window.location.href = window.location.pathname + '?_nocache=' + Date.now();
                      }, 500);
                    }
                  });
                }

                // STEP 3: Version check — auto-reload when new deployment detected
                var currentVersion = null;
                function checkVersion() {
                  fetch('/version?t=' + Date.now(), { cache: 'no-store' })
                    .then(function(r) { return r.text(); })
                    .then(function(v) {
                      if (currentVersion === null) {
                        currentVersion = v;
                      } else if (currentVersion !== v) {
                        console.log('[App] Version changed from', currentVersion, 'to', v);
                        window.location.href = window.location.pathname + '?_nocache=' + Date.now();
                      }
                    })
                    .catch(function() {});
                }
                checkVersion();
                setInterval(checkVersion, 60000);

                // STEP 4: On visibility change, clear caches and check version
                document.addEventListener('visibilitychange', function() {
                  if (!document.hidden) {
                    if ('caches' in window) {
                      caches.keys().then(function(names) {
                        names.forEach(function(name) { caches.delete(name); });
                      });
                    }
                    checkVersion();
                  }
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
