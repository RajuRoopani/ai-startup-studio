import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-startup-studio.com";
const DESCRIPTION =
  "8 AI specialists tear apart your startup idea and build a complete investor-ready package in ~15 minutes. Market analysis, VC stress test, MVP spec, GTM strategy, financial model — live.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AI Startup Studio — Your startup idea, built by 8 AI specialists",
    template: "%s · AI Startup Studio",
  },
  description: DESCRIPTION,
  keywords: [
    "startup idea validator",
    "AI startup analysis",
    "pitch deck generator",
    "market analysis AI",
    "VC feedback AI",
    "startup studio",
    "idea radar",
    "Claude AI",
  ],
  authors: [{ name: "AI Startup Studio", url: SITE_URL }],
  creator: "AI Startup Studio",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "AI Startup Studio",
    title: "AI Startup Studio — Your startup idea, torn apart then built",
    description: "8 AI specialists · 4-phase pipeline · investor-ready package in ~15 min",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Startup Studio — Your startup idea, torn apart then built",
    description: "8 AI specialists · 4-phase pipeline · investor-ready package in ~15 min",
    creator: "@RajuRoopani",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-surface text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
