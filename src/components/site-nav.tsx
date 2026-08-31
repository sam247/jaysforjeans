import React from "react";
import Link from "next/link";

const links = [
  { href: "/", label: "Play" },
  { href: "/how-to-play", label: "How to Play" },
  { href: "/high-scores", label: "High Scores" },
  { href: "/about", label: "About" },
];

export function SiteNav({ className = "" }: { className?: string }) {
  return (
    <nav className={`site-nav ${className}`.trim()} aria-label="Jays for Jeans">
      {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
    </nav>
  );
}
