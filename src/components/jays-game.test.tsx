import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JaysGame } from "@/components/jays-game";

const trackMock = vi.hoisted(() => vi.fn());
const leaderboardStatusMock = vi.hoisted(() => vi.fn());
const getLeaderboardMock = vi.hoisted(() => vi.fn());
vi.mock("@vercel/analytics", () => ({ track: trackMock }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/lib/leaderboard", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/leaderboard")>();
  return {
    ...actual,
    createLeaderboardSession: async () => ({
      available: false,
      board: "surrey-quays" as const,
      boardLabel: "Surrey Quays",
    }),
    getLeaderboardStatus: leaderboardStatusMock,
    getLeaderboard: getLeaderboardMock,
  };
});

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe("JaysGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    trackMock.mockClear();
    leaderboardStatusMock.mockResolvedValue({
      available: false,
      board: "surrey-quays" as const,
      boardLabel: "Surrey Quays",
    });
    getLeaderboardMock.mockResolvedValue({
      available: true,
      board: "surrey-quays" as const,
      boardLabel: "Surrey Quays",
      period: "today",
      entries: [],
    });
    localStorage.clear();
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("offers immediate play without signup friction", () => {
    render(<JaysGame />);

    expect(screen.getByRole("heading", { name: /how many levels/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    expect(screen.getByText("Catch as many Jays in Jeans as you can")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("offers leaderboard access before playing when rankings are configured", async () => {
    leaderboardStatusMock.mockResolvedValue({
      available: true,
      board: "surrey-quays" as const,
      boardLabel: "Surrey Quays",
    });
    render(<JaysGame />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const leaderboardButton = screen.getByRole("button", { name: /view leaderboard/i });
    fireEvent.click(leaderboardButton);

    expect(screen.getByRole("region", { name: /surrey quays leaderboard/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
  });

  it("runs the short countdown and enters the playable HUD", () => {
    render(<JaysGame />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    expect(screen.getByText("3")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText("GO!")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(400));

    expect(screen.getByText("LEVEL")).toBeInTheDocument();
    expect(screen.getByText("JAYS").previousElementSibling).toHaveTextContent("0 / 5");
    expect(screen.getByText("TIME")).toBeInTheDocument();
    expect(screen.getByText("00:12")).toBeInTheDocument();
    expect(window.requestAnimationFrame).toHaveBeenCalled();
  });

  it("pauses safely when the page becomes hidden", () => {
    render(<JaysGame />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));
    act(() => vi.advanceTimersByTime(1200));
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    fireEvent(document, new Event("visibilitychange"));

    expect(screen.getByRole("heading", { name: "PAUSED" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument();
  });

  it("loads the local personal best and persists mute preference", async () => {
    localStorage.setItem("jaysforjeans.personalBest.v2", JSON.stringify({
      version: 2, highestLevel: 7, totalJays: 68, date: "2026-08-26T00:00:00.000Z",
    }));
    render(<JaysGame />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("7")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mute sound" }));
    expect(screen.getByRole("button", { name: "Turn sound on" })).toBeInTheDocument();
    expect(localStorage.getItem("jaysforjeans.muted.v1")).toBe("true");
  });

  it("does not duplicate game_start analytics when resuming", () => {
    render(<JaysGame />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));
    act(() => vi.advanceTimersByTime(1200));
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    fireEvent(document, new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    fireEvent.click(screen.getByRole("button", { name: /resume/i }));
    act(() => vi.advanceTimersByTime(1200));

    expect(trackMock.mock.calls.filter(([name]) => name === "game_start")).toHaveLength(1);
  });

  it("does not reserve A or D while the player is typing", () => {
    render(<JaysGame />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));
    act(() => vi.advanceTimersByTime(1200));
    const input = document.createElement("input");
    document.body.appendChild(input);

    const aKey = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
    const dKey = new KeyboardEvent("keydown", { key: "d", bubbles: true, cancelable: true });
    input.dispatchEvent(aKey);
    input.dispatchEvent(dKey);

    expect(aKey.defaultPrevented).toBe(false);
    expect(dKey.defaultPrevented).toBe(false);
    input.remove();
  });

  it("cancels animation work and countdown timers on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const { unmount } = render(<JaysGame />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));
    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(3);
  });
});
