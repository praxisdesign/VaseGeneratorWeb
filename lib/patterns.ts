import type { GeneratorSettings, MaskPoint } from "./types";

function smoothstep(value: number) { return value * value * (3 - 2 * value); }

export function evaluateMask(points: MaskPoint[], height: number) {
  const ordered = [...points].sort((a, b) => a.height - b.height);
  const upperIndex = ordered.findIndex((point) => point.height >= height);
  if (upperIndex <= 0) return ordered[0]?.strength ?? 1;
  const lower = ordered[upperIndex - 1];
  const upper = ordered[upperIndex];
  const t = smoothstep((height - lower.height) / (upper.height - lower.height || 1));
  return lower.strength + (upper.strength - lower.strength) * t;
}

function noise(angle: number, height: number, seed: number) {
  return (
    Math.sin(angle * 3.1 + height * 11.7 + seed) * .55 +
    Math.sin(angle * 7.3 - height * 23.1 + seed * 1.7) * .3 +
    Math.sin(angle * 13.7 + height * 41.3 + seed * .4) * .15
  );
}

export function evaluatePattern(angle: number, height: number, settings: GeneratorSettings) {
  const f = settings.patternFrequency;
  const rotation = height * Math.PI * 2 * settings.patternTwist;
  const twistedAngle = angle + rotation;
  switch (settings.patternType) {
    case "verticalRibs": return Math.sin(twistedAngle * f);
    case "horizontalBands": return Math.sin(height * Math.PI * 2 * f + angle * settings.patternTwist);
    case "diamond": return Math.sin((angle + rotation) * f) * Math.sin((angle - rotation) * f);
    case "spiral": return Math.sin(twistedAngle * f);
    case "cellular": return Math.cos(twistedAngle * f) * Math.cos(height * Math.PI * 2 * Math.max(2, f / 2));
    case "noise": return noise(twistedAngle, height, settings.patternSeed);
    default: return 0;
  }
}

export function applyPattern(baseRadius: number, angle: number, height: number, settings: GeneratorSettings, mask: MaskPoint[]) {
  const strength = evaluateMask(mask, height);
  const raw = baseRadius + evaluatePattern(angle, height, settings) * settings.patternAmplitude * strength;
  // A pattern displacement larger than the base radius would flip the point past the
  // vase's center axis, producing self-intersecting, physically unprintable geometry.
  // The nozzle can't extrude a wall thinner than itself, so that's also the floor.
  const minRadius = settings.nozzleDiameter / 2;
  return Math.max(minRadius, raw);
}
