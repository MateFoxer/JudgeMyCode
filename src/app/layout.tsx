import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://judge-my-code.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Judge My Code",
    template: "%s | Judge My Code",
  },
  description: "Paste code, choose a review mode, and get brutally honest feedback with practical fixes.",
  keywords: [
    "code review",
    "ai code review",
    "judge my code",
    "programming feedback",
    "gemini code review",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Judge My Code",
    title: "Judge My Code",
    description: "Paste code, choose a review mode, and get brutally honest feedback with practical fixes.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Judge My Code",
    description: "Paste code, choose a review mode, and get brutally honest feedback with practical fixes.",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
