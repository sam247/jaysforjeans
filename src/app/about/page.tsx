import type { Metadata } from "next";
import Link from "next/link";

import { ContentPage } from "@/components/content-page";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: "About Jays for Jeans | Surrey Quays",
  description: "The story behind Jays for Jeans, the browser game inspired by a sign in Surrey Quays, London.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ContentPage eyebrow="The extremely short origin story" title="Why Does Jays for Jeans Exist?" intro={<p>Jays for Jeans started with a sign in Surrey Quays and a question: what should happen when someone actually visits jaysforjeans.co.uk?</p>}>
      <section>
        <h2>We made a game instead</h2>
        <p>The sensible answer would probably have been a normal website.</p>
        <p>Instead, there is now an original browser game where you catch Jays in jeans. It is built for quick mobile play, needs no account and offers an optional local Surrey Quays leaderboard for anyone willing to attach a nickname to their trouser-catching ability.</p>
        <p>The levels become increasingly ridiculous. That is essentially the story.</p>
      </section>
      <section>
        <h2>Why Surrey Quays?</h2>
        <p>The physical sign that inspired and points people towards this site is in Surrey Quays, London. Jays for Jeans is independent and is not associated with, endorsed by or operated by any nearby business.</p>
      </section>
      <section>
        <h2>What happens next?</h2>
        <p>Mostly, we want to know how many levels somebody can actually survive.</p>
      </section>
      <div className="content-cta content-cta--split">
        <Link className="arcade-button arcade-button--content" href="/">Play Jays for Jeans</Link>
        <Link className="secondary-button" href="/high-scores">View high scores</Link>
      </div>
    </ContentPage>
  );
}
