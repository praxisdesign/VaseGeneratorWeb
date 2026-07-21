import type { VasePreset } from "./types";

const point = (id: string, height: number, radius: number) => ({ id, height, radius });

export const VASE_PRESETS: VasePreset[] = [
  { id: "cylinder", name: "Cylinder", recommended: true, points: [point("a", 0, .72), point("b", .5, .72), point("c", 1, .72)] },
  { id: "taper", name: "Taper", recommended: true, points: [point("a", 0, .9), point("b", .5, .72), point("c", 1, .55)] },
  { id: "classic", name: "Classic", recommended: true, points: [point("a", 0, .58), point("b", .22, .9), point("c", .62, .84), point("d", 1, .48)] },
  { id: "bottle", name: "Bottle", points: [point("a", 0, .62), point("b", .25, .9), point("c", .62, .78), point("d", .78, .4), point("e", 1, .35)] },
  { id: "bulb", name: "Bulb", recommended: true, points: [point("a", 0, .5), point("b", .28, 1), point("c", .7, .72), point("d", 1, .45)] },
  { id: "hourglass", name: "Hourglass", points: [point("a", 0, .78), point("b", .48, .45), point("c", 1, .78)] },
  { id: "flare", name: "Flare", points: [point("a", 0, .5), point("b", .55, .65), point("c", 1, 1)] },
  { id: "wave", name: "Wave", points: [point("a", 0, .62), point("b", .22, .88), point("c", .48, .58), point("d", .72, .85), point("e", 1, .62)] },
];
