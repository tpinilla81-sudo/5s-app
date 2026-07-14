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
