export const ROUND_DURATION_MS = 30_000;
export const TOUCH_LAG_CAP_PX = 14;

export type GamePhase = "intro" | "countdown" | "playing" | "paused" | "results";
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

export type RoundStats = {
  score: number;
  normalCatches: number;
  goldenCatches: number;
  misses: number;
};

export type GameSimulation = {
  width: number;
  height: number;
  elapsedMs: number;
  spawnAccumulatorMs: number;
  nextId: number;
  playerX: number;
  playerTargetX: number;
  playerVelocity: number;
  jays: Jay[];
  stats: RoundStats;
  goldenDueMs: number;
  goldenSpawned: boolean;
  lastSpawnX: number;
};

export type Difficulty = {
  speedHeightsPerSecond: number;
  spawnIntervalMs: number;
  driftStrength: number;
};

export type GameEvent =
  | { type: "catch"; kind: JayKind; x: number; y: number; score: number }
  | { type: "miss" }
  | { type: "round_complete" };

export type RandomSource = () => number;

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export function getDifficulty(elapsedMs: number): Difficulty {
  const seconds = clamp(elapsedMs / 1000, 0, 30);

  if (seconds <= 5) {
    const t = seconds / 5;
    return {
      speedHeightsPerSecond: mix(0.2, 0.25, t),
      spawnIntervalMs: mix(900, 760, t),
      driftStrength: 0,
    };
  }

  if (seconds <= 15) {
    const t = (seconds - 5) / 10;
    return {
      speedHeightsPerSecond: mix(0.25, 0.35, t),
      spawnIntervalMs: mix(760, 580, t),
      driftStrength: 0,
    };
  }

  if (seconds <= 23) {
    const t = (seconds - 15) / 8;
    return {
      speedHeightsPerSecond: mix(0.35, 0.48, t),
      spawnIntervalMs: mix(580, 440, t),
      driftStrength: mix(4, 13, t),
    };
  }

  const t = (seconds - 23) / 7;
  return {
    speedHeightsPerSecond: mix(0.48, 0.6, t),
    spawnIntervalMs: mix(440, 340, t),
    driftStrength: mix(13, 19, t),
  };
}

export function getPlayerSize(width: number) {
  return {
    width: clamp(width * 0.26, 92, 138),
    height: clamp(width * 0.2, 72, 100),
  };
}

export function clampPlayerX(x: number, width: number, playerWidth: number) {
  const half = playerWidth / 2;
  return clamp(x, half + 8, width - half - 8);
}

export function applyTouchPosition(
  currentX: number,
  targetX: number,
  width: number,
  playerWidth: number,
  deltaMs: number,
) {
  const target = clampPlayerX(targetX, width, playerWidth);
  const responsiveness = 1 - Math.exp(-Math.min(deltaMs, 34) * 0.055);
  let next = currentX + (target - currentX) * responsiveness;
  const remaining = target - next;

  if (Math.abs(remaining) > TOUCH_LAG_CAP_PX) {
    next = target - Math.sign(remaining) * TOUCH_LAG_CAP_PX;
  }

  return clampPlayerX(next, width, playerWidth);
}

function jayRadius(width: number) {
  return clamp(width * 0.052, 19, 27);
}

function chooseSpawnX(simulation: GameSimulation, random: RandomSource) {
  const radius = jayRadius(simulation.width);
  const inset = radius + 12;
  let candidate = mix(inset, simulation.width - inset, random());
  const minimumGap = Math.min(88, simulation.width * 0.22);

  if (Math.abs(candidate - simulation.lastSpawnX) < minimumGap) {
    const shift = minimumGap * (random() < 0.5 ? -1 : 1);
    candidate = clamp(candidate + shift, inset, simulation.width - inset);
  }

  return candidate;
}

function makeJay(
  simulation: GameSimulation,
  random: RandomSource,
  kind: JayKind,
  firstFrame = false,
): Jay {
  const radius = jayRadius(simulation.width) * (kind === "golden" ? 1.08 : 1);
  const x = firstFrame
    ? mix(simulation.width * 0.38, simulation.width * 0.62, random())
    : chooseSpawnX(simulation, random);
  simulation.lastSpawnX = x;

  return {
    id: simulation.nextId++,
    kind,
    status: "falling",
    variant: Math.floor(random() * 4),
    x,
    y: firstFrame ? radius * 0.45 : -radius * 0.65,
    radius,
    speedFactor: mix(0.94, 1.06, random()),
    drift: random() < 0.5 ? -1 : 1,
    wobble: random() * Math.PI * 2,
    caughtAgeMs: 0,
  };
}

export function createSimulation(
  width: number,
  height: number,
  random: RandomSource = Math.random,
): GameSimulation {
  const player = getPlayerSize(width);
  const simulation: GameSimulation = {
    width,
    height,
    elapsedMs: 0,
    spawnAccumulatorMs: 0,
    nextId: 1,
    playerX: width / 2,
    playerTargetX: width / 2,
    playerVelocity: 0,
    jays: [],
    stats: { score: 0, normalCatches: 0, goldenCatches: 0, misses: 0 },
    goldenDueMs: mix(9000, 17_000, random()),
    goldenSpawned: false,
    lastSpawnX: width / 2 - player.width,
  };

  simulation.jays.push(makeJay(simulation, random, "normal", true));
  return simulation;
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
    jay.x *= scaleX;
    jay.y *= scaleY;
    jay.radius = jayRadius(width) * (jay.kind === "golden" ? 1.08 : 1);
  });
}

function shouldSpawnGolden(simulation: GameSimulation, random: RandomSource) {
  if (!simulation.goldenSpawned && simulation.elapsedMs >= simulation.goldenDueMs) {
    return true;
  }

  return simulation.goldenSpawned && random() < 0.04;
}

export function updateSimulation(
  simulation: GameSimulation,
  deltaMs: number,
  random: RandomSource = Math.random,
): GameEvent[] {
  const events: GameEvent[] = [];
  const dt = clamp(deltaMs, 0, 34);
  const previousElapsed = simulation.elapsedMs;
  simulation.elapsedMs = Math.min(ROUND_DURATION_MS, simulation.elapsedMs + dt);

  const playerSize = getPlayerSize(simulation.width);
  const previousPlayerX = simulation.playerX;
  simulation.playerX = applyTouchPosition(
    simulation.playerX,
    simulation.playerTargetX,
    simulation.width,
    playerSize.width,
    dt,
  );
  simulation.playerVelocity = dt > 0 ? (simulation.playerX - previousPlayerX) / dt : 0;

  const difficulty = getDifficulty(simulation.elapsedMs);
  simulation.spawnAccumulatorMs += dt;
  const liveJays = simulation.jays.filter((jay) => jay.status === "falling").length;
  if (simulation.spawnAccumulatorMs >= difficulty.spawnIntervalMs && liveJays < 8) {
    simulation.spawnAccumulatorMs -= difficulty.spawnIntervalMs;
    const kind: JayKind = shouldSpawnGolden(simulation, random) ? "golden" : "normal";
    if (kind === "golden") simulation.goldenSpawned = true;
    simulation.jays.push(makeJay(simulation, random, kind));
  }

  const waistY = simulation.height - playerSize.height + 12;
  const catchHalfWidth = playerSize.width * 0.55;
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
    jay.x += Math.sin(jay.wobble) * difficulty.driftStrength * jay.drift * (dt / 1000);
    jay.x = clamp(jay.x, jay.radius + 8, simulation.width - jay.radius - 8);
    jay.y += simulation.height * difficulty.speedHeightsPerSecond * jay.speedFactor * (dt / 1000);

    const inWaistBand = jay.y + jay.radius * 0.65 >= waistY && jay.y <= waistY + 28;
    const inCatchWidth = Math.abs(jay.x - simulation.playerX) <= catchHalfWidth;

    if (inWaistBand && inCatchWidth) {
      jay.status = "caught";
      jay.caughtAgeMs = 0;
      if (jay.kind === "golden") {
        simulation.stats.goldenCatches += 1;
        simulation.stats.score += 5;
      } else {
        simulation.stats.normalCatches += 1;
        simulation.stats.score += 1;
      }
      events.push({
        type: "catch",
        kind: jay.kind,
        x: jay.x,
        y: jay.y,
        score: simulation.stats.score,
      });
      surviving.push(jay);
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

  if (previousElapsed < ROUND_DURATION_MS && simulation.elapsedMs >= ROUND_DURATION_MS) {
    events.push({ type: "round_complete" });
  }

  return events;
}

export function resultMessage(score: number) {
  if (score < 10) return "Warm-up trousers.";
  if (score < 20) return "Respectable trouser work.";
  if (score < 30) return "That’s an unreasonable number of Jays.";
  if (score < 40) return "Elite denim operations.";
  return "Surrey Quays wasn’t ready for this.";
}
