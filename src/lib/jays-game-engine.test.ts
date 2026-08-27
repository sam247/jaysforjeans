import { describe, expect, it } from "vitest";

import {
  LEVEL_DURATION_MS,
  TOUCH_LAG_CAP_PX,
  TOUCH_THUMB_GAP_PX,
  applyTouchPosition,
  createNextLevel,
  createSimulation,
  getLevelConfig,
  getLevelTarget,
  getNextLevelTransition,
  getPlayerSize,
  getTouchPlayerY,
  maximumRunJays,
  minimumRunJays,
  resultMessage,
  updateSimulation,
  type GameSimulation,
  type Jay,
  type JayKind,
} from "@/lib/jays-game-engine";

const fixedRandom = (value = 0.5) => () => value;

function catchJay(simulation: GameSimulation, kind: JayKind = "normal") {
  const waistY = simulation.playerY;
  const jay: Jay = {
    id: simulation.nextId++, kind, status: "falling", variant: 0,
    x: simulation.playerX, y: waistY, radius: kind === "golden" ? 20 : 22,
    speedFactor: 1, drift: 1, wobble: 0, caughtAgeMs: 0,
  };
  simulation.jays = [jay];
  return updateSimulation(simulation, 0, fixedRandom());
}

describe("jays survival engine", () => {
  it("starts every level with a visible, reachable Jay", () => {
    const simulation = createSimulation(390, 760, fixedRandom());
    const firstJay = simulation.jays[0];
    expect(firstJay.kind).toBe("normal");
    expect(firstJay.y + firstJay.radius).toBeGreaterThan(0);
    expect(firstJay.x).toBeGreaterThan(390 * 0.35);
    expect(firstJay.x).toBeLessThan(390 * 0.65);
  });

  it("uses the hand-tuned opening target curve", () => {
    expect([1, 2, 3, 4, 5, 6].map(getLevelTarget)).toEqual([5, 7, 9, 11, 13, 15]);
    expect(getLevelConfig(1)).toMatchObject({ durationMs: 12_000, spawnIntervalMs: 1_220, maxActiveJays: 4 });
    expect(getLevelConfig(6)).toMatchObject({ durationMs: 12_000, spawnIntervalMs: 455, maxActiveJays: 6 });
  });

  it("generates increasingly difficult but bounded endless levels", () => {
    const level7 = getLevelConfig(7);
    const level12 = getLevelConfig(12);
    const level100 = getLevelConfig(100);
    expect(level12.target).toBeGreaterThan(level7.target);
    expect(level12.speedHeightsPerSecond).toBeGreaterThan(level7.speedHeightsPerSecond);
    expect(level12.spawnIntervalMs).toBeLessThan(level7.spawnIntervalMs);
    expect(level12.catchWidthMultiplier).toBeLessThan(level7.catchWidthMultiplier);
    expect(level100).toMatchObject({ target: 42, spawnIntervalMs: 220, maxActiveJays: 8 });
    for (let level = 1; level <= 100; level += 1) {
      const config = getLevelConfig(level);
      const theoreticalSpawns = 1 + Math.floor(config.durationMs / config.spawnIntervalMs);
      expect(config.target).toBeLessThan(theoreticalSpawns);
    }
  });

  it("never leaves the jeans more than the touch lag cap behind", () => {
    const width = 390;
    const target = 300;
    const next = applyTouchPosition(80, target, width, getPlayerSize(width).width, 16);
    expect(target - next).toBeLessThanOrEqual(TOUCH_LAG_CAP_PX);
  });

  it("keeps the jeans visible above a bottom touch and moves the real catch line", () => {
    const simulation = createSimulation(390, 760, fixedRandom());
    const playerHeight = getPlayerSize(simulation.width).height;
    simulation.playerY = getTouchPlayerY(752, simulation.width, simulation.height);
    simulation.playerTargetY = simulation.playerY;

    expect(752 - (simulation.playerY + playerHeight)).toBeGreaterThanOrEqual(TOUCH_THUMB_GAP_PX);
    expect(catchJay(simulation)).toContainEqual(expect.objectContaining({ type: "catch" }));
  });

  it("counts a Golden Jay as five towards the level target", () => {
    const simulation = createSimulation(390, 760, fixedRandom(), 6);
    const events = catchJay(simulation, "golden");
    expect(events).toContainEqual(expect.objectContaining({ type: "catch", contribution: 5, levelProgress: 5 }));
    expect(simulation.stats).toMatchObject({ totalJays: 5, goldenCatches: 1, progress: 5 });
  });

  it("ends a level immediately when its target is reached and only once", () => {
    const simulation = createSimulation(390, 760, fixedRandom());
    simulation.levelProgress = 4;
    simulation.stats.progress = 4;
    simulation.stats.totalJays = 4;
    const events = catchJay(simulation);
    expect(events).toContainEqual({ type: "level_complete", level: 1, progress: 5, target: 5 });
    expect(simulation.elapsedMs).toBe(0);
    expect(updateSimulation(simulation, 1000, fixedRandom())).toEqual([]);
  });

  it("lets a Golden Jay overshoot the target and clears immediately", () => {
    const simulation = createSimulation(390, 760, fixedRandom(), 6);
    simulation.levelProgress = 11;
    simulation.stats.progress = 11;
    simulation.stats.totalJays = 11;
    const events = catchJay(simulation, "golden");
    expect(events).toContainEqual({ type: "level_complete", level: 6, progress: 16, target: 15 });
  });

  it("carries run statistics into the next level and resets level state", () => {
    const current = createSimulation(390, 760, fixedRandom());
    current.stats.totalJays = 5;
    current.stats.normalCatches = 5;
    current.levelProgress = 5;
    const next = createNextLevel(current, fixedRandom());
    expect(next).toMatchObject({ level: 2, levelProgress: 0, elapsedMs: 0 });
    expect(next.stats).toMatchObject({ highestLevel: 2, progress: 0, target: 7, totalJays: 5, normalCatches: 5 });
    expect(next.jays[0].y + next.jays[0].radius).toBeGreaterThan(0);
  });

  it("ends the whole run once when a level timer expires", () => {
    const simulation = createSimulation(390, 760, fixedRandom());
    simulation.elapsedMs = LEVEL_DURATION_MS - 10;
    expect(updateSimulation(simulation, 10, fixedRandom())).toContainEqual({ type: "run_complete" });
    expect(updateSimulation(simulation, 10, fixedRandom())).toEqual([]);
  });

  it("records misses without reducing run progress", () => {
    const simulation = createSimulation(390, 760, fixedRandom());
    simulation.levelProgress = 2;
    simulation.stats.progress = 2;
    simulation.jays[0].y = simulation.height + simulation.jays[0].radius + 1;
    expect(updateSimulation(simulation, 0, fixedRandom())).toContainEqual({ type: "miss" });
    expect(simulation.stats).toMatchObject({ progress: 2, misses: 1 });
  });

  it("provides sane validation bounds for completed-level Golden overshoot", () => {
    expect(minimumRunJays(3, 4)).toBe(16);
    expect(maximumRunJays(3, 4)).toBe(24);
  });

  it("uses level-based result copy", () => {
    expect(resultMessage(1)).toBe("The jeans needed warming up.");
    expect(resultMessage(6)).toBe("Surrey Quays is taking notes.");
    expect(resultMessage(12)).toBe("Someone inspect those trousers.");
  });

  it("describes an explicit 3, 2, 1 transition into the next level", () => {
    expect(getNextLevelTransition(8)).toEqual({
      label: "LEVEL 8 STARTING IN",
      steps: [
        { value: "3", delayMs: 0 },
        { value: "2", delayMs: 450 },
        { value: "1", delayMs: 900 },
      ],
      playDelayMs: 1_350,
    });
  });
});
