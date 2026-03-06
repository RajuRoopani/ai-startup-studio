import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Startup Studio",
  description: "8 AI specialists tear apart your startup idea and build a complete investor-ready package in minutes.",
  openGraph: {
    title: "AI Startup Studio",
    description: "8 AI specialists. Your startup idea. 20 minutes to a complete package.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
