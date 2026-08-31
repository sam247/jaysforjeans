import type { Metadata } from "next";
import Link from "next/link";

import { ContentPage } from "@/components/content-page";
import { LeaderboardPage } from "@/components/leaderboard-page";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: "Jays for Jeans High Scores | Surrey Quays Leaderboard",
  description: "See the latest Jays for Jeans leaderboard and find out who has survived the most levels in Surrey Quays.",
  alternates: { canonical: "/high-scores" },
};

export default function HighScoresPage() {
  return (
    <ContentPage eyebrow="Surrey Quays leaderboard" title="Top Jays" intro={<p>The best trouser catchers in Surrey Quays.</p>}>
      <LeaderboardPage />
      <section>
        <h2>How the rankings work</h2>
        <p>Players are ranked primarily by the highest level reached. If players reach the same level, progress towards that level&apos;s target separates them. Total Jays caught provides the next comparison.</p>
      </section>
      <section>
        <h2>Can you beat them?</h2>
        <p>There is only one way onto the board.</p>
      </section>
      <div className="content-cta">
        <Link className="arcade-button arcade-button--content" href="/">Play the game</Link>
      </div>
    </ContentPage>
  );
}
