import { describe, expect, it } from "vitest";

import {
  ROUND_DURATION_MS,
  TOUCH_LAG_CAP_PX,
  applyTouchPosition,
  createSimulation,
  getDifficulty,
  getPlayerSize,
  resultMessage,
  updateSimulation,
  type Jay,
} from "@/lib/jays-game-engine";

const fixedRandom = (value = 0.5) => () => value;

describe("jays game engine", () => {
  it("starts with a visible, reachable Jay on the first playable frame", () => {
    const simulation = createSimulation(390, 760, fixedRandom());
    const firstJay = simulation.jays[0];

    expect(firstJay.kind).toBe("normal");
    expect(firstJay.y + firstJay.radius).toBeGreaterThan(0);
    expect(firstJay.x).toBeGreaterThan(390 * 0.35);
    expect(firstJay.x).toBeLessThan(390 * 0.65);
    expect(simulation.spawnAccumulatorMs).toBe(0);
  });

  it("matches the planned continuous difficulty checkpoints", () => {
    expect(getDifficulty(0)).toMatchObject({ speedHeightsPerSecond: 0.2, spawnIntervalMs: 900 });
    expect(getDifficulty(5000)).toMatchObject({ speedHeightsPerSecond: 0.25, spawnIntervalMs: 760 });
    expect(getDifficulty(15_000)).toMatchObject({ speedHeightsPerSecond: 0.35, spawnIntervalMs: 580 });
    expect(getDifficulty(23_000)).toMatchObject({ speedHeightsPerSecond: 0.48, spawnIntervalMs: 440 });
    expect(getDifficulty(30_000)).toMatchObject({ speedHeightsPerSecond: 0.6, spawnIntervalMs: 340 });
  });

  it("never leaves the jeans more than the touch lag cap behind", () => {
    const width = 390;
    const playerWidth = getPlayerSize(width).width;
    const target = 300;
    const next = applyTouchPosition(80, target, width, playerWidth, 16);

    expect(target - next).toBeLessThanOrEqual(TOUCH_LAG_CAP_PX);
  });

  it("scores normal and golden catches correctly with a generous waistband", () => {
    const simulation = createSimulation(390, 760, fixedRandom());
    const playerSize = getPlayerSize(simulation.width);
    const waistY = simulation.height - playerSize.height + 12;
    const base: Jay = {
      id: 20,
      kind: "normal",
      status: "falling",
      variant: 0,
      x: simulation.playerX + playerSize.width * 0.5,
      y: waistY,
      radius: 22,
      speedFactor: 1,
      drift: 1,
      wobble: 0,
      caughtAgeMs: 0,
    };
    simulation.jays = [base, { ...base, id: 21, kind: "golden", x: simulation.playerX - playerSize.width * 0.5 }];

    const events = updateSimulation(simulation, 0, fixedRandom());

    expect(events.filter((event) => event.type === "catch")).toHaveLength(2);
    expect(simulation.stats).toMatchObject({ score: 6, normalCatches: 1, goldenCatches: 1 });
  });

  it("records misses without reducing the score", () => {
    const simulation = createSimulation(390, 760, fixedRandom());
    simulation.stats.score = 4;
    simulation.jays[0].y = simulation.height + simulation.jays[0].radius + 1;

    const events = updateSimulation(simulation, 0, fixedRandom());

    expect(events).toContainEqual({ type: "miss" });
    expect(simulation.stats).toMatchObject({ score: 4, misses: 1 });
  });

  it("guarantees a golden spawn after its scheduled opportunity", () => {
    const simulation = createSimulation(390, 760, fixedRandom());
    simulation.elapsedMs = simulation.goldenDueMs;
    simulation.spawnAccumulatorMs = 1000;

    updateSimulation(simulation, 1, fixedRandom());

    expect(simulation.jays.some((jay) => jay.kind === "golden")).toBe(true);
    expect(simulation.goldenSpawned).toBe(true);
  });

  it("ends once, exactly at the round duration", () => {
    const simulation = createSimulation(390, 760, fixedRandom());
    simulation.elapsedMs = ROUND_DURATION_MS - 10;

    expect(updateSimulation(simulation, 10, fixedRandom())).toContainEqual({ type: "round_complete" });
    expect(updateSimulation(simulation, 10, fixedRandom())).not.toContainEqual({ type: "round_complete" });
  });

  it("uses the requested result copy bands", () => {
    expect(resultMessage(9)).toBe("Warm-up trousers.");
    expect(resultMessage(10)).toBe("Respectable trouser work.");
    expect(resultMessage(20)).toBe("That’s an unreasonable number of Jays.");
    expect(resultMessage(30)).toBe("Elite denim operations.");
    expect(resultMessage(40)).toBe("Surrey Quays wasn’t ready for this.");
  });
});
