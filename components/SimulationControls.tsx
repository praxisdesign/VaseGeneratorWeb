import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ToolpathPoint } from "@/lib/types";
import { useGeneratorStore } from "@/store/generatorStore";

export function SimulationControls({ path }: { path: ToolpathPoint[] }) {
  const { simulationIndex, simulationPlaying, playbackSpeed, updateSimulation } = useGeneratorStore();
  const lastFrame = useRef<number | null>(null);
  const accumulated = useRef(0);

  useEffect(() => {
    if (!simulationPlaying) { lastFrame.current = null; return; }
    let frame = 0;
    const animate = (time: number) => {
      if (lastFrame.current !== null) accumulated.current += (time - lastFrame.current) / 1000 * playbackSpeed;
      lastFrame.current = time;
      let next = useGeneratorStore.getState().simulationIndex;
      while (next < path.length - 1 && path[next + 1].elapsedTime <= path[next].elapsedTime + accumulated.current) {
        accumulated.current -= path[next + 1].elapsedTime - path[next].elapsedTime;
        next += 1;
      }
      if (next >= path.length - 1) updateSimulation({ simulationIndex: path.length - 1, simulationPlaying: false });
      else updateSimulation({ simulationIndex: next });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [simulationPlaying, playbackSpeed, path, updateSimulation]);

  const point = path[Math.min(simulationIndex, path.length - 1)] ?? path[0];
  const jumpLayer = (delta: number) => {
    const targetLayer = Math.max(1, point.layer + delta);
    const index = path.findIndex((item) => item.layer >= targetLayer);
    updateSimulation({ simulationIndex: index < 0 ? path.length - 1 : index, simulationPlaying: false });
  };

  return <div className="simulation-panel">
    <div className="sim-buttons">
      <button aria-label="Reset simulation" onClick={() => updateSimulation({ simulationIndex: 0, simulationPlaying: false })}><RotateCcw size={15} /></button>
      <button aria-label="Previous layer" onClick={() => jumpLayer(-1)}><SkipBack size={15} /></button>
      <button className="play" aria-label={simulationPlaying ? "Pause" : "Play"} onClick={() => updateSimulation({ simulationPlaying: !simulationPlaying })}>{simulationPlaying ? <Pause size={17} /> : <Play size={17} />}</button>
      <button aria-label="Next layer" onClick={() => jumpLayer(1)}><SkipForward size={15} /></button>
      <select aria-label="Playback speed" value={playbackSpeed} onChange={(event) => updateSimulation({ playbackSpeed: Number(event.target.value) })}>
        {[.25,.5,1,2,5,10].map((speed) => <option key={speed} value={speed}>{speed}×</option>)}
      </select>
    </div>
    <input className="timeline" type="range" min={0} max={path.length - 1} value={simulationIndex} onChange={(event) => updateSimulation({ simulationIndex: Number(event.target.value), simulationPlaying: false })} />
    <div className="sim-readout">
      <span>Line <input type="number" step={1} min={7} max={path.length + 6} value={point.gcodeLine} onChange={(event) => updateSimulation({ simulationIndex: Math.max(0, Math.min(path.length - 1, Math.round(Number(event.target.value)) - 7)), simulationPlaying: false })} /></span>
      <span>Layer <b>{point.layer}</b></span><span>Z <b>{point.z.toFixed(1)} mm</b></span><span>Time <b>{formatTime(point.elapsedTime)}</b></span>
    </div>
  </div>;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
