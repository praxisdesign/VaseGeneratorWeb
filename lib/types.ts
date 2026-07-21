export type ProfilePoint = { id: string; height: number; radius: number };
export type MaskPoint = { id: string; height: number; strength: number };
export type PatternType = "none" | "verticalRibs" | "horizontalBands" | "diamond" | "spiral" | "cellular" | "noise";
export type PreviewMode = "material" | "bead" | "heatmap";

export type VasePreset = {
  id: string;
  name: string;
  recommended?: boolean;
  points: ProfilePoint[];
};

export type GeneratorSettings = {
  height: number;
  maxDiameter: number;
  overallScale: number;
  nozzleDiameter: number;
  layerHeight: number;
  printSpeed: number;
  radialSegments: number;
  previewMode: PreviewMode;
  patternType: PatternType;
  patternAmplitude: number;
  patternFrequency: number;
  patternTwist: number;
  patternSeed: number;
  maximumOffset: number;
};

export type ToolpathPoint = {
  index: number;
  gcodeLine: number;
  x: number;
  y: number;
  z: number;
  angle: number;
  radius: number;
  layer: number;
  feedRate: number;
  horizontalOffset: number;
  overhangAngle: number;
  risk: number;
  elapsedTime: number;
};

export type BuildabilityReport = {
  maximumOffset: number;
  maximumAngle: number;
  maximumRiskPoint: ToolpathPoint;
  warningCount: number;
  unsafeLength: number;
  printable: boolean;
  totalTime: number;
};
