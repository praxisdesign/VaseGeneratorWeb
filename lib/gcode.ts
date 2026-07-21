import type { GeneratorSettings, ToolpathPoint } from "./types";

export function generateGcode(path: ToolpathPoint[], settings: GeneratorSettings) {
  const lines = [
    "; VaseGeneratorWeb concrete toolpath",
    `; nozzle=${settings.nozzleDiameter}mm layer=${settings.layerHeight}mm`,
    "G21", "G90", "G92 X0 Y0 Z0", "M3",
    ...path.map((point) => `G1 X${point.x.toFixed(3)} Y${point.y.toFixed(3)} Z${point.z.toFixed(3)} F${point.feedRate}`),
    "M5", "G0 Z100.000", "M2",
  ];
  return lines.join("\n");
}

export function downloadGcode(content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "vase-toolpath.gcode";
  anchor.click();
  URL.revokeObjectURL(url);
}
