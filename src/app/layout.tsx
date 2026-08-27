import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Fredoka, Quicksand } from "next/font/google";
import type { ReactNode } from "react";

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
  title: "How Many Levels Can Your Jeans Survive?",
  description:
    "Hit each Jay target before time runs out in an endless trouser-based survival game from Jays for Jeans.",
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
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3865452541027172"
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${bodyFont.variable} ${displayFont.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
