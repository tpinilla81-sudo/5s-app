import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

// Force dynamic rendering — prevent Next.js from caching this layout
export const dynamic = 'force-dynamic';
// Set revalidation to 0 — never use stale cache
export const revalidate = 0;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Metodología 5S",
  description: "Aplicación para la implementación de la metodología 5S en empresas. Seguimiento de progreso y mejora continua.",
  keywords: ["5S", "metodología", "lean", "mejora continua", "Seiri", "Seiton", "Seiso", "Seiketsu", "Shitsuke"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Register service worker that clears all caches
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').then(function(reg) {
                  console.log('Cache-busting SW registered:', reg.scope);
                  // Force update
                  reg.update();
                }).catch(function(err) {
                  console.log('SW registration failed:', err);
                });
                // Also clear all caches directly
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    for (var name of names) {
                      caches.delete(name);
                    }
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
