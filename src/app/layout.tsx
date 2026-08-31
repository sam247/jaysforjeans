import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Fredoka, Quicksand } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";

import { GoogleAnalytics } from "@/components/google-analytics";

import "./globals.css";

const bodyFont = Quicksand({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-body",
});

const displayFont = Fredoka({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://jaysforjeans.co.uk"),
  title: "How Many Levels Can Your Jeans Survive?",
  description:
    "Hit each Jay target before time runs out in an endless trouser-based survival game from Jays for Jeans.",
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "Jays for Jeans",
      url: "https://jaysforjeans.co.uk/",
      description: "An original browser game about catching falling Jays in jeans.",
    },
    {
      "@type": "VideoGame",
      name: "Jays for Jeans",
      url: "https://jaysforjeans.co.uk/",
      description: "Catch falling Jays in jeans, meet each level target and survive increasingly difficult levels.",
      gamePlatform: ["Web browser", "Mobile web browser"],
      genre: "Arcade",
      playMode: "SinglePlayer",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <Script
          id="google-adsense"
          async
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3865452541027172"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${bodyFont.variable} ${displayFont.variable} font-sans antialiased`}>
        {children}
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
