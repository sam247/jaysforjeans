"use client";

import { track } from "@vercel/analytics";
import { MapPin, Pause, Play, Send, Share2, Trophy, Volume2, VolumeX } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  LEVEL_DURATION_MS,
  clampPlayerX,
  createNextLevel,
  createSimulation,
  getPlayerSize,
  resizeSimulation,
  resultMessage,
  updateSimulation,
  type GamePhase,
  type GameSimulation,
  type Jay,
  type RunStats,
} from "@/lib/jays-game-engine";
import {
  boardLabel,
  createLeaderboardSession,
  getLeaderboard,
  getLeaderboardStatus,
  submitLeaderboardScore,
} from "@/lib/leaderboard";
import {
  DEFAULT_BOARD_ID,
  sanitizeBoardId,
  validateNickname,
  type BoardId,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "@/lib/leaderboard-shared";

const BEST_RUN_KEY = "jaysforjeans.personalBest.v2";
const MUTED_KEY = "jaysforjeans.muted.v1";

type StoredBestRun = {
  version: 2;
  highestLevel: number;
  totalJays: number;
  date: string;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: string;
  size: number;
};

type ScorePop = {
  x: number;
  y: number;
  age: number;
  value: string;
  golden: boolean;
};

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

function safeTrack(name: string, properties?: Record<string, string | number | boolean>) {
  try {
    track(name, properties);
  } catch {
    // Analytics must never affect play.
  }
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function drawBackground(context: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#163d68");
  gradient.addColorStop(0.55, "#0d2e52");
  gradient.addColorStop(1, "#071d36");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(width * 0.5, height * 0.16, 0, width * 0.5, height * 0.16, width * 0.72);
  glow.addColorStop(0, "rgba(255, 217, 28, 0.16)");
  glow.addColorStop(1, "rgba(255, 217, 28, 0)");
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.08;
  context.strokeStyle = "#9fc8ed";
  context.lineWidth = 1;
  const grid = Math.max(48, width / 7);
  for (let x = grid / 2; x < width; x += grid) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = grid / 2; y < height; y += grid) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.restore();

  context.save();
  context.strokeStyle = "rgba(255, 216, 28, 0.16)";
  context.setLineDash([3, 9]);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(18, 0);
  context.lineTo(18, height);
  context.moveTo(width - 18, 0);
  context.lineTo(width - 18, height);
  context.stroke();
  context.restore();
}

function drawJay(context: CanvasRenderingContext2D, jay: Jay, elapsedMs: number) {
  const isGolden = jay.kind === "golden";
  const caughtProgress = jay.status === "caught" ? Math.min(1, jay.caughtAgeMs / 220) : 0;
  const scale = 1 - caughtProgress * 0.64;
  const bob = Math.sin(elapsedMs * 0.009 + jay.id) * 0.04;
  const armSwing = Math.sin(elapsedMs * 0.012 + jay.id) * 0.18;
  const skinColors = ["#f5c9a5", "#d9966e", "#9a5b3f", "#f0b98d"];
  const shirtColors = ["#d01b36", "#ffd91c", "#f4f0df", "#e64b48"];
  const skin = skinColors[jay.variant % skinColors.length];
  const shirt = isGolden ? "#ffd91c" : shirtColors[jay.variant % shirtColors.length];
  const outline = isGolden ? "#7a4d00" : "#10223a";
  const r = jay.radius;

  context.save();
  context.translate(jay.x, jay.y);
  context.rotate(bob + jay.drift * 0.025);
  context.scale(scale, scale);

  if (isGolden) {
    context.shadowColor = "#ffe866";
    context.shadowBlur = 22 + Math.sin(elapsedMs * 0.018) * 6;
    context.fillStyle = "rgba(255, 222, 50, 0.18)";
    context.beginPath();
    context.arc(0, 0, r * 1.65, 0, Math.PI * 2);
    context.fill();
  }

  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = outline;
  context.lineWidth = Math.max(2, r * 0.09);

  context.save();
  context.rotate(armSwing);
  context.beginPath();
  context.moveTo(-r * 0.45, -r * 0.06);
  context.lineTo(-r * 0.88, r * 0.32);
  context.strokeStyle = skin;
  context.lineWidth = r * 0.24;
  context.stroke();
  context.restore();

  context.save();
  context.rotate(-armSwing);
  context.beginPath();
  context.moveTo(r * 0.45, -r * 0.06);
  context.lineTo(r * 0.88, r * 0.32);
  context.strokeStyle = skin;
  context.lineWidth = r * 0.24;
  context.stroke();
  context.restore();

  context.strokeStyle = outline;
  context.lineWidth = r * 0.19;
  context.beginPath();
  context.moveTo(-r * 0.2, r * 0.7);
  context.lineTo(-r * 0.28, r * 1.12);
  context.moveTo(r * 0.2, r * 0.7);
  context.lineTo(r * 0.3, r * 1.12);
  context.stroke();

  context.fillStyle = shirt;
  context.strokeStyle = outline;
  context.lineWidth = r * 0.09;
  roundedRect(context, -r * 0.5, -r * 0.16, r, r * 0.95, r * 0.2);
  context.fill();
  context.stroke();

  if (!isGolden) {
    context.fillStyle = jay.variant % 2 ? "#d01b36" : "#ffd91c";
    roundedRect(context, -r * 0.24, r * 0.08, r * 0.48, r * 0.18, r * 0.07);
    context.fill();
  } else {
    context.fillStyle = "#b87300";
    context.font = `900 ${r * 0.45}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("J", 0, r * 0.33);
  }

  context.fillStyle = skin;
  context.strokeStyle = outline;
  context.lineWidth = r * 0.09;
  context.beginPath();
  context.arc(0, -r * 0.58, r * 0.45, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = jay.variant % 2 ? "#49301f" : "#1d1c27";
  context.beginPath();
  context.arc(-r * 0.05, -r * 0.75, r * 0.4, Math.PI * 1.08, Math.PI * 1.92);
  context.lineTo(r * 0.38, -r * 0.62);
  context.quadraticCurveTo(r * 0.15, -r * 1.05, -r * 0.34, -r * 0.78);
  context.fill();

  context.fillStyle = outline;
  context.beginPath();
  context.arc(-r * 0.16, -r * 0.57, r * 0.045, 0, Math.PI * 2);
  context.arc(r * 0.16, -r * 0.57, r * 0.045, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = outline;
  context.lineWidth = r * 0.055;
  context.beginPath();
  context.arc(0, -r * 0.49, r * 0.17, 0.12 * Math.PI, 0.88 * Math.PI);
  context.stroke();

  context.restore();
}

function drawJeans(
  context: CanvasRenderingContext2D,
  simulation: GameSimulation | undefined,
  width: number,
  height: number,
  squash: number,
  elapsedMs = 0,
  directionWobble = 0,
  goldenReaction = 0,
) {
  const size = getPlayerSize(width);
  const x = simulation?.playerX ?? width / 2;
  const nearestJay = simulation?.jays
    .filter((jay) => jay.status === "falling")
    .reduce<Jay | undefined>((nearest, jay) => {
      if (!nearest) return jay;
      const targetY = height - size.height;
      return Math.abs(jay.y - targetY) < Math.abs(nearest.y - targetY) ? jay : nearest;
    }, undefined);
  const approachDistance = nearestJay
    ? Math.hypot(nearestJay.x - x, nearestJay.y - (height - size.height))
    : Number.POSITIVE_INFINITY;
  const proximityFlex = Math.max(0, Math.min(1, 1 - approachDistance / Math.max(150, height * 0.22)));
  const idleBounce = Math.sin(elapsedMs * 0.006) * 2.2;
  const y = height - size.height + 12 + idleBounce;
  const lean = simulation ? Math.max(-0.08, Math.min(0.08, simulation.playerVelocity * 0.24)) : 0;
  const denim = context.createLinearGradient(0, y, 0, y + size.height);
  denim.addColorStop(0, "#3479b7");
  denim.addColorStop(1, "#174b7d");

  context.save();
  context.translate(x, y + size.height * 0.45);
  context.rotate(lean + Math.sin(elapsedMs * 0.025) * directionWobble * 0.075);
  context.scale(1 + squash * 0.12 + goldenReaction * 0.035, 1 - squash * 0.13 + goldenReaction * 0.02);
  context.translate(-x, -(y + size.height * 0.45));
  context.shadowColor = goldenReaction > 0.05 ? "rgba(255, 220, 55, 0.72)" : "rgba(0, 0, 0, 0.35)";
  context.shadowBlur = 14 + goldenReaction * 22;
  context.shadowOffsetY = 8;

  context.fillStyle = denim;
  context.strokeStyle = "#082744";
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(x - size.width * 0.46, y + 10);
  context.quadraticCurveTo(x, y + 24, x + size.width * 0.46, y + 10);
  context.lineTo(x + size.width * 0.4, y + size.height);
  context.lineTo(x + size.width * 0.07, y + size.height);
  context.lineTo(x, y + size.height * 0.52);
  context.lineTo(x - size.width * 0.07, y + size.height);
  context.lineTo(x - size.width * 0.4, y + size.height);
  context.closePath();
  context.fill();
  context.stroke();

  context.shadowColor = "transparent";
  context.fillStyle = "#0a3155";
  context.strokeStyle = "#ffd26a";
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(
    x,
    y + 10,
    size.width * (0.46 + proximityFlex * 0.025),
    11 + proximityFlex * 5 + squash * 2.5,
    0,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.stroke();

  if (proximityFlex > 0.04 || squash > 0.08) {
    context.save();
    context.globalAlpha = Math.min(0.7, proximityFlex * 0.5 + squash * 0.28);
    context.strokeStyle = goldenReaction > 0.1 ? "#fff2a1" : "#8cc8f4";
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(x, y + 12, size.width * 0.39, 6 + proximityFlex * 4, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  context.strokeStyle = "#f2bd55";
  context.lineWidth = 2;
  context.setLineDash([4, 4]);
  context.beginPath();
  context.moveTo(x - size.width * 0.38, y + 25);
  context.lineTo(x - size.width * 0.34, y + size.height - 5);
  context.moveTo(x + size.width * 0.38, y + 25);
  context.lineTo(x + size.width * 0.34, y + size.height - 5);
  context.moveTo(x, y + 27);
  context.lineTo(x, y + size.height * 0.52);
  context.stroke();
  context.setLineDash([]);

  context.strokeStyle = "#83b9e7";
  context.lineWidth = 3;
  context.beginPath();
  context.arc(x - size.width * 0.25, y + size.height * 0.44, size.width * 0.14, 0.15, 2.65);
  context.arc(x + size.width * 0.25, y + size.height * 0.44, size.width * 0.14, 0.49, 2.99);
  context.stroke();

  for (const offset of [-0.34, 0, 0.34]) {
    context.fillStyle = "#123f68";
    roundedRect(context, x + size.width * offset - 4, y - 2, 8, 25, 3);
    context.fill();
    context.strokeStyle = "#f2bd55";
    context.lineWidth = 1.5;
    context.stroke();
  }
  context.restore();
}

function drawEffects(
  context: CanvasRenderingContext2D,
  particles: Particle[],
  pops: ScorePop[],
  deltaMs: number,
  reducedMotion: boolean,
) {
  const dt = Math.min(34, deltaMs);
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.age += dt;
    particle.x += particle.vx * (dt / 1000);
    particle.y += particle.vy * (dt / 1000);
    particle.vy += 90 * (dt / 1000);
    const alpha = Math.max(0, 1 - particle.age / particle.life);
    context.globalAlpha = alpha;
    context.fillStyle = particle.color;
    context.beginPath();
    context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    context.fill();
    if (particle.age >= particle.life || reducedMotion) particles.splice(index, 1);
  }
  context.globalAlpha = 1;

  for (let index = pops.length - 1; index >= 0; index -= 1) {
    const pop = pops[index];
    pop.age += dt;
    const progress = pop.age / 620;
    context.save();
    context.globalAlpha = Math.max(0, 1 - progress);
    context.translate(pop.x, pop.y - progress * 54);
    context.scale(1 + Math.sin(Math.min(1, progress) * Math.PI) * 0.3, 1 + Math.sin(Math.min(1, progress) * Math.PI) * 0.3);
    context.font = "900 26px Fredoka, sans-serif";
    context.textAlign = "center";
    context.lineWidth = 5;
    context.strokeStyle = "#10223a";
    context.fillStyle = pop.golden ? "#ffe45c" : "#ffffff";
    context.strokeText(pop.value, 0, 0);
    context.fillText(pop.value, 0, 0);
    context.restore();
    if (pop.age >= 620) pops.splice(index, 1);
  }
}

export function JaysGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<GameSimulation>();
  const animationRef = useRef<number>();
  const lastFrameRef = useRef(0);
  const phaseRef = useRef<GamePhase>("intro");
  const countdownTimersRef = useRef<number[]>([]);
  const pressedKeysRef = useRef(new Set<string>());
  const particlesRef = useRef<Particle[]>([]);
  const scorePopsRef = useRef<ScorePop[]>([]);
  const squashRef = useRef(0);
  const shakeRef = useRef(0);
  const directionWobbleRef = useRef(0);
  const goldenReactionRef = useRef(0);
  const previousVelocitySignRef = useRef(0);
  const audioContextRef = useRef<AudioContext>();
  const bestAtRunStartRef = useRef(0);
  const personalBestTrackedRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const leaderboardSessionRef = useRef<string>();
  const leaderboardViewTrackedRef = useRef(false);
  const startNextLevelRef = useRef<() => void>(() => undefined);

  const [phase, setPhaseState] = useState<GamePhase>("intro");
  const [countdown, setCountdown] = useState("3");
  const [level, setLevel] = useState(1);
  const [levelProgress, setLevelProgress] = useState(0);
  const [levelTarget, setLevelTarget] = useState(5);
  const [secondsLeft, setSecondsLeft] = useState(12);
  const [bestLevel, setBestLevel] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [board, setBoard] = useState<BoardId>(DEFAULT_BOARD_ID);
  const [leaderboardAvailable, setLeaderboardAvailable] = useState(false);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>("today");
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [nickname, setNickname] = useState("");
  const [leaderboardFeedback, setLeaderboardFeedback] = useState("");
  const [submittingScore, setSubmittingScore] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const [finalStats, setFinalStats] = useState<RunStats>({
    highestLevel: 1,
    progress: 0,
    target: 5,
    totalJays: 0,
    normalCatches: 0,
    goldenCatches: 0,
    misses: 0,
  });

  const setPhase = useCallback((next: GamePhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const clearCountdownTimers = useCallback(() => {
    countdownTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    countdownTimersRef.current = [];
  }, []);

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const rect = stage.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const simulation = simulationRef.current;
    if (simulation) resizeSimulation(simulation, width, height);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground(context, width, height);
    if (simulation && phaseRef.current !== "intro") {
      simulation.jays.forEach((jay) => drawJay(context, jay, simulation.elapsedMs));
    }
    drawJeans(context, simulation, width, height, 0, simulation?.elapsedMs ?? 0);
  }, []);

  const playTone = useCallback(
    (golden: boolean) => {
      if (muted) return;
      const context = audioContextRef.current;
      if (!context) return;
      const now = context.currentTime;
      const frequencies = golden ? [660, 880, 1175] : [420, 610];
      frequencies.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = golden ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.035);
        gain.gain.setValueAtTime(0.0001, now + index * 0.035);
        gain.gain.exponentialRampToValueAtTime(golden ? 0.13 : 0.08, now + index * 0.035 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.035 + 0.16);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(now + index * 0.035);
        oscillator.stop(now + index * 0.035 + 0.18);
      });
    },
    [muted],
  );

  const unlockAudio = useCallback(() => {
    if (!audioContextRef.current) {
      const Constructor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
      if (Constructor) audioContextRef.current = new Constructor();
    }
    void audioContextRef.current?.resume();
  }, []);

  const finishRun = useCallback(() => {
    const simulation = simulationRef.current;
    if (!simulation || phaseRef.current === "results") return;
    window.cancelAnimationFrame(animationRef.current ?? 0);
    const stats = { ...simulation.stats };
    setFinalStats(stats);
    setSecondsLeft(0);
    if (stats.highestLevel > bestAtRunStartRef.current) {
      personalBestTrackedRef.current = true;
      setNewBest(true);
      setBestLevel(stats.highestLevel);
      try {
        localStorage.setItem(BEST_RUN_KEY, JSON.stringify({
          version: 2,
          highestLevel: stats.highestLevel,
          totalJays: stats.totalJays,
          date: new Date().toISOString(),
        } satisfies StoredBestRun));
      } catch {
        // Local best storage is optional.
      }
      safeTrack("personal_best", { highest_level: stats.highestLevel, total_jays: stats.totalJays });
    }
    setPhase("results");
    safeTrack("game_complete", {
      highest_level: stats.highestLevel,
      progress_in_failed_level: stats.progress,
      target_in_failed_level: stats.target,
      total_jays: stats.totalJays,
      golden_jays: stats.goldenCatches,
      misses: stats.misses,
    });
  }, [setPhase]);

  const renderGame = useCallback(
    (timestamp: number) => {
      const simulation = simulationRef.current;
      const canvas = canvasRef.current;
      if (!simulation || !canvas || phaseRef.current !== "playing") return;
      const context = canvas.getContext("2d");
      if (!context) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const deltaMs = lastFrameRef.current ? Math.min(34, timestamp - lastFrameRef.current) : 0;
      lastFrameRef.current = timestamp;

      const left = pressedKeysRef.current.has("arrowleft") || pressedKeysRef.current.has("a");
      const right = pressedKeysRef.current.has("arrowright") || pressedKeysRef.current.has("d");
      if (left !== right) {
        simulation.playerTargetX += (right ? 1 : -1) * simulation.width * 0.9 * (deltaMs / 1000);
      }

      const events = updateSimulation(simulation, deltaMs);
      const velocitySign = Math.abs(simulation.playerVelocity) > 0.035 ? Math.sign(simulation.playerVelocity) : 0;
      if (
        velocitySign !== 0 &&
        previousVelocitySignRef.current !== 0 &&
        velocitySign !== previousVelocitySignRef.current
      ) {
        directionWobbleRef.current = 1;
      }
      if (velocitySign !== 0) previousVelocitySignRef.current = velocitySign;
      for (const event of events) {
        if (event.type !== "catch") continue;
        const golden = event.kind === "golden";
        setLevelProgress(event.levelProgress);
        squashRef.current = golden ? 1.85 : 1.25;
        shakeRef.current = golden ? 1.15 : 0.5;
        if (golden) goldenReactionRef.current = 1;
        scorePopsRef.current.push({
          x: event.x,
          y: event.y,
          age: 0,
          value: golden ? "+5" : "+1",
          golden,
        });
        const particleCount = reducedMotionRef.current ? 0 : golden ? 16 : 7;
        for (let index = 0; index < particleCount; index += 1) {
          const angle = (Math.PI * 2 * index) / particleCount + Math.random() * 0.4;
          const speed = (golden ? 105 : 72) + Math.random() * 65;
          particlesRef.current.push({
            x: event.x,
            y: event.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 30,
            age: 0,
            life: golden ? 650 : 430,
            color: golden ? (index % 2 ? "#fff4a3" : "#ffd91c") : index % 2 ? "#ffffff" : "#e51f3f",
            size: golden ? 3.5 : 2.6,
          });
        }
        playTone(golden);
        if (navigator.vibrate) navigator.vibrate(golden ? [18, 28, 24] : 12);
        if (golden) safeTrack("golden_jay_caught", { level: simulation.level, total_jays: event.totalJays });
      }

      const cleared = events.find((event) => event.type === "level_complete");
      if (cleared?.type === "level_complete") {
        setLevelProgress(Math.min(cleared.progress, cleared.target));
        shakeRef.current = 1.4;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawBackground(context, simulation.width, simulation.height);
        simulation.jays.forEach((jay) => drawJay(context, jay, simulation.elapsedMs));
        drawJeans(
          context,
          simulation,
          simulation.width,
          simulation.height,
          squashRef.current,
          simulation.elapsedMs,
          directionWobbleRef.current,
          goldenReactionRef.current,
        );
        drawEffects(context, particlesRef.current, scorePopsRef.current, deltaMs, reducedMotionRef.current);
        setPhase("level_cleared");
        playTone(true);
        if (navigator.vibrate) navigator.vibrate([24, 30, 34]);
        safeTrack("level_complete", {
          level: cleared.level,
          target: cleared.target,
          total_jays: simulation.stats.totalJays,
        });
        countdownTimersRef.current = [window.setTimeout(() => startNextLevelRef.current(), 950)];
        return;
      }
      if (events.some((event) => event.type === "run_complete")) {
        finishRun();
        return;
      }

      setSecondsLeft(Math.max(0, Math.ceil((simulation.config.durationMs - simulation.elapsedMs) / 1000)));
      const shake = reducedMotionRef.current ? 0 : shakeRef.current * (simulation.width < 500 ? 2.2 : 1.4);
      context.setTransform(dpr, 0, 0, dpr, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      drawBackground(context, simulation.width, simulation.height);
      simulation.jays.forEach((jay) => drawJay(context, jay, simulation.elapsedMs));
      drawJeans(
        context,
        simulation,
        simulation.width,
        simulation.height,
        squashRef.current,
        simulation.elapsedMs,
        directionWobbleRef.current,
        goldenReactionRef.current,
      );
      drawEffects(context, particlesRef.current, scorePopsRef.current, deltaMs, reducedMotionRef.current);
      squashRef.current *= 0.82;
      shakeRef.current *= 0.78;
      directionWobbleRef.current *= 0.91;
      goldenReactionRef.current *= 0.9;
      animationRef.current = window.requestAnimationFrame(renderGame);
    },
    [finishRun, playTone, setPhase],
  );

  const startPlaying = useCallback(
    (resume: boolean) => {
      const canvas = canvasRef.current;
      const stage = stageRef.current;
      if (!canvas || !stage) return;
      if (!resume) {
        const rect = stage.getBoundingClientRect();
        simulationRef.current = createSimulation(rect.width, rect.height);
      }
      const simulation = simulationRef.current;
      if (!simulation) return;
      setLevel(simulation.level);
      setLevelProgress(simulation.levelProgress);
      setLevelTarget(simulation.config.target);
      setSecondsLeft(Math.max(0, Math.ceil((simulation.config.durationMs - simulation.elapsedMs) / 1000)));
      setPhase("playing");
      lastFrameRef.current = 0;
      const context = canvas.getContext("2d");
      if (context) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawBackground(context, simulation.width, simulation.height);
        simulation.jays.forEach((jay) => drawJay(context, jay, simulation.elapsedMs));
        drawJeans(context, simulation, simulation.width, simulation.height, 0, simulation.elapsedMs);
      }
      animationRef.current = window.requestAnimationFrame(renderGame);
      if (!resume) safeTrack("game_start");
    },
    [renderGame, setPhase],
  );

  const startNextLevel = useCallback(() => {
    const current = simulationRef.current;
    if (!current || phaseRef.current !== "level_cleared") return;
    particlesRef.current = [];
    scorePopsRef.current = [];
    simulationRef.current = createNextLevel(current);
    if (document.hidden) {
      const next = simulationRef.current;
      setLevel(next.level);
      setLevelProgress(0);
      setLevelTarget(next.config.target);
      setSecondsLeft(Math.ceil(next.config.durationMs / 1000));
      setPhase("paused");
      return;
    }
    startPlaying(true);
  }, [setPhase, startPlaying]);
  startNextLevelRef.current = startNextLevel;

  const beginCountdown = useCallback(
    (resume: boolean) => {
      clearCountdownTimers();
      setPhase("countdown");
      setCountdown("3");
      countdownTimersRef.current = [
        window.setTimeout(() => setCountdown("2"), 400),
        window.setTimeout(() => setCountdown("GO!"), 800),
        window.setTimeout(() => startPlaying(resume), 1200),
      ];
    },
    [clearCountdownTimers, setPhase, startPlaying],
  );

  const startRound = useCallback(
    (replay: boolean) => {
      unlockAudio();
      window.cancelAnimationFrame(animationRef.current ?? 0);
      clearCountdownTimers();
      simulationRef.current = undefined;
      particlesRef.current = [];
      scorePopsRef.current = [];
      pressedKeysRef.current.clear();
      squashRef.current = 0;
      shakeRef.current = 0;
      directionWobbleRef.current = 0;
      goldenReactionRef.current = 0;
      previousVelocitySignRef.current = 0;
      leaderboardSessionRef.current = undefined;
      leaderboardViewTrackedRef.current = false;
      setLevel(1);
      setLevelProgress(0);
      setLevelTarget(5);
      setSecondsLeft(12);
      setNewBest(false);
      setLeaderboardAvailable(false);
      setLeaderboardFeedback("");
      setShareFeedback("");
      bestAtRunStartRef.current = bestLevel;
      personalBestTrackedRef.current = false;
      void createLeaderboardSession(board)
        .then((session) => {
          if (session.available && session.token) leaderboardSessionRef.current = session.token;
        })
        .catch(() => {
          leaderboardSessionRef.current = undefined;
        });
      if (replay) safeTrack("game_replay");
      beginCountdown(false);
    },
    [beginCountdown, bestLevel, board, clearCountdownTimers, unlockAudio],
  );

  const pauseGame = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    window.cancelAnimationFrame(animationRef.current ?? 0);
    setPhase("paused");
  }, [setPhase]);

  const resumeGame = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    unlockAudio();
    beginCountdown(true);
  }, [beginCountdown, unlockAudio]);

  const toggleMuted = useCallback(() => {
    setMutedState((current) => {
      const next = !current;
      try {
        localStorage.setItem(MUTED_KEY, String(next));
      } catch {
        // Mute persistence is optional.
      }
      return next;
    });
  }, []);

  const changeLeaderboardPeriod = useCallback(
    (period: LeaderboardPeriod) => {
      setLeaderboardPeriod(period);
      setLeaderboardLoading(true);
      setLeaderboardFeedback("");
      void getLeaderboard(board, period)
        .then((response) => {
          setLeaderboardEntries(response.entries);
          setLeaderboardAvailable(response.available);
        })
        .catch(() => {
          setLeaderboardEntries([]);
          setLeaderboardFeedback("The leaderboard is having a lie-down. Your score is safe locally.");
        })
        .finally(() => setLeaderboardLoading(false));
    },
    [board],
  );

  const submitScore = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const validated = validateNickname(nickname);
      if (!validated.ok) {
        setLeaderboardFeedback(validated.error);
        return;
      }
      const token = leaderboardSessionRef.current;
      if (!token) {
        setLeaderboardFeedback("This round couldn’t be verified. Play again to try another submission.");
        safeTrack("leaderboard_submit_fail", { board, highest_level: finalStats.highestLevel });
        return;
      }
      setSubmittingScore(true);
      setLeaderboardFeedback("");
      try {
        const response = await submitLeaderboardScore({
          board,
          nickname: validated.nickname,
          highestLevel: finalStats.highestLevel,
          progress: finalStats.progress,
          target: finalStats.target,
          totalJays: finalStats.totalJays,
          goldenJays: finalStats.goldenCatches,
          misses: finalStats.misses,
          token,
        });
        leaderboardSessionRef.current = undefined;
        setNickname(validated.nickname);
        setLeaderboardPeriod("today");
        setLeaderboardEntries(response.entries);
        setLeaderboardFeedback("You’re on the board!");
        safeTrack("leaderboard_submit_success", { board, highest_level: finalStats.highestLevel });
      } catch {
        setLeaderboardFeedback("Couldn’t submit that score. You can still play again instantly.");
        safeTrack("leaderboard_submit_fail", { board, highest_level: finalStats.highestLevel });
      } finally {
        setSubmittingScore(false);
      }
    },
    [board, finalStats, nickname],
  );

  const shareScore = useCallback(async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("board", board);
    const shareData = {
      title: "Jays for Jeans",
      text: `I reached Level ${finalStats.highestLevel} with ${finalStats.totalJays} Jays in jeans. Beat that on the ${boardLabel(board)} board.`,
      url: url.toString(),
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareFeedback("Score shared!");
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        setShareFeedback("Score link copied!");
      }
    } catch {
      setShareFeedback("");
    }
  }, [board, finalStats.highestLevel, finalStats.totalJays]);

  const pointerX = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const simulation = simulationRef.current;
    const canvas = canvasRef.current;
    if (!simulation || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const playerWidth = getPlayerSize(simulation.width).width;
    simulation.playerTargetX = clampPlayerX(x, simulation.width, playerWidth);
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (phaseRef.current !== "playing") return;
      event.currentTarget.setPointerCapture(event.pointerId);
      pointerX(event);
      const simulation = simulationRef.current;
      if (simulation) simulation.playerX = simulation.playerTargetX;
    },
    [pointerX],
  );

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setBoard(sanitizeBoardId(new URLSearchParams(window.location.search).get("board")));
    try {
      const storedBest = JSON.parse(localStorage.getItem(BEST_RUN_KEY) || "null") as StoredBestRun | null;
      if (storedBest?.version === 2 && Number.isInteger(storedBest.highestLevel) && storedBest.highestLevel > 0) {
        setBestLevel(storedBest.highestLevel);
      }
      setMutedState(localStorage.getItem(MUTED_KEY) === "true");
    } catch {
      // The game remains fully playable without browser storage.
    }

    syncCanvasSize();
    const observer = new ResizeObserver(syncCanvasSize);
    if (stageRef.current) observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [syncCanvasSize]);

  useEffect(() => {
    if (phase !== "results") return;
    let active = true;
    setLeaderboardLoading(true);
    setLeaderboardPeriod("today");
    setLeaderboardFeedback("");
    void getLeaderboardStatus(board)
      .then(async (status) => {
        if (!active || !status.available) return;
        setLeaderboardAvailable(true);
        if (!leaderboardViewTrackedRef.current) {
          leaderboardViewTrackedRef.current = true;
          safeTrack("leaderboard_view", { board });
        }
        const response = await getLeaderboard(board, "today");
        if (active) setLeaderboardEntries(response.entries);
      })
      .catch(() => {
        if (active) setLeaderboardAvailable(false);
      })
      .finally(() => {
        if (active) setLeaderboardLoading(false);
      });
    return () => {
      active = false;
    };
  }, [board, phase]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) pauseGame();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["arrowleft", "arrowright", "a", "d"].includes(key)) {
        event.preventDefault();
        pressedKeysRef.current.add(key);
      }
      if ((key === " " || key === "enter") && phaseRef.current === "paused") {
        event.preventDefault();
        resumeGame();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => pressedKeysRef.current.delete(event.key.toLowerCase());
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [pauseGame, resumeGame]);

  useEffect(
    () => () => {
      window.cancelAnimationFrame(animationRef.current ?? 0);
      clearCountdownTimers();
      void audioContextRef.current?.close();
    },
    [clearCountdownTimers],
  );

  return (
    <main className="arcade-shell">
      <div className="arcade-ambient" aria-hidden="true" />
      <section ref={stageRef} className={`game-stage game-stage--${phase}`}>
        <canvas
          ref={canvasRef}
          className="game-canvas"
          role="img"
          aria-label="Falling cartoon Jays and a pair of jeans controlled by the player"
          onPointerDown={handlePointerDown}
          onPointerMove={(event) => {
            if (phaseRef.current === "playing" && event.currentTarget.hasPointerCapture(event.pointerId)) {
              pointerX(event);
            }
          }}
        />

        <button className="sound-button" type="button" onClick={toggleMuted} aria-label={muted ? "Turn sound on" : "Mute sound"}>
          {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        </button>

        {(phase === "playing" || phase === "paused" || phase === "countdown" || phase === "level_cleared") && (
          <div className="game-hud" aria-live="polite">
            <div className="hud-level">
              <span>LEVEL</span>
              <strong>{level}</strong>
            </div>
            <div className={`hud-progress ${levelTarget - levelProgress === 1 ? "hud-progress--one-left" : ""}`}>
              <img src="/jaysforjeans-logo.png" alt="Jays for Jeans" className="hud-logo" />
              <strong>{Math.min(levelProgress, levelTarget)} <small>/</small> {levelTarget}</strong>
              <span>{levelTarget - levelProgress === 1 ? "ONE JAY LEFT" : "JAYS"}</span>
            </div>
            <div className={`hud-timer ${secondsLeft <= 4 ? "hud-timer--urgent" : ""}`}>
              <span>TIME</span>
              <strong>00:{String(secondsLeft).padStart(2, "0")}</strong>
            </div>
          </div>
        )}

        {phase === "intro" && (
          <div className="screen screen--intro">
            <img src="/jaysforjeans-logo.png" alt="Jays for Jeans" className="hero-logo" />
            <div className="intro-copy">
              <p className="eyebrow">A highly scientific trouser challenge</p>
              <h1>HOW MANY LEVELS<br />CAN YOUR JEANS SURVIVE?</h1>
              <p className="instruction">Hit each Jay target before time runs out.</p>
            </div>
            <button className="arcade-button" type="button" onClick={() => startRound(false)}>
              <Play fill="currentColor" aria-hidden="true" />
              PLAY
            </button>
            {bestLevel > 0 && <p className="best-line">BEST LEVEL <strong>{bestLevel}</strong></p>}
            <p className="control-hint">Drag anywhere to move the jeans</p>
          </div>
        )}

        {phase === "countdown" && (
          <div className="countdown-overlay" aria-live="assertive">
            <span key={countdown}>{countdown}</span>
          </div>
        )}

        {phase === "level_cleared" && (
          <div className="level-cleared-overlay" aria-live="assertive">
            <div>
              <p>LEVEL {level}</p>
              <h2>LEVEL CLEARED</h2>
              <strong>{levelTarget} / {levelTarget} JAYS</strong>
            </div>
          </div>
        )}

        {phase === "paused" && (
          <div className="screen screen--pause">
            <div className="pause-card">
              <Pause aria-hidden="true" />
              <p className="eyebrow">TROUSERS ON HOLD</p>
              <h2>PAUSED</h2>
              <button className="arcade-button arcade-button--small" type="button" onClick={resumeGame}>
                <Play fill="currentColor" aria-hidden="true" />
                RESUME
              </button>
            </div>
          </div>
        )}

        {phase === "results" && (
          <div className="screen screen--results">
            <img src="/jaysforjeans-logo.png" alt="Jays for Jeans" className="result-logo" />
            <div className="result-card">
              {newBest && <p className="new-best-banner">NEW PERSONAL BEST!</p>}
              <p className="result-kicker">YOU REACHED</p>
              <p className="result-number">LEVEL {finalStats.highestLevel}</p>
              <h1>{finalStats.totalJays} {finalStats.totalJays === 1 ? "JAY" : "JAYS"} IN JEANS</h1>
              <p className="result-progress">{finalStats.progress} / {finalStats.target} on Level {finalStats.highestLevel}</p>
              <p className="result-message">{resultMessage(finalStats.highestLevel)}</p>
              <div className="result-stats" aria-label="Round statistics">
                <span><strong>{finalStats.totalJays}</strong> total Jays</span>
                <span><strong>{finalStats.goldenCatches}</strong> golden</span>
                <span><strong>{finalStats.misses}</strong> missed</span>
              </div>
              <button className="arcade-button" type="button" onClick={() => startRound(true)}>
                <Play fill="currentColor" aria-hidden="true" />
                PLAY AGAIN
              </button>
              <button className="share-button" type="button" onClick={shareScore}>
                <Share2 aria-hidden="true" />
                SHARE SCORE
              </button>
              {shareFeedback && <p className="share-feedback" aria-live="polite">{shareFeedback}</p>}

              {leaderboardAvailable && (
                <section className="leaderboard-panel" aria-label={`${boardLabel(board)} leaderboard`}>
                  <div className="leaderboard-heading">
                    <div>
                      <p><Trophy aria-hidden="true" /> TODAY&apos;S TOP JAYS</p>
                      <span><MapPin aria-hidden="true" /> {boardLabel(board)}</span>
                    </div>
                  </div>
                  <div className="leaderboard-tabs" role="tablist" aria-label="Leaderboard period">
                    {(["today", "week", "all"] as LeaderboardPeriod[]).map((period) => (
                      <button
                        key={period}
                        type="button"
                        role="tab"
                        aria-selected={leaderboardPeriod === period}
                        className={leaderboardPeriod === period ? "is-active" : ""}
                        onClick={() => changeLeaderboardPeriod(period)}
                      >
                        {period === "today" ? "Today" : period === "week" ? "This Week" : "All Time"}
                      </button>
                    ))}
                  </div>
                  <ol className="leaderboard-list" aria-live="polite">
                    {leaderboardLoading ? (
                      <li className="leaderboard-empty">Checking the waistband records…</li>
                    ) : leaderboardEntries.length ? (
                      leaderboardEntries.map((entry) => (
                        <li key={`${entry.rank}-${entry.nickname}-${entry.createdAt}`}>
                          <span className="leaderboard-rank">{entry.rank}</span>
                          <strong>{entry.nickname}</strong>
                          <b><span>LV {entry.highestLevel}</span><small>{entry.progress}/{entry.target} · {entry.totalJays} Jays</small></b>
                        </li>
                      ))
                    ) : (
                      <li className="leaderboard-empty">No scores yet. You could be first.</li>
                    )}
                  </ol>
                  <form className="leaderboard-form" onSubmit={submitScore}>
                    <label htmlFor="leaderboard-nickname">Put this score on the board (optional)</label>
                    <div>
                      <input
                        id="leaderboard-nickname"
                        type="text"
                        value={nickname}
                        onChange={(event) => setNickname(event.target.value)}
                        maxLength={16}
                        autoComplete="off"
                        placeholder="Nickname"
                        aria-describedby="leaderboard-feedback"
                      />
                      <button type="submit" disabled={submittingScore} aria-label="Submit score">
                        <Send aria-hidden="true" />
                      </button>
                    </div>
                  </form>
                  <p id="leaderboard-feedback" className="leaderboard-feedback" aria-live="polite">
                    {leaderboardFeedback}
                  </p>
                </section>
              )}
            </div>
          </div>
        )}
      </section>
      <p className="desktop-controls">Desktop: drag your mouse or use ← → / A D</p>
    </main>
  );
}
