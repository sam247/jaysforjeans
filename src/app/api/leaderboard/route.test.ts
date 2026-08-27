import { NextRequest } from "next/server";
import { afterEach, describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/leaderboard/route";

const environmentKeys = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "LEADERBOARD_SIGNING_SECRET",
] as const;

describe("leaderboard route without configured persistence", () => {
  const previous = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));

  afterEach(() => {
    environmentKeys.forEach((key) => {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  });

  it("reports unavailable without exposing or inventing scores", async () => {
    environmentKeys.forEach((key) => delete process.env[key]);
    const response = await GET(new NextRequest("http://localhost/api/leaderboard?action=status&board=unknown"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      available: false,
      board: "surrey-quays",
      boardLabel: "Surrey Quays",
    });
  });

  it("fails score submission safely when storage is unavailable", async () => {
    environmentKeys.forEach((key) => delete process.env[key]);
    const response = await POST(
      new NextRequest("http://localhost/api/leaderboard", {
        method: "POST",
        body: JSON.stringify({
          board: "surrey-quays", nickname: "Jay", highestLevel: 3, progress: 4,
          target: 9, totalJays: 16, goldenJays: 0, misses: 5, token: "nope",
        }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Leaderboard unavailable." });
  });

  it("rejects impossible client-supplied level progress before storage", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.invalid";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    process.env.LEADERBOARD_SIGNING_SECRET = "test-secret";
    const response = await POST(
      new NextRequest("http://localhost/api/leaderboard", {
        method: "POST",
        body: JSON.stringify({
          board: "surrey-quays", nickname: "Jay", highestLevel: 1_000, progress: 1,
          target: 42, totalJays: 99_999, goldenJays: 0, misses: 0, token: "nope",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "That run is outside the possible range." });
  });
});
