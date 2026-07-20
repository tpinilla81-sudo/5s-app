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
        {/* Service Worker registration + auto-update */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Register service worker
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      console.log('[App] Service Worker registered:', reg.scope);
                      
                      // Check for updates every 5 minutes
                      setInterval(function() {
                        reg.update();
                      }, 300000);
                      
                      // When a new SW is waiting, force it to activate
                      reg.addEventListener('updatefound', function() {
                        var newWorker = reg.installing;
                        newWorker.addEventListener('statechange', function() {
                          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available - force activate
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                          }
                        });
                      });
                      
                      // When controller changes (new SW activated), reload page
                      navigator.serviceWorker.addEventListener('controllerchange', function() {
                        console.log('[App] New Service Worker activated, reloading...');
                        window.location.reload();
                      });
                    })
                    .catch(function(err) {
                      console.warn('[App] Service Worker registration failed:', err);
                    });
                  
                  // Also: periodic version check via /version endpoint
                  var currentVersion = null;
                  function checkVersion() {
                    fetch('/version', { cache: 'no-store' })
                      .then(function(r) { return r.text(); })
                      .then(function(v) {
                        if (currentVersion === null) {
                          currentVersion = v;
                        } else if (currentVersion !== v) {
                          // Version changed! Force reload
                          console.log('[App] Version changed from', currentVersion, 'to', v);
                          // Clear all caches
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
                  
                  // Check version every 2 minutes
                  checkVersion();
                  setInterval(checkVersion, 120000);
                }
                
                // Also: on page visibility change, check for updates
                document.addEventListener('visibilitychange', function() {
                  if (!document.hidden && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistration().then(function(reg) {
                      if (reg) reg.update();
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
