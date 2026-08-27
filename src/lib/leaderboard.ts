import {
  BOARD_LABELS,
  type BoardId,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type LeaderboardRun,
} from "@/lib/leaderboard-shared";

type StatusResponse = {
  available: boolean;
  board: BoardId;
  boardLabel: string;
};

type SessionResponse = StatusResponse & { token?: string };

type EntriesResponse = StatusResponse & { entries: LeaderboardEntry[] };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Leaderboard unavailable.");
  return data;
}

export async function getLeaderboardStatus(board: BoardId) {
  return requestJson<StatusResponse>(`/api/leaderboard?action=status&board=${board}`);
}

export async function createLeaderboardSession(board: BoardId) {
  return requestJson<SessionResponse>(`/api/leaderboard?action=session&board=${board}`);
}

export async function getLeaderboard(board: BoardId, period: LeaderboardPeriod) {
  return requestJson<EntriesResponse>(`/api/leaderboard?board=${board}&period=${period}`);
}

export async function submitLeaderboardScore(input: {
  board: BoardId;
  nickname: string;
  token: string;
} & LeaderboardRun) {
  return requestJson<EntriesResponse>("/api/leaderboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function boardLabel(board: BoardId) {
  return BOARD_LABELS[board];
}
