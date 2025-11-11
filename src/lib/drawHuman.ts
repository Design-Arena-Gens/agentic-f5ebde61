import type { AgentConfig, ArtStyle, Mood, Pose } from "./artAgent";

export interface RenderConfig {
  width: number;
  height: number;
  seed: number;
  agent: AgentConfig;
}

interface Vec2 {
  x: number;
  y: number;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, values: T[]): T {
  return values[Math.floor(rng() * values.length)];
}

function shadeColor(color: string, amount: number) {
  const clamp = (value: number) => Math.min(255, Math.max(0, value));
  const hex = color.replace("#", "");
  const num = parseInt(hex, 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0xff) + amount);
  const b = clamp((num & 0xff) + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function getBackgroundColors(agent: AgentConfig): { base: string; accent: string } {
  const { palette, style } = agent;
  const anchor = palette[0] ?? "#1a1a1a";
  if (style === "neon") {
    return { base: "#030014", accent: palette[1] ?? "#08fdd8" };
  }
  if (style === "charcoal") {
    return { base: "#060606", accent: "#1f1f1f" };
  }
  if (style === "pastel") {
    return { base: palette[0] ?? "#f7f4ef", accent: palette[2] ?? "#e8f7ff" };
  }
  if (style === "watercolor") {
    return { base: palette[0] ?? "#f4ede4", accent: palette[2] ?? "#c9e8f2" };
  }
  return { base: "#f4f4f4", accent: shadeColor(anchor, -20) };
}

function drawBackground(ctx: CanvasRenderingContext2D, config: RenderConfig, rng: () => number) {
  const { width, height, agent } = config;
  const { base, accent } = getBackgroundColors(agent);
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, base);
  gradient.addColorStop(1, accent);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const overlayGradient = ctx.createRadialGradient(width * 0.5, height * 0.3, width * 0.05, width * 0.5, height * 0.3, width);
  const lightTone = shadeColor(agent.palette[1] ?? base, 40);
  overlayGradient.addColorStop(0, `${agent.style === "neon" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.22)"}`);
  overlayGradient.addColorStop(1, `${agent.style === "charcoal" ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0)"}`);
  ctx.fillStyle = overlayGradient;
  ctx.fillRect(0, 0, width, height);

  // Add background brush strokes depending on style.
  const strokes = agent.complexity * 10;
  for (let i = 0; i < strokes; i++) {
    const x = rng() * width;
    const y = rng() * height;
    const w = (rng() * width) / 2;
    const h = (rng() * height) / 12;
    const rotation = (rng() - 0.5) * Math.PI;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    const color = shadeColor(pick(rng, agent.palette), agent.style === "charcoal" ? -50 : 30);
    ctx.fillStyle = agent.style === "line" ? "rgba(0,0,0,0.04)" : `${color.replace("rgb", "rgba").replace(")", agent.style === "neon" ? ", 0.25)" : ", 0.12)")}`;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
}

function generateSkeleton(config: RenderConfig, rng: () => number): Record<Pose, Vec2[]> {
  const { width, height } = config;
  const centerX = width / 2;
  const baseY = height * 0.85;
  const torsoHeight = height * 0.38;
  const headRadius = height * 0.07;

  const torsoTop = { x: centerX, y: baseY - torsoHeight };
  const neck = { x: centerX, y: torsoTop.y - headRadius * 0.5 };
  const headTop = { x: centerX, y: neck.y - headRadius * 2 };
  const hipLeft = { x: centerX - headRadius * 0.7, y: baseY - torsoHeight * 0.25 };
  const hipRight = { x: centerX + headRadius * 0.7, y: baseY - torsoHeight * 0.22 };

  const legLength = height * 0.32;
  const shoulderSpan = headRadius * 2.4;
  const shoulderLeft = { x: centerX - shoulderSpan / 2, y: neck.y + headRadius * 0.4 };
  const shoulderRight = { x: centerX + shoulderSpan / 2, y: neck.y + headRadius * 0.35 };

  const standing: Vec2[] = [
    headTop,
    neck,
    shoulderLeft,
    { x: shoulderLeft.x - headRadius * 0.3, y: shoulderLeft.y + headRadius * 2 },
    { x: shoulderLeft.x - headRadius * 0.4, y: baseY - legLength * 0.7 },
    neck,
    shoulderRight,
    { x: shoulderRight.x + headRadius * 0.6, y: shoulderRight.y + headRadius * 1.3 },
    { x: shoulderRight.x + headRadius * 0.5, y: baseY - legLength * 0.2 },
    hipLeft,
    { x: hipLeft.x - headRadius * 0.2, y: baseY - legLength * 0.2 },
    { x: hipLeft.x - headRadius * 0.3, y: baseY },
    hipRight,
    { x: hipRight.x + headRadius * 0.1, y: baseY - legLength * (0.05 + rng() * 0.1) },
    { x: hipRight.x + headRadius * 0.2, y: baseY },
  ];

  const sitting = standing.map((point, index) => {
    if (index >= standing.length - 6) {
      return { x: point.x, y: baseY - legLength * 0.1 + (index % 2 === 0 ? headRadius * 0.5 : headRadius) };
    }
    if (index === 3 || index === 4) {
      return { x: point.x - headRadius * 0.6, y: point.y + headRadius * 0.4 };
    }
    if (index === 7 || index === 8) {
      return { x: point.x + headRadius * 0.5, y: point.y + headRadius * 0.3 };
    }
    return point;
  });

  const dancing = standing.map((point, index) => {
    const sway = Math.sin(point.y / height * Math.PI) * headRadius * 0.4;
    if (index < 6) {
      return { x: point.x - sway, y: point.y };
    }
    if (index < 10) {
      return { x: point.x + sway * 1.5, y: point.y - headRadius * 0.3 };
    }
    if (index >= 10) {
      return { x: point.x + (index % 2 === 0 ? sway * 1.8 : sway * 0.6), y: point.y - headRadius * 0.6 };
    }
    return point;
  });

  const stretching = standing.map((point, index) => {
    if (index === 2 || index === 3) {
      return { x: point.x - headRadius * 0.2, y: point.y - headRadius };
    }
    if (index === 6 || index === 7) {
      return { x: point.x + headRadius * 0.2, y: point.y - headRadius * 1.2 };
    }
    if (index >= 10) {
      return { x: point.x, y: point.y + headRadius * 0.5 };
    }
    return point;
  });

  const profile = standing.map((point, index) => {
    const tilt = headRadius * 0.9;
    if (index === 0) {
      return { x: point.x + tilt, y: point.y + headRadius * 0.1 };
    }
    if (index % 3 === 0) {
      return { x: point.x + tilt * 0.5, y: point.y };
    }
    return { x: point.x + tilt * 0.3, y: point.y };
  });

  return {
    standing,
    sitting,
    dancing,
    stretching,
    profile,
  };
}

function drawFigure(
  ctx: CanvasRenderingContext2D,
  config: RenderConfig,
  rng: () => number,
  skeletons: Record<Pose, Vec2[]>,
) {
  const { agent, width, height } = config;
  const points = skeletons[agent.pose];
  const baseColor = agent.style === "charcoal" ? "#f1f1f1" : pick(rng, agent.palette);

  ctx.strokeStyle = agent.style === "neon" ? "#ffffff" : shadeColor(baseColor, agent.style === "charcoal" ? -80 : -30);
  ctx.lineWidth = Math.max(4, agent.complexity * 1.5);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x + rng() * 8 - 4, point.y + rng() * 8 - 4);
    }
  });
  ctx.stroke();

  // Head
  const headRadius = height * 0.07 + rng() * 8 - 4;
  const headCenter = { x: points[0].x, y: points[0].y + headRadius * 1.2 };
  ctx.beginPath();
  ctx.fillStyle =
    agent.style === "neon"
      ? `${pick(rng, agent.palette).replace("rgb", "rgba").replace(")", ", 0.8)")}`
      : `${baseColor.replace("rgb", "rgba").replace(")", agent.style === "charcoal" ? ", 0.5)" : ", 0.7)")}`;
  ctx.ellipse(headCenter.x, headCenter.y, headRadius, headRadius * 1.1, 0, 0, Math.PI * 2);
  ctx.fill();

  // Torso shading
  const torsoGradient = ctx.createLinearGradient(headCenter.x, headCenter.y, headCenter.x, height * 0.9);
  torsoGradient.addColorStop(0, baseColor);
  torsoGradient.addColorStop(1, shadeColor(baseColor, agent.style === "charcoal" ? -60 : -10));
  ctx.fillStyle = torsoGradient;
  ctx.beginPath();
  ctx.moveTo(headCenter.x - headRadius * 0.5, headCenter.y + headRadius * 1.2);
  ctx.quadraticCurveTo(headCenter.x - headRadius * 0.8, height * 0.65, headCenter.x - headRadius * 0.4, height * 0.85);
  ctx.lineTo(headCenter.x + headRadius * 0.4, height * 0.85);
  ctx.quadraticCurveTo(headCenter.x + headRadius * 0.8, height * 0.65, headCenter.x + headRadius * 0.4, headCenter.y + headRadius * 1.2);
  ctx.closePath();
  ctx.fill();

  // Accent strokes
  const accentCount = agent.complexity * 2 + 4;
  for (let i = 0; i < accentCount; i++) {
    const start = pick(rng, points);
    const end = pick(rng, points);
    ctx.beginPath();
    ctx.strokeStyle =
      agent.style === "charcoal"
        ? "rgba(255,255,255,0.08)"
        : agent.style === "neon"
        ? `${pick(rng, agent.palette).replace("rgb", "rgba").replace(")", ", 0.8)")}`
        : `${pick(rng, agent.palette).replace("rgb", "rgba").replace(")", ", 0.35)")}`;
    ctx.lineWidth = agent.style === "line" ? 2 + rng() * 2 : 4 + rng() * agent.complexity;
    ctx.moveTo(start.x + rng() * 6 - 3, start.y + rng() * 6 - 3);
    ctx.quadraticCurveTo(
      (start.x + end.x) / 2 + rng() * 20 - 10,
      (start.y + end.y) / 2 + rng() * 30 - 15,
      end.x + rng() * 6 - 3,
      end.y + rng() * 6 - 3,
    );
    ctx.stroke();
  }

  // Mood halo
  if (agent.mood === "serene" || agent.mood === "melancholic") {
    const haloGradient = ctx.createRadialGradient(
      headCenter.x,
      headCenter.y,
      headRadius * 0.6,
      headCenter.x,
      headCenter.y,
      headRadius * 3,
    );
    haloGradient.addColorStop(0, `${pick(rng, agent.palette).replace("rgb", "rgba").replace(")", ", 0.35)")}`);
    haloGradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = haloGradient;
    ctx.beginPath();
    ctx.ellipse(headCenter.x, headCenter.y, headRadius * 3.5, headRadius * 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function addTexture(ctx: CanvasRenderingContext2D, config: RenderConfig, rng: () => number) {
  const { width, height, agent } = config;
  const specks = agent.style === "neon" ? 200 : agent.complexity * 80;
  const baseColor = agent.palette[0] ?? "#111";
  for (let i = 0; i < specks; i++) {
    const x = rng() * width;
    const y = rng() * height;
    const size = rng() * 2 + 0.5;
    ctx.fillStyle =
      agent.style === "charcoal"
        ? `rgba(255,255,255,${0.05 + rng() * 0.08})`
        : `${shadeColor(baseColor, agent.style === "neon" ? 120 : 40).replace("rgb", "rgba").replace(")", `, ${agent.style === "neon" ? 0.4 : 0.08})`)}`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function renderHumanArt(ctx: CanvasRenderingContext2D, config: RenderConfig) {
  const rng = mulberry32(config.seed);
  const skeletons = generateSkeleton(config, rng);
  drawBackground(ctx, config, rng);
  drawFigure(ctx, config, rng, skeletons);
  addTexture(ctx, config, rng);
}
