import type { Metadata } from "next";
import Link from "next/link";

// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: "Privacy | Jays for Jeans",
  description: "How Jays for Jeans handles game scores, local preferences, analytics, cookies, and advertising data.",
};

export default function PrivacyPage() {
  return (
    <main className="privacy-shell">
      <article className="privacy-page">
        <Link className="privacy-home" href="/">← Back to the game</Link>
        <img className="privacy-logo" src="/jaysforjeans-logo.png" alt="Jays for Jeans" />
        <h1>PRIVACY</h1>
        <p className="privacy-updated">Last updated 28 August 2026</p>

        <div className="privacy-content">
          <section>
            <h2>What the game stores</h2>
            <p>
              Jays for Jeans stores your best level and sound preference in your browser. This information stays on your device and can be removed by clearing this site&apos;s browser storage.
            </p>
          </section>

          <section>
            <h2>Leaderboard scores</h2>
            <p>
              If you choose to submit a score, we store the nickname you enter, your score and level statistics, and the submission time. Scores are used to operate the public leaderboard. Please do not use your full name or include personal information in a nickname.
            </p>
          </section>

          <section>
            <h2>Analytics</h2>
            <p>
              We use Vercel Analytics and Google Analytics 4 to understand aggregate site usage and game events such as starts, level completions, run outcomes, replays, and personal bests. These tools may use cookies or similar technologies to measure traffic sources, devices, and browsers. We do not send leaderboard nicknames, email addresses, or device identifiers in game analytics events.
            </p>
            <p>
              Google Analytics is loaded only when configured for this site. Like our existing advertising setup, analytics currently runs without a separate consent banner; if UK consent requirements change, we may add controls aligned with our advertising approach.
            </p>
          </section>

          <section>
            <h2>Advertising and cookies</h2>
            <p>
              This site may display advertising supplied by Google AdSense. Third-party vendors, including Google, may use cookies or similar technologies to serve ads based on visits to this and other websites. Google&apos;s advertising cookies enable Google and its partners to personalise ads where consent has been given. You can manage personalised advertising in <a href="https://adssettings.google.com/" rel="noreferrer">Google Ads Settings</a>.
            </p>
          </section>

          <section>
            <h2>Your choices</h2>
            <ul>
              <li>Submitting a leaderboard score is optional.</li>
              <li>You can clear local game preferences through your browser settings.</li>
              <li>Where required, an advertising consent message will let you accept, reject, or manage advertising choices.</li>
            </ul>
          </section>

          <section>
            <h2>Changes</h2>
            <p>We may update this notice when the game, leaderboard, analytics, or advertising setup changes. The date above shows the latest revision.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
