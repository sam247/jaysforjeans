import type { Metadata } from "next";
import Link from "next/link";

import { ContentPage } from "@/components/content-page";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: "How to Play Jays for Jeans",
  description: "Learn how to play Jays for Jeans, catch falling Jays, find Golden Jays and survive increasingly difficult levels.",
  alternates: { canonical: "/how-to-play" },
};

export default function HowToPlayPage() {
  return (
    <ContentPage eyebrow="Jeans at the ready" title="How to Play Jays for Jeans" intro={<><p>Jays are falling.</p><p>You have the jeans.</p><p>You know what to do.</p></>}>
      <section>
        <h2>The objective</h2>
        <p>Catch enough Jays in your jeans before the timer reaches zero. Each level has a target. Reach it and you immediately move to the next level. Miss it and your run is over.</p>
      </section>
      <section>
        <h2>Controls</h2>
        <div className="control-grid">
          <div><h3>Mobile</h3><p>Drag your finger to move the jeans. They lift slightly above your thumb so the waistband stays visible.</p></div>
          <div><h3>Desktop</h3><p>Move with the mouse, or use the Left/Right arrows or A/D keys.</p></div>
        </div>
      </section>
      <section>
        <h2>Scoring</h2>
        <div className="score-pills" aria-label="Jay scoring">
          <div><span className="jay-dot">J</span><p>Normal Jay<strong>+1 Jay</strong></p></div>
          <div className="score-pill--gold"><span className="jay-dot">J</span><p>Golden Jay<strong>+5 Jays</strong></p></div>
        </div>
        <p>Golden Jays become particularly useful when the levels get harder.</p>
      </section>
      <section>
        <h2>Levels</h2>
        <p>Early levels are intentionally forgiving. From there, Jays get faster, their movement gets less predictable and the targets increase. There is no fixed final level.</p>
      </section>
      <section>
        <h2>The leaderboard</h2>
        <p>Completed runs can optionally be submitted to the Surrey Quays leaderboard. Players are ranked by highest level reached, then progress within the failed level, then total Jays caught.</p>
        <p>Compare runs from Today, This Week or All Time.</p>
      </section>
      <div className="content-cta">
        <p>Think you can beat Surrey Quays?</p>
        <Link className="arcade-button arcade-button--content" href="/">Play the game</Link>
      </div>
    </ContentPage>
  );
}
