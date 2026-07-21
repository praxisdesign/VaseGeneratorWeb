import * as THREE from "three";
import type { GeneratorSettings, ProfilePoint } from "./types";

export function interpolateRadius(points: ProfilePoint[], normalizedHeight: number) {
  const ordered = [...points].sort((a, b) => a.height - b.height);
  const upperIndex = ordered.findIndex((point) => point.height >= normalizedHeight);
  if (upperIndex <= 0) return ordered[0]?.radius ?? 0.5;
  const lower = ordered[upperIndex - 1];
  const upper = ordered[upperIndex];
  const t = (normalizedHeight - lower.height) / (upper.height - lower.height || 1);
  const smooth = t * t * (3 - 2 * t);
  return THREE.MathUtils.lerp(lower.radius, upper.radius, smooth);
}

export function createLathePoints(points: ProfilePoint[], settings: GeneratorSettings) {
  const scaledHeight = settings.height * settings.overallScale;
  const scaledDiameter = settings.maxDiameter * settings.overallScale;
  return Array.from({ length: 81 }, (_, index) => {
    const t = index / 80;
    return new THREE.Vector2(interpolateRadius(points, t) * scaledDiameter * 0.5, t * scaledHeight);
  });
}
