import Link from "next/link";
import type { ReactNode } from "react";

import { SiteNav } from "@/components/site-nav";

type ContentPageProps = { eyebrow: string; title: string; intro: ReactNode; children: ReactNode };

export function ContentPage({ eyebrow, title, intro, children }: ContentPageProps) {
  return (
    <main className="content-shell">
      <div className="content-ambient" aria-hidden="true" />
      <article className="content-page">
        <header className="content-header">
          <Link href="/" aria-label="Play Jays for Jeans">
            <img className="content-logo" src="/jaysforjeans-logo.png" alt="Jays for Jeans" />
          </Link>
          <SiteNav />
          <p className="content-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <div className="content-intro">{intro}</div>
        </header>
        <div className="content-card">{children}</div>
        <footer className="content-footer">
          <SiteNav />
          <Link href="/privacy">Privacy</Link>
        </footer>
      </article>
    </main>
  );
}
