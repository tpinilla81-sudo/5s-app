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
        {/* Service Worker registration + aggressive auto-update + cache busting */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // STEP 1: Clear all caches immediately on page load
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    names.forEach(function(name) { caches.delete(name); });
                  });
                }

                // STEP 2: Register service worker with updateViaCache: 'none'
                if ('serviceWorker' in navigator) {
                  // Unregister any existing SW first to force fresh registration
                  navigator.serviceWorker.getRegistration().then(function(existingReg) {
                    if (existingReg) {
                      existingReg.unregister().then(function() {
                        console.log('[App] Unregistered old Service Worker');
                        registerFreshSW();
                      });
                    } else {
                      registerFreshSW();
                    }
                  }).catch(function() {
                    registerFreshSW();
                  });
                }

                function registerFreshSW() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
                    .then(function(reg) {
                      console.log('[App] Service Worker registered:', reg.scope);

                      // Force update check immediately
                      reg.update();

                      // Check for updates every 60 seconds (aggressive)
                      setInterval(function() {
                        reg.update();
                      }, 60000);

                      // When a new SW is found, force it to activate
                      reg.addEventListener('updatefound', function() {
                        var newWorker = reg.installing;
                        newWorker.addEventListener('statechange', function() {
                          if (newWorker.state === 'installed') {
                            // New version available - force activate
                            console.log('[App] New SW installed, forcing activation...');
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                          }
                        });
                      });

                      // When controller changes (new SW activated), hard reload
                      navigator.serviceWorker.addEventListener('controllerchange', function() {
                        console.log('[App] New Service Worker activated, hard reloading...');
                        window.location.reload();
                      });
                    })
                    .catch(function(err) {
                      console.warn('[App] Service Worker registration failed:', err);
                    });
                }

                // STEP 3: Periodic version check via /version endpoint
                var currentVersion = null;
                function checkVersion() {
                  fetch('/version', { cache: 'no-store' })
                    .then(function(r) { return r.text(); })
                    .then(function(v) {
                      if (currentVersion === null) {
                        currentVersion = v;
                      } else if (currentVersion !== v) {
                        console.log('[App] Version changed from', currentVersion, 'to', v);
                        if ('caches' in window) {
                          caches.keys().then(function(names) {
                            names.forEach(function(name) { caches.delete(name); });
                          });
                        }
                        window.location.reload();
                      }
                    })
                    .catch(function() {});
                }

                // Check version every 60 seconds
                checkVersion();
                setInterval(checkVersion, 60000);

                // STEP 4: On page visibility change, check for updates
                document.addEventListener('visibilitychange', function() {
                  if (!document.hidden && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistration().then(function(reg) {
                      if (reg) {
                        reg.update();
                        // Also clear caches when tab becomes visible
                        if ('caches' in window) {
                          caches.keys().then(function(names) {
                            names.forEach(function(name) { caches.delete(name); });
                          });
                        }
                      }
                    });
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
