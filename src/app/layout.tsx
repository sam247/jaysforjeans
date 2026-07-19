import type { Metadata } from "next";
import { Fredoka, Quicksand } from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

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
  title: "Jays for Jeans | Coming Soon",
  description:
    "Jays for Jeans is stitching something special together. Join the launch list to hear when we go live.",
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
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
