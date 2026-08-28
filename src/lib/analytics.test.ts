import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackMock = vi.hoisted(() => vi.fn());
const gtagMock = vi.hoisted(() => vi.fn());

vi.mock("@vercel/analytics", () => ({ track: trackMock }));

describe("trackGameEvent", () => {
  beforeEach(() => {
    trackMock.mockClear();
    gtagMock.mockClear();
    window.gtag = gtagMock;
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST123");
    vi.resetModules();
  });

  afterEach(() => {
    delete window.gtag;
    vi.unstubAllEnvs();
  });

  async function loadAnalytics() {
    return import("@/lib/analytics");
  }

  it("dispatches to both Vercel Analytics and GA4", async () => {
    const { trackGameEvent } = await loadAnalytics();
    trackGameEvent("game_start");

    expect(trackMock).toHaveBeenCalledOnce();
    expect(trackMock).toHaveBeenCalledWith("game_start", undefined);
    expect(gtagMock).toHaveBeenCalledOnce();
    expect(gtagMock).toHaveBeenCalledWith("event", "game_start", undefined);
  });

  it("sends separate Vercel and GA4 property payloads when provided", async () => {
    const { trackGameEvent } = await loadAnalytics();
    trackGameEvent(
      "level_complete",
      { level: 2, target: 7, total_jays: 12 },
      { level: 2, level_target: 7, total_jays: 12, golden_jays: 1 },
    );

    expect(trackMock).toHaveBeenCalledWith("level_complete", { level: 2, target: 7, total_jays: 12 });
    expect(gtagMock).toHaveBeenCalledWith("event", "level_complete", {
      level: 2,
      level_target: 7,
      total_jays: 12,
      golden_jays: 1,
    });
  });

  it("fails gracefully when GA4 measurement ID is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "");
    const { trackGameEvent } = await loadAnalytics();
    trackGameEvent("game_start");

    expect(trackMock).toHaveBeenCalledOnce();
    expect(gtagMock).not.toHaveBeenCalled();
  });

  it("fails gracefully when gtag is unavailable", async () => {
    delete window.gtag;
    const { trackGameEvent } = await loadAnalytics();
    trackGameEvent("game_start");

    expect(trackMock).toHaveBeenCalledOnce();
    expect(gtagMock).not.toHaveBeenCalled();
  });

  it("does not throw when Vercel Analytics throws", async () => {
    trackMock.mockImplementation(() => {
      throw new Error("vercel down");
    });
    const { trackGameEvent } = await loadAnalytics();

    expect(() => trackGameEvent("game_start")).not.toThrow();
    expect(gtagMock).toHaveBeenCalledOnce();
  });

  it("does not throw when GA4 throws", async () => {
    gtagMock.mockImplementation(() => {
      throw new Error("ga4 down");
    });
    const { trackGameEvent } = await loadAnalytics();

    expect(() => trackGameEvent("game_start")).not.toThrow();
    expect(trackMock).toHaveBeenCalledOnce();
  });

  it("does not send nickname or token fields to GA4", async () => {
    const { trackGameEvent } = await loadAnalytics();
    trackGameEvent(
      "leaderboard_submit_success",
      { board: "surrey-quays", highest_level: 4 },
      { board: "surrey-quays", highest_level: 4, total_jays: 38 },
    );

    const ga4Payload = gtagMock.mock.calls[0]?.[2] as Record<string, unknown> | undefined;
    expect(ga4Payload).toBeDefined();
    expect(ga4Payload).not.toHaveProperty("nickname");
    expect(ga4Payload).not.toHaveProperty("token");
    expect(ga4Payload).not.toHaveProperty("email");
  });

  it("maps personal_best GA4 parameters without previous Vercel fields", async () => {
    const { trackGameEvent } = await loadAnalytics();
    trackGameEvent(
      "personal_best",
      { highest_level: 8, total_jays: 72 },
      { highest_level: 8, previous_best_level: 5 },
    );

    expect(trackMock).toHaveBeenCalledWith("personal_best", { highest_level: 8, total_jays: 72 });
    expect(gtagMock).toHaveBeenCalledWith("event", "personal_best", {
      highest_level: 8,
      previous_best_level: 5,
    });
  });

  it("maps game_replay GA4 parameters while keeping Vercel event property-free", async () => {
    const { trackGameEvent } = await loadAnalytics();
    trackGameEvent("game_replay", undefined, { previous_highest_level: 3, previous_total_jays: 24 });

    expect(trackMock).toHaveBeenCalledWith("game_replay", undefined);
    expect(gtagMock).toHaveBeenCalledWith("event", "game_replay", {
      previous_highest_level: 3,
      previous_total_jays: 24,
    });
  });

  it("maps game_complete and leaderboard failure payloads for GA4", async () => {
    const { trackGameEvent } = await loadAnalytics();
    trackGameEvent("game_complete", {
      highest_level: 4,
      progress_in_failed_level: 3,
      target_in_failed_level: 9,
      total_jays: 31,
      golden_jays: 2,
      misses: 1,
    });
    trackGameEvent(
      "leaderboard_submit_fail",
      { board: "surrey-quays", highest_level: 4 },
      { board: "surrey-quays", failure_category: "submit_error" },
    );

    expect(gtagMock).toHaveBeenCalledWith("event", "game_complete", {
      highest_level: 4,
      progress_in_failed_level: 3,
      target_in_failed_level: 9,
      total_jays: 31,
      golden_jays: 2,
      misses: 1,
    });
    expect(gtagMock).toHaveBeenCalledWith("event", "leaderboard_submit_fail", {
      board: "surrey-quays",
      failure_category: "submit_error",
    });
  });
});
