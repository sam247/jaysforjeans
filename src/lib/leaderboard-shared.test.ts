import { describe, expect, it } from "vitest";

import {
  DEFAULT_BOARD_ID,
  leaderboardRankScore,
  sanitizeBoardId,
  validateNickname,
} from "@/lib/leaderboard-shared";

describe("leaderboard input safety", () => {
  it("only allows whitelisted board identifiers", () => {
    expect(sanitizeBoardId("wetherspoons")).toBe("wetherspoons");
    expect(sanitizeBoardId("../../somewhere")).toBe(DEFAULT_BOARD_ID);
    expect(sanitizeBoardId(null)).toBe(DEFAULT_BOARD_ID);
  });

  it("trims and normalises a safe nickname", () => {
    expect(validateNickname("  Trouser   Wizard  ")).toEqual({
      ok: true,
      nickname: "Trouser Wizard",
    });
  });

  it("rejects long names, contact details, URLs, unsafe characters and basic profanity", () => {
    expect(validateNickname("This nickname is far too long").ok).toBe(false);
    expect(validateNickname("jay@example.com").ok).toBe(false);
    expect(validateNickname("www.example.com").ok).toBe(false);
    expect(validateNickname("Jay<script>").ok).toBe(false);
    expect(validateNickname("F-u-c-k").ok).toBe(false);
  });

  it("orders runs by level, then failed-level progress, then total Jays", () => {
    const lowerLevel = leaderboardRankScore({ highestLevel: 7, progress: 16, totalJays: 75 });
    const moreProgress = leaderboardRankScore({ highestLevel: 8, progress: 12, totalJays: 81 });
    const lessProgress = leaderboardRankScore({ highestLevel: 8, progress: 9, totalJays: 90 });
    const totalTieBreak = leaderboardRankScore({ highestLevel: 8, progress: 12, totalJays: 82 });
    expect(moreProgress).toBeGreaterThan(lowerLevel);
    expect(moreProgress).toBeGreaterThan(lessProgress);
    expect(totalTieBreak).toBeGreaterThan(moreProgress);
  });
});
