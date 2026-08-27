export const LEVEL_DURATION_MS = 12_000;
export const TOUCH_LAG_CAP_PX = 14;
export const MAX_VALIDATED_LEVEL = 999;

export type GamePhase = "intro" | "countdown" | "playing" | "paused" | "level_cleared" | "results";
export type JayKind = "normal" | "golden";
export type JayStatus = "falling" | "caught";

export type Jay = {
  id: number;
  kind: JayKind;
  status: JayStatus;
  variant: number;
  x: number;
  y: number;
  radius: number;
  speedFactor: number;
  drift: number;
  wobble: number;
  caughtAgeMs: number;
};

export type RunStats = {
  highestLevel: number;
  progress: number;
  target: number;
  totalJays: number;
  normalCatches: number;
  goldenCatches: number;
  misses: number;
};

export type LevelConfig = {
  level: number;
  target: number;
  durationMs: number;
  speedHeightsPerSecond: number;
  spawnIntervalMs: number;
  driftStrength: number;
  catchWidthMultiplier: number;
  catchBandDepth: number;
  maxActiveJays: number;
  edgePressure: number;
  goldenCatchMultiplier: number;
};

export type GameSimulation = {
  width: number;
  height: number;
  level: number;
  config: LevelConfig;
  levelProgress: number;
  elapsedMs: number;
  spawnAccumulatorMs: number;
  nextId: number;
  playerX: number;
  playerTargetX: number;
  playerVelocity: number;
  jays: Jay[];
  stats: RunStats;
  goldenDueMs: number;
  goldenSpawnCount: number;
  lastSpawnX: number;
  ended: boolean;
};

export type GameEvent =
  | { type: "catch"; kind: JayKind; x: number; y: number; totalJays: number; contribution: number; levelProgress: number }
  | { type: "miss" }
  | { type: "level_complete"; level: number; progress: number; target: number }
  | { type: "run_complete" };

export type RandomSource = () => number;

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

const OPENING_LEVELS: ReadonlyArray<Omit<LevelConfig, "level" | "durationMs">> = [
  { target: 5, speedHeightsPerSecond: 0.55, spawnIntervalMs: 1_220, driftStrength: 0, catchWidthMultiplier: 0.56, catchBandDepth: 30, maxActiveJays: 4, edgePressure: 0.12, goldenCatchMultiplier: 0.82 },
  { target: 7, speedHeightsPerSecond: 0.61, spawnIntervalMs: 1_020, driftStrength: 2, catchWidthMultiplier: 0.54, catchBandDepth: 29, maxActiveJays: 4, edgePressure: 0.18, goldenCatchMultiplier: 0.82 },
  { target: 9, speedHeightsPerSecond: 0.68, spawnIntervalMs: 830, driftStrength: 7, catchWidthMultiplier: 0.51, catchBandDepth: 27, maxActiveJays: 5, edgePressure: 0.3, goldenCatchMultiplier: 0.8 },
  { target: 11, speedHeightsPerSecond: 0.77, spawnIntervalMs: 670, driftStrength: 15, catchWidthMultiplier: 0.47, catchBandDepth: 25, maxActiveJays: 5, edgePressure: 0.48, goldenCatchMultiplier: 0.78 },
  { target: 13, speedHeightsPerSecond: 0.88, spawnIntervalMs: 540, driftStrength: 23, catchWidthMultiplier: 0.44, catchBandDepth: 23, maxActiveJays: 6, edgePressure: 0.58, goldenCatchMultiplier: 0.76 },
  { target: 15, speedHeightsPerSecond: 1, spawnIntervalMs: 455, driftStrength: 30, catchWidthMultiplier: 0.42, catchBandDepth: 22, maxActiveJays: 6, edgePressure: 0.64, goldenCatchMultiplier: 0.74 },
];

export function getLevelTarget(level: number) {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel <= OPENING_LEVELS.length) return OPENING_LEVELS[safeLevel - 1].target;
  return Math.min(42, 15 + Math.ceil((safeLevel - 6) * 2.4));
}

export function getLevelConfig(level: number): LevelConfig {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel <= OPENING_LEVELS.length) {
    return { level: safeLevel, durationMs: LEVEL_DURATION_MS, ...OPENING_LEVELS[safeLevel - 1] };
  }
  const pressure = safeLevel - 6;
  return {
    level: safeLevel,
    target: getLevelTarget(safeLevel),
    durationMs: LEVEL_DURATION_MS,
    speedHeightsPerSecond: Math.min(1.9, 1 + pressure * 0.1),
    spawnIntervalMs: Math.max(220, 455 - pressure * 27),
    driftStrength: Math.min(82, 30 + pressure * 5.5),
    catchWidthMultiplier: Math.max(0.29, 0.42 - pressure * 0.018),
    catchBandDepth: Math.max(15, 22 - pressure * 0.8),
    maxActiveJays: Math.min(8, 6 + Math.floor(pressure / 3)),
    edgePressure: Math.min(0.9, 0.64 + pressure * 0.04),
    goldenCatchMultiplier: Math.max(0.61, 0.74 - pressure * 0.012),
  };
}

export function maximumRunJays(highestLevel: number, progress: number) {
  let total = Math.max(0, progress);
  for (let level = 1; level < highestLevel; level += 1) total += getLevelTarget(level) + 4;
  return total;
}

export function minimumRunJays(highestLevel: number, progress: number) {
  let total = Math.max(0, progress);
  for (let level = 1; level < highestLevel; level += 1) total += getLevelTarget(level);
  return total;
}

export function getPlayerSize(width: number) {
  return { width: clamp(width * 0.26, 92, 138), height: clamp(width * 0.2, 72, 100) };
}

export function clampPlayerX(x: number, width: number, playerWidth: number) {
  const half = playerWidth / 2;
  return clamp(x, half + 8, width - half - 8);
}

export function applyTouchPosition(currentX: number, targetX: number, width: number, playerWidth: number, deltaMs: number) {
  const target = clampPlayerX(targetX, width, playerWidth);
  const responsiveness = 1 - Math.exp(-Math.min(deltaMs, 34) * 0.055);
  let next = currentX + (target - currentX) * responsiveness;
  const remaining = target - next;
  if (Math.abs(remaining) > TOUCH_LAG_CAP_PX) next = target - Math.sign(remaining) * TOUCH_LAG_CAP_PX;
  return clampPlayerX(next, width, playerWidth);
}

function jayRadius(width: number) {
  return clamp(width * 0.052, 19, 27);
}

function chooseSpawnX(simulation: GameSimulation, random: RandomSource, kind: JayKind) {
  const radius = jayRadius(simulation.width);
  const inset = radius + 12;
  const chooseEdgeLane = kind === "golden" || random() < simulation.config.edgePressure;
  let candidate: number;
  if (chooseEdgeLane) {
    const leftLane = random() < 0.5;
    candidate = mix(simulation.width * (leftLane ? 0.1 : 0.62), simulation.width * (leftLane ? 0.38 : 0.9), random());
    candidate = clamp(candidate, inset, simulation.width - inset);
  } else {
    candidate = mix(inset, simulation.width - inset, random());
  }
  const minimumGap = Math.min(124, simulation.width * mix(0.2, 0.32, Math.min(1, simulation.level / 12)));
  if (Math.abs(candidate - simulation.lastSpawnX) < minimumGap) {
    candidate = clamp(candidate + minimumGap * (random() < 0.5 ? -1 : 1), inset, simulation.width - inset);
  }
  return candidate;
}

function makeJay(simulation: GameSimulation, random: RandomSource, kind: JayKind, firstFrame = false): Jay {
  const radius = jayRadius(simulation.width) * (kind === "golden" ? 0.93 : 1);
  const x = firstFrame ? mix(simulation.width * 0.38, simulation.width * 0.62, random()) : chooseSpawnX(simulation, random, kind);
  simulation.lastSpawnX = x;
  return {
    id: simulation.nextId++, kind, status: "falling", variant: Math.floor(random() * 4), x,
    y: firstFrame ? radius * 0.45 : -radius * 0.65, radius,
    speedFactor: mix(0.94, 1.06, random()) + (kind === "golden" ? 0.12 : 0),
    drift: random() < 0.5 ? -1 : 1, wobble: random() * Math.PI * 2, caughtAgeMs: 0,
  };
}

export function createSimulation(width: number, height: number, random: RandomSource = Math.random, level = 1, previousStats?: RunStats): GameSimulation {
  const config = getLevelConfig(level);
  const player = getPlayerSize(width);
  const stats: RunStats = previousStats
    ? { ...previousStats, highestLevel: Math.max(previousStats.highestLevel, level), progress: 0, target: config.target }
    : { highestLevel: level, progress: 0, target: config.target, totalJays: 0, normalCatches: 0, goldenCatches: 0, misses: 0 };
  const simulation: GameSimulation = {
    width, height, level, config, levelProgress: 0, elapsedMs: 0, spawnAccumulatorMs: 0,
    nextId: 1, playerX: width / 2, playerTargetX: width / 2, playerVelocity: 0, jays: [], stats,
    goldenDueMs: mix(level >= 6 ? 4_200 : 7_200, level >= 6 ? 7_400 : 10_200, random()),
    goldenSpawnCount: 0, lastSpawnX: width / 2 - player.width, ended: false,
  };
  simulation.jays.push(makeJay(simulation, random, "normal", true));
  return simulation;
}

export function createNextLevel(simulation: GameSimulation, random: RandomSource = Math.random) {
  const next = createSimulation(simulation.width, simulation.height, random, simulation.level + 1, simulation.stats);
  next.playerX = clampPlayerX(simulation.playerX, next.width, getPlayerSize(next.width).width);
  next.playerTargetX = next.playerX;
  return next;
}

export function resizeSimulation(simulation: GameSimulation, width: number, height: number) {
  const scaleX = width / Math.max(1, simulation.width);
  const scaleY = height / Math.max(1, simulation.height);
  simulation.width = width;
  simulation.height = height;
  simulation.playerX *= scaleX;
  simulation.playerTargetX *= scaleX;
  simulation.lastSpawnX *= scaleX;
  simulation.jays.forEach((jay) => {
    jay.x *= scaleX; jay.y *= scaleY;
    jay.radius = jayRadius(width) * (jay.kind === "golden" ? 0.93 : 1);
  });
}

function shouldSpawnGolden(simulation: GameSimulation, random: RandomSource) {
  if (simulation.level < 4) return false;
  const maxGoldens = simulation.level >= 10 ? 2 : 1;
  if (simulation.goldenSpawnCount >= maxGoldens) return false;
  if (simulation.level >= 6 && simulation.elapsedMs >= simulation.goldenDueMs) return true;
  return simulation.elapsedMs >= simulation.goldenDueMs && random() < (simulation.level >= 6 ? 0.045 : 0.012);
}

export function updateSimulation(simulation: GameSimulation, deltaMs: number, random: RandomSource = Math.random): GameEvent[] {
  if (simulation.ended) return [];
  const events: GameEvent[] = [];
  const dt = clamp(deltaMs, 0, 34);
  const previousElapsed = simulation.elapsedMs;
  simulation.elapsedMs = Math.min(simulation.config.durationMs, simulation.elapsedMs + dt);
  const playerSize = getPlayerSize(simulation.width);
  const previousPlayerX = simulation.playerX;
  simulation.playerX = applyTouchPosition(simulation.playerX, simulation.playerTargetX, simulation.width, playerSize.width, dt);
  simulation.playerVelocity = dt > 0 ? (simulation.playerX - previousPlayerX) / dt : 0;

  simulation.spawnAccumulatorMs += dt;
  const liveJays = simulation.jays.filter((jay) => jay.status === "falling").length;
  if (simulation.spawnAccumulatorMs >= simulation.config.spawnIntervalMs && liveJays < simulation.config.maxActiveJays) {
    simulation.spawnAccumulatorMs -= simulation.config.spawnIntervalMs;
    const kind: JayKind = shouldSpawnGolden(simulation, random) ? "golden" : "normal";
    if (kind === "golden") simulation.goldenSpawnCount += 1;
    simulation.jays.push(makeJay(simulation, random, kind));
  }

  const waistY = simulation.height - playerSize.height + 12;
  const surviving: Jay[] = [];
  for (const jay of simulation.jays) {
    if (jay.status === "caught") {
      jay.caughtAgeMs += dt;
      const settle = 1 - Math.exp(-dt * 0.025);
      jay.x += (simulation.playerX - jay.x) * settle;
      jay.y += (waistY + playerSize.height * 0.34 - jay.y) * settle;
      if (jay.caughtAgeMs < 220) surviving.push(jay);
      continue;
    }
    jay.wobble += dt * 0.004;
    jay.x += Math.sin(jay.wobble) * simulation.config.driftStrength * jay.drift * (dt / 1000);
    jay.x = clamp(jay.x, jay.radius + 8, simulation.width - jay.radius - 8);
    jay.y += simulation.height * simulation.config.speedHeightsPerSecond * jay.speedFactor * (dt / 1000);
    const goldenMultiplier = jay.kind === "golden" ? simulation.config.goldenCatchMultiplier : 1;
    const catchHalfWidth = playerSize.width * simulation.config.catchWidthMultiplier * goldenMultiplier;
    const catchBandDepth = simulation.config.catchBandDepth * goldenMultiplier;
    const inWaistBand = jay.y + jay.radius * 0.58 >= waistY && jay.y <= waistY + catchBandDepth;
    const inCatchWidth = Math.abs(jay.x - simulation.playerX) <= catchHalfWidth;
    if (inWaistBand && inCatchWidth) {
      jay.status = "caught";
      jay.caughtAgeMs = 0;
      const contribution = jay.kind === "golden" ? 5 : 1;
      if (jay.kind === "golden") simulation.stats.goldenCatches += 1;
      else simulation.stats.normalCatches += 1;
      simulation.levelProgress += contribution;
      simulation.stats.progress = simulation.levelProgress;
      simulation.stats.totalJays += contribution;
      events.push({ type: "catch", kind: jay.kind, x: jay.x, y: jay.y, totalJays: simulation.stats.totalJays, contribution, levelProgress: simulation.levelProgress });
      surviving.push(jay);
      if (simulation.levelProgress >= simulation.config.target) {
        simulation.ended = true;
        events.push({ type: "level_complete", level: simulation.level, progress: simulation.levelProgress, target: simulation.config.target });
        break;
      }
      continue;
    }
    if (jay.y - jay.radius > simulation.height) {
      simulation.stats.misses += 1;
      events.push({ type: "miss" });
      continue;
    }
    surviving.push(jay);
  }
  simulation.jays = surviving;
  if (!simulation.ended && previousElapsed < simulation.config.durationMs && simulation.elapsedMs >= simulation.config.durationMs) {
    simulation.ended = true;
    simulation.stats.progress = simulation.levelProgress;
    events.push({ type: "run_complete" });
  }
  return events;
}

export function resultMessage(level: number) {
  if (level <= 1) return "The jeans needed warming up.";
  if (level <= 3) return "Respectable trouser survival.";
  if (level <= 5) return "Now the denim is sweating.";
  if (level <= 8) return "Surrey Quays is taking notes.";
  if (level <= 11) return "This is getting medically impressive.";
  return "Someone inspect those trousers.";
}
