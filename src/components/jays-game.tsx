"use client";

import { track } from "@vercel/analytics";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  ROUND_DURATION_MS,
  clampPlayerX,
  createSimulation,
  getPlayerSize,
  resizeSimulation,
  resultMessage,
  updateSimulation,
  type GamePhase,
  type GameSimulation,
  type Jay,
  type RoundStats,
} from "@/lib/jays-game-engine";

const BEST_SCORE_KEY = "jaysforjeans.personalBest.v1";
const MUTED_KEY = "jaysforjeans.muted.v1";

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
) {
  const size = getPlayerSize(width);
  const x = simulation?.playerX ?? width / 2;
  const y = height - size.height + 12;
  const lean = simulation ? Math.max(-0.08, Math.min(0.08, simulation.playerVelocity * 0.24)) : 0;
  const denim = context.createLinearGradient(0, y, 0, y + size.height);
  denim.addColorStop(0, "#3479b7");
  denim.addColorStop(1, "#174b7d");

  context.save();
  context.translate(x, y + size.height * 0.45);
  context.rotate(lean);
  context.scale(1 + squash * 0.09, 1 - squash * 0.1);
  context.translate(-x, -(y + size.height * 0.45));
  context.shadowColor = "rgba(0, 0, 0, 0.35)";
  context.shadowBlur = 14;
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
  context.ellipse(x, y + 10, size.width * 0.46, 11, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

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
  const audioContextRef = useRef<AudioContext>();
  const bestAtRoundStartRef = useRef(0);
  const personalBestTrackedRef = useRef(false);
  const reducedMotionRef = useRef(false);

  const [phase, setPhaseState] = useState<GamePhase>("intro");
  const [countdown, setCountdown] = useState("3");
  const [score, setScore] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [bestScore, setBestScore] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [muted, setMutedState] = useState(false);
  const [finalStats, setFinalStats] = useState<RoundStats>({
    score: 0,
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
    drawJeans(context, simulation, width, height, 0);
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

  const finishRound = useCallback(() => {
    const simulation = simulationRef.current;
    if (!simulation || phaseRef.current === "results") return;
    window.cancelAnimationFrame(animationRef.current ?? 0);
    const stats = { ...simulation.stats };
    setFinalStats(stats);
    setScore(stats.score);
    setSecondsLeft(0);
    setPhase("results");
    safeTrack("game_complete", {
      score: stats.score,
      normal_catches: stats.normalCatches,
      golden_catches: stats.goldenCatches,
      total_catches: stats.normalCatches + stats.goldenCatches,
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
      for (const event of events) {
        if (event.type === "round_complete") {
          finishRound();
          return;
        }
        if (event.type !== "catch") continue;
        const golden = event.kind === "golden";
        setScore(event.score);
        squashRef.current = golden ? 1.5 : 1;
        shakeRef.current = golden ? 1 : 0.45;
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
        if (golden) safeTrack("golden_jay_caught", { score: event.score });

        if (event.score > bestAtRoundStartRef.current && !personalBestTrackedRef.current) {
          personalBestTrackedRef.current = true;
          setNewBest(true);
          setBestScore(event.score);
          try {
            localStorage.setItem(BEST_SCORE_KEY, String(event.score));
          } catch {
            // Local score storage is optional.
          }
          safeTrack("personal_best", { score: event.score });
        } else if (personalBestTrackedRef.current) {
          setBestScore(event.score);
          try {
            localStorage.setItem(BEST_SCORE_KEY, String(event.score));
          } catch {
            // Local score storage is optional.
          }
        }
      }

      setSecondsLeft(Math.max(0, Math.ceil((ROUND_DURATION_MS - simulation.elapsedMs) / 1000)));
      const shake = reducedMotionRef.current ? 0 : shakeRef.current * (simulation.width < 500 ? 2.2 : 1.4);
      context.setTransform(dpr, 0, 0, dpr, (Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      drawBackground(context, simulation.width, simulation.height);
      simulation.jays.forEach((jay) => drawJay(context, jay, simulation.elapsedMs));
      drawJeans(context, simulation, simulation.width, simulation.height, squashRef.current);
      drawEffects(context, particlesRef.current, scorePopsRef.current, deltaMs, reducedMotionRef.current);
      squashRef.current *= 0.82;
      shakeRef.current *= 0.78;
      animationRef.current = window.requestAnimationFrame(renderGame);
    },
    [finishRound, playTone],
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
      setPhase("playing");
      lastFrameRef.current = 0;
      const context = canvas.getContext("2d");
      if (context) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawBackground(context, simulation.width, simulation.height);
        simulation.jays.forEach((jay) => drawJay(context, jay, simulation.elapsedMs));
        drawJeans(context, simulation, simulation.width, simulation.height, 0);
      }
      animationRef.current = window.requestAnimationFrame(renderGame);
      if (!resume) safeTrack("game_start");
    },
    [renderGame, setPhase],
  );

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
      particlesRef.current = [];
      scorePopsRef.current = [];
      pressedKeysRef.current.clear();
      setScore(0);
      setSecondsLeft(30);
      setNewBest(false);
      bestAtRoundStartRef.current = bestScore;
      personalBestTrackedRef.current = false;
      if (replay) safeTrack("game_replay");
      beginCountdown(false);
    },
    [beginCountdown, bestScore, unlockAudio],
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
    try {
      const storedBest = Number.parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10);
      if (Number.isFinite(storedBest) && storedBest > 0) setBestScore(storedBest);
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

        {(phase === "playing" || phase === "paused" || phase === "countdown") && (
          <div className="game-hud" aria-live="polite">
            <div className="hud-score">
              <span>SCORE</span>
              <strong>{score}</strong>
              {newBest && <em>NEW BEST!</em>}
            </div>
            <img src="/jaysforjeans-logo.png" alt="Jays for Jeans" className="hud-logo" />
            <div className={`hud-timer ${secondsLeft <= 7 ? "hud-timer--urgent" : ""}`}>
              <span>TIME</span>
              <strong>{secondsLeft}</strong>
            </div>
          </div>
        )}

        {phase === "intro" && (
          <div className="screen screen--intro">
            <img src="/jaysforjeans-logo.png" alt="Jays for Jeans" className="hero-logo" />
            <div className="intro-copy">
              <p className="eyebrow">A highly scientific trouser challenge</p>
              <h1>HOW MANY JAYS<br />CAN YOU GET INTO JEANS?</h1>
              <p className="instruction">Catch as many Jays as you can.</p>
            </div>
            <button className="arcade-button" type="button" onClick={() => startRound(false)}>
              <Play fill="currentColor" aria-hidden="true" />
              PLAY
            </button>
            {bestScore > 0 && <p className="best-line">PERSONAL BEST <strong>{bestScore}</strong></p>}
            <p className="control-hint">Drag anywhere to move the jeans</p>
          </div>
        )}

        {phase === "countdown" && (
          <div className="countdown-overlay" aria-live="assertive">
            <span key={countdown}>{countdown}</span>
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
              <p className="result-number">{finalStats.score}</p>
              <h1>{finalStats.score === 1 ? "JAY IN JEANS" : "JAYS IN JEANS"}</h1>
              <p className="result-message">{resultMessage(finalStats.score)}</p>
              <div className="result-stats" aria-label="Round statistics">
                <span><strong>{finalStats.normalCatches + finalStats.goldenCatches}</strong> caught</span>
                <span><strong>{finalStats.misses}</strong> missed</span>
                <span><strong>{bestScore}</strong> best</span>
              </div>
              <button className="arcade-button" type="button" onClick={() => startRound(true)}>
                <Play fill="currentColor" aria-hidden="true" />
                PLAY AGAIN
              </button>
            </div>
          </div>
        )}
      </section>
      <p className="desktop-controls">Desktop: drag your mouse or use ← → / A D</p>
    </main>
  );
}
