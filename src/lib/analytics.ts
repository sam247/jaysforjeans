import { track } from "@vercel/analytics";

export type GameEventName =
  | "game_start"
  | "level_complete"
  | "game_complete"
  | "game_replay"
  | "golden_jay_caught"
  | "personal_best"
  | "leaderboard_view"
  | "leaderboard_submit_success"
  | "leaderboard_submit_fail";

export type GameEventProperties = Record<string, string | number | boolean>;

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function trackVercel(name: GameEventName, properties?: GameEventProperties) {
  track(name, properties);
}

function trackGa4(name: GameEventName, properties?: GameEventProperties) {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;
  const gtag = window.gtag;
  if (!gtag) return;
  gtag("event", name, properties);
}

/**
 * Dispatches a game event to Vercel Analytics and GA4.
 * Vercel receives `vercelProperties`; GA4 receives `ga4Properties` when provided,
 * otherwise the same payload as Vercel.
 */
export function trackGameEvent(
  name: GameEventName,
  vercelProperties?: GameEventProperties,
  ga4Properties?: GameEventProperties,
) {
  try {
    trackVercel(name, vercelProperties);
  } catch {
    // Analytics must never affect play.
  }
  try {
    trackGa4(name, ga4Properties ?? vercelProperties);
  } catch {
    // Analytics must never affect play.
  }
}

export function isGa4Configured() {
  return Boolean(GA_MEASUREMENT_ID);
}
