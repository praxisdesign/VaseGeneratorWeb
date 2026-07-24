import { create } from "zustand";
import { persist } from "zustand/middleware";
import { VASE_PRESETS } from "@/lib/presets";
import type { CameraSnapshot, GeneratorSettings, MaskPoint, ProfilePoint } from "@/lib/types";

// Portal embeds this tool once per project (see ToolWorkspace.tsx), passing the
// project id as `?project=`. Scoping the persisted storage key by it keeps two
// projects using this tool from overwriting each other's saved design.
function storageKey(base: string) {
  if (typeof window === "undefined") return base;
  const projectId = new URLSearchParams(window.location.search).get("project");
  return projectId ? `${base}:${projectId}` : base;
}

type GeneratorStore = {
  presetId: string;
  points: ProfilePoint[];
  mask: MaskPoint[];
  settings: GeneratorSettings;
  simulationIndex: number;
  simulationPlaying: boolean;
  playbackSpeed: number;
  camera: CameraSnapshot | null;
  selectPreset: (id: string) => void;
  updatePoint: (id: string, patch: Partial<ProfilePoint>) => void;
  updateMaskPoint: (id: string, patch: Partial<MaskPoint>) => void;
  updateSettings: (patch: Partial<GeneratorSettings>) => void;
  updateSimulation: (patch: Partial<Pick<GeneratorStore, "simulationIndex" | "simulationPlaying" | "playbackSpeed">>) => void;
  setCamera: (camera: CameraSnapshot | null) => void;
};

const initial = VASE_PRESETS[2];

export const useGeneratorStore = create<GeneratorStore>()(
  persist(
    (set) => ({
      presetId: initial.id,
      points: initial.points,
      mask: [
        { id: "m0", height: 0, strength: 0 },
        { id: "m1", height: .18, strength: 0 },
        { id: "m2", height: .5, strength: 1 },
        { id: "m3", height: .82, strength: 1 },
        { id: "m4", height: 1, strength: 0 },
      ],
      settings: {
        height: 600, maxDiameter: 420, overallScale: 1,
        nozzleDiameter: 35, layerHeight: 20, printSpeed: 1800,
        radialSegments: 128, previewMode: "bead",
        patternType: "none", patternAmplitude: 3, patternFrequency: 8,
        patternTwist: 3, patternSeed: 4, maximumOffset: 7,
      },
      simulationIndex: 0,
      simulationPlaying: false,
      playbackSpeed: 1,
      camera: null,
      selectPreset: (id) => set(() => {
        const preset = VASE_PRESETS.find((item) => item.id === id) ?? initial;
        return { presetId: preset.id, points: preset.points.map((point) => ({ ...point })), simulationIndex: 0, simulationPlaying: false };
      }),
      updatePoint: (id, patch) => set((state) => ({ points: state.points.map((point) => point.id === id ? { ...point, ...patch } : point), simulationIndex: 0 })),
      updateMaskPoint: (id, patch) => set((state) => ({ mask: state.mask.map((point) => point.id === id ? { ...point, ...patch } : point), simulationIndex: 0 })),
      updateSettings: (patch) => set((state) => {
        const previewOnly = Object.keys(patch).every((key) => key === "previewMode");
        return previewOnly
          ? { settings: { ...state.settings, ...patch } }
          : { settings: { ...state.settings, ...patch }, simulationIndex: 0, simulationPlaying: false };
      }),
      updateSimulation: (patch) => set(patch),
      setCamera: (camera) => set({ camera }),
    }),
    {
      name: storageKey("vase-generator"),
      // Simulation playback position is transient viewing state, not design work --
      // restoring the profile/mask/settings/camera is what actually matters after a
      // refresh.
      partialize: (state) => ({ presetId: state.presetId, points: state.points, mask: state.mask, settings: state.settings, camera: state.camera }),
    },
  ),
);
