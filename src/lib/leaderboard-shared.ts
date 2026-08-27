export const DEFAULT_BOARD_ID = "surrey-quays";
export const MAX_NICKNAME_LENGTH = 16;

export const BOARD_LABELS = {
  "surrey-quays": "Surrey Quays",
  wetherspoons: "Wetherspoons",
} as const;

export type BoardId = keyof typeof BOARD_LABELS;
export type LeaderboardPeriod = "today" | "week" | "all";

export type LeaderboardEntry = {
  rank: number;
  nickname: string;
  highestLevel: number;
  progress: number;
  target: number;
  totalJays: number;
  createdAt: string;
};

export type LeaderboardRun = Omit<LeaderboardEntry, "rank" | "nickname" | "createdAt"> & {
  goldenJays: number;
  misses: number;
};

export function leaderboardRankScore(run: Pick<LeaderboardRun, "highestLevel" | "progress" | "totalJays">) {
  return run.highestLevel * 1_000_000_000 + run.progress * 1_000_000 + Math.min(999_999, run.totalJays);
}

export function sanitizeBoardId(value: string | null | undefined): BoardId {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized in BOARD_LABELS ? (normalized as BoardId) : DEFAULT_BOARD_ID;
}

const blockedWords = [
  "cunt",
  "fuck",
  "nigger",
  "nigga",
  "paki",
  "spastic",
];

export function validateNickname(value: unknown):
  | { ok: true; nickname: string }
  | { ok: false; error: string } {
  if (typeof value !== "string") return { ok: false, error: "Enter a nickname." };
  const nickname = value.trim().replace(/\s+/g, " ");
  if (!nickname) return { ok: false, error: "Enter a nickname." };
  if (nickname.length > MAX_NICKNAME_LENGTH) {
    return { ok: false, error: `Use ${MAX_NICKNAME_LENGTH} characters or fewer.` };
  }
  if (/[^\p{L}\p{N} ._'’-]/u.test(nickname)) {
    return { ok: false, error: "Use letters, numbers and simple punctuation only." };
  }
  if (/\S+@\S+\.\S+/i.test(nickname) || /(?:https?:\/\/|www\.|\.(?:com|net|org|co\.uk)\b)/i.test(nickname)) {
    return { ok: false, error: "Please don’t use an email address or URL." };
  }
  const comparable = nickname.toLowerCase().replace(/[^a-z]/g, "");
  if (blockedWords.some((word) => comparable.includes(word))) {
    return { ok: false, error: "Try a different nickname." };
  }
  return { ok: true, nickname };
}
