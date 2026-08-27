import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import {
  BOARD_LABELS,
  leaderboardRankScore,
  sanitizeBoardId,
  validateNickname,
  type BoardId,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "@/lib/leaderboard-shared";
import {
  MAX_VALIDATED_LEVEL,
  getLevelTarget,
  maximumRunJays,
  minimumRunJays,
} from "@/lib/jays-game-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RoundToken = {
  board: BoardId;
  issuedAt: number;
  nonce: string;
};

const redisUrl = () =>
  (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.replace(/\/+$/, "");
const redisToken = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const signingSecret = () => process.env.LEADERBOARD_SIGNING_SECRET;
const isConfigured = () => Boolean(redisUrl() && redisToken() && signingSecret());

function jsonUnavailable(board: BoardId) {
  return NextResponse.json({ available: false, board, boardLabel: BOARD_LABELS[board] });
}

async function redisCommand(command: Array<string | number>) {
  const response = await fetch(redisUrl()!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = (await response.json()) as { result?: unknown; error?: string };
  if (!response.ok || data.error) throw new Error(data.error || "Leaderboard storage failed.");
  return data.result;
}

async function redisPipeline(commands: Array<Array<string | number>>) {
  const response = await fetch(`${redisUrl()!}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redisToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  const data = (await response.json()) as Array<{ result?: unknown; error?: string }>;
  if (!response.ok || !Array.isArray(data) || data.some((item) => item.error)) {
    throw new Error("Leaderboard storage failed.");
  }
  return data;
}

function londonDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function londonWeek(now = new Date()) {
  const date = new Date(`${londonDate(now)}T12:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date.toISOString().slice(0, 10);
}

function boardKey(board: BoardId, period: LeaderboardPeriod, now = new Date()) {
  if (period === "today") return `jfj:v2:${board}:day:${londonDate(now)}`;
  if (period === "week") return `jfj:v2:${board}:week:${londonWeek(now)}`;
  return `jfj:v2:${board}:all`;
}

function signPayload(payload: string) {
  return createHmac("sha256", signingSecret()!).update(payload).digest("base64url");
}

function issueRoundToken(board: BoardId) {
  const payload = Buffer.from(
    JSON.stringify({ board, issuedAt: Date.now(), nonce: randomUUID() } satisfies RoundToken),
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

function verifyRoundToken(token: unknown): RoundToken | null {
  if (typeof token !== "string" || token.length > 600) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(signPayload(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as RoundToken;
    if (
      !parsed ||
      typeof parsed.issuedAt !== "number" ||
      typeof parsed.nonce !== "string" ||
      sanitizeBoardId(parsed.board) !== parsed.board
    ) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function readEntries(board: BoardId, period: LeaderboardPeriod) {
  const result = await redisCommand(["ZRANGE", boardKey(board, period), 0, 9, "REV", "WITHSCORES"]);
  if (!Array.isArray(result)) return [];
  const entries: LeaderboardEntry[] = [];
  for (let index = 0; index < result.length; index += 2) {
    try {
      const member = JSON.parse(String(result[index])) as Omit<LeaderboardEntry, "rank">;
      if (
        !member.nickname || !Number.isFinite(Number(result[index + 1])) ||
        !Number.isInteger(member.highestLevel) || !Number.isInteger(member.progress) ||
        !Number.isInteger(member.target) || !Number.isInteger(member.totalJays)
      ) continue;
      entries.push({ rank: entries.length + 1, ...member });
    } catch {
      // Ignore malformed legacy entries rather than failing the board.
    }
  }
  return entries;
}

export async function GET(request: NextRequest) {
  const board = sanitizeBoardId(request.nextUrl.searchParams.get("board"));
  if (!isConfigured()) return jsonUnavailable(board);
  const action = request.nextUrl.searchParams.get("action");

  if (action === "status") {
    return NextResponse.json({ available: true, board, boardLabel: BOARD_LABELS[board] });
  }
  if (action === "session") {
    return NextResponse.json({
      available: true,
      board,
      boardLabel: BOARD_LABELS[board],
      token: issueRoundToken(board),
    });
  }

  const requestedPeriod = request.nextUrl.searchParams.get("period");
  const period: LeaderboardPeriod = requestedPeriod === "week" || requestedPeriod === "all" ? requestedPeriod : "today";
  try {
    const entries = await readEntries(board, period);
    return NextResponse.json({ available: true, board, boardLabel: BOARD_LABELS[board], entries });
  } catch {
    return NextResponse.json({ available: false, board, boardLabel: BOARD_LABELS[board], entries: [] }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!isConfigured()) return NextResponse.json({ error: "Leaderboard unavailable." }, { status: 503 });
  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  let claimedNonce: string | undefined;
  try {
    const input = (await request.json()) as Record<string, unknown>;
    const board = sanitizeBoardId(typeof input.board === "string" ? input.board : null);
    if (input.board !== board) return NextResponse.json({ error: "Unknown board." }, { status: 400 });
    const nicknameResult = validateNickname(input.nickname);
    if (!nicknameResult.ok) return NextResponse.json({ error: nicknameResult.error }, { status: 400 });
    const highestLevel = Number(input.highestLevel);
    const progress = Number(input.progress);
    const target = Number(input.target);
    const totalJays = Number(input.totalJays);
    const goldenJays = Number(input.goldenJays);
    const misses = Number(input.misses);
    const integerValues = [highestLevel, progress, target, totalJays, goldenJays, misses];
    if (integerValues.some((value) => !Number.isInteger(value) || value < 0)) {
      return NextResponse.json({ error: "That run is outside the possible range." }, { status: 400 });
    }
    const expectedTarget = getLevelTarget(highestLevel);
    const validTotals = totalJays >= minimumRunJays(highestLevel, progress)
      && totalJays <= maximumRunJays(highestLevel, progress);
    if (
      highestLevel < 1 || highestLevel > MAX_VALIDATED_LEVEL ||
      target !== expectedTarget || progress >= target || !validTotals ||
      goldenJays * 5 > totalJays || (highestLevel < 4 && goldenJays > 0) || misses > 2_000
    ) {
      return NextResponse.json({ error: "That run is outside the possible range." }, { status: 400 });
    }

    const round = verifyRoundToken(input.token);
    const elapsedMs = round ? Date.now() - round.issuedAt : 0;
    const minimumElapsedMs = 10_000 + Math.max(0, highestLevel - 1) * 1_500;
    if (!round || round.board !== board || elapsedMs < minimumElapsedMs || elapsedMs > 1_800_000) {
      return NextResponse.json({ error: "This round could not be verified." }, { status: 400 });
    }

    const claimed = await redisCommand(["SET", `jfj:v2:run:${round.nonce}`, "1", "NX", "EX", 1800]);
    if (claimed !== "OK") return NextResponse.json({ error: "This round was already submitted." }, { status: 429 });
    claimedNonce = round.nonce;

    const createdAt = new Date().toISOString();
    const member = JSON.stringify({
      id: round.nonce,
      nickname: nicknameResult.nickname,
      highestLevel,
      progress,
      target,
      totalJays,
      createdAt,
    });
    const rankScore = leaderboardRankScore({ highestLevel, progress, totalJays });
    const todayKey = boardKey(board, "today");
    const weekKey = boardKey(board, "week");
    const allKey = boardKey(board, "all");
    await redisPipeline([
      ["ZADD", todayKey, rankScore, member],
      ["EXPIRE", todayKey, 172_800],
      ["ZADD", weekKey, rankScore, member],
      ["EXPIRE", weekKey, 1_209_600],
      ["ZADD", allKey, rankScore, member],
    ]);

    const entries = await readEntries(board, "today");
    return NextResponse.json({ available: true, board, boardLabel: BOARD_LABELS[board], entries });
  } catch {
    if (claimedNonce) {
      await redisCommand(["DEL", `jfj:v2:run:${claimedNonce}`]).catch(() => undefined);
    }
    return NextResponse.json({ error: "Leaderboard submission failed." }, { status: 503 });
  }
}
