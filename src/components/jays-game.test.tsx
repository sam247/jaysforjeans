import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JaysGame } from "@/components/jays-game";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

describe("JaysGame", () => {
  beforeEach(() => {
    vi.useFakeTimers();
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

    expect(screen.getByRole("heading", { name: /how many jays/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^play$/i })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("runs the short countdown and enters the playable HUD", () => {
    render(<JaysGame />);
    fireEvent.click(screen.getByRole("button", { name: /^play$/i }));

    expect(screen.getByText("3")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText("GO!")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(400));

    expect(screen.getByText("SCORE")).toBeInTheDocument();
    expect(screen.getByText("TIME")).toBeInTheDocument();
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

  it("loads the local personal best and persists mute preference", () => {
    localStorage.setItem("jaysforjeans.personalBest.v1", "23");
    render(<JaysGame />);

    expect(screen.getByText("23")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mute sound" }));
    expect(screen.getByRole("button", { name: "Turn sound on" })).toBeInTheDocument();
    expect(localStorage.getItem("jaysforjeans.muted.v1")).toBe("true");
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
