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
  title: "How Many Jays Can You Get Into Jeans?",
  description:
    "Catch as many falling Jays as you can in 30 seconds. A tiny trouser-based arcade game from Jays for Jeans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
