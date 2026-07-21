import { interpolateRadius } from "./geometry";
import { applyPattern } from "./patterns";
import type { BuildabilityReport, GeneratorSettings, MaskPoint, ProfilePoint, ToolpathPoint } from "./types";

export function generateToolpath(profile: ProfilePoint[], settings: GeneratorSettings, mask: MaskPoint[]) {
  const scaledHeight = settings.height * settings.overallScale;
  const scaledDiameter = settings.maxDiameter * settings.overallScale;
  const turns = scaledHeight / settings.layerHeight;
  const samplesPerTurn = 48;
  const count = Math.max(240, Math.ceil(turns * samplesPerTurn));
  const result: ToolpathPoint[] = [];
  let elapsedTime = 0;

  for (let index = 0; index <= count; index += 1) {
    const progress = index / count;
    const z = progress * scaledHeight;
    const angle = progress * turns * Math.PI * 2;
    const baseRadius = interpolateRadius(profile, progress) * scaledDiameter * .5;
    const radius = applyPattern(baseRadius, angle, progress, settings, mask);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const previous = result[index - 1];
    if (previous) elapsedTime += Math.hypot(x - previous.x, y - previous.y, z - previous.z) / settings.printSpeed * 60;
    const below = result[index - samplesPerTurn];
    const horizontalOffset = below ? Math.hypot(x - below.x, y - below.y) : 0;
    const overhangAngle = Math.atan2(horizontalOffset, settings.layerHeight) * 180 / Math.PI;
    result.push({
      index, gcodeLine: index + 7, x, y, z, angle, radius,
      layer: Math.min(Math.ceil(turns), Math.floor(z / settings.layerHeight) + 1),
      feedRate: settings.printSpeed,
      horizontalOffset, overhangAngle,
      risk: Math.min(1, horizontalOffset / settings.maximumOffset),
      elapsedTime,
    });
  }
  return result;
}

export function analyzeToolpath(path: ToolpathPoint[], maximumOffset: number): BuildabilityReport {
  const maximumRiskPoint = path.reduce((worst, point) => point.horizontalOffset > worst.horizontalOffset ? point : worst, path[0]);
  let warningCount = 0;
  let unsafeLength = 0;
  path.forEach((point, index) => {
    if (point.horizontalOffset > maximumOffset) {
      warningCount += 1;
      const previous = path[index - 1];
      if (previous) unsafeLength += Math.hypot(point.x - previous.x, point.y - previous.y, point.z - previous.z);
    }
  });
  return {
    maximumOffset: maximumRiskPoint.horizontalOffset,
    maximumAngle: maximumRiskPoint.overhangAngle,
    maximumRiskPoint,
    warningCount,
    unsafeLength,
    printable: warningCount === 0,
    totalTime: path.at(-1)?.elapsedTime ?? 0,
  };
}

export function riskColor(risk: number) {
  if (risk < .5) return "#4c9a67";
  if (risk < .75) return "#d6ad3c";
  if (risk < 1) return "#df7d32";
  return "#d5493f";
}
