import { useMemo, useRef } from "react";
import { interpolateRadius } from "@/lib/geometry";
import { generateToolpath, riskColor } from "@/lib/toolpath";
import { useGeneratorStore } from "@/store/generatorStore";

const WIDTH = 250, HEIGHT = 310, PAD = 18, SAMPLES = 44;

export function ProfileEditor() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { points, mask, settings, updatePoint } = useGeneratorStore();
  const toolpath = useMemo(() => generateToolpath(points, settings, mask), [points, settings, mask]);
  const toX = (radius: number) => PAD + radius * (WIDTH - PAD * 2);
  const toY = (height: number) => HEIGHT - PAD - height * (HEIGHT - PAD * 2);
  const profileSamples = useMemo(() => Array.from({ length: SAMPLES + 1 }, (_, index) => {
    const height = index / SAMPLES;
    const start = Math.floor(height * (toolpath.length - 1));
    const window = toolpath.slice(Math.max(0, start - 24), Math.min(toolpath.length, start + 25));
    return { height, radius: interpolateRadius(points, height), risk: Math.max(...window.map((point) => point.risk)) };
  }), [points, toolpath]);
  const worst = toolpath.reduce((a, b) => b.horizontalOffset > a.horizontalOffset ? b : a, toolpath[0]);
  const worstHeight = worst.z / (settings.height * settings.overallScale);

  const move = (id: string, clientX: number, clientY: number) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const radius = Math.max(.15, Math.min(1, ((clientX - box.left) / box.width * WIDTH - PAD) / (WIDTH - PAD * 2)));
    const height = Math.max(0, Math.min(1, 1 - (((clientY - box.top) / box.height * HEIGHT) - PAD) / (HEIGHT - PAD * 2)));
    updatePoint(id, { radius, height });
  };

  return <div className="editor">
    <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Buildability heatmap profile editor">
      {Array.from({ length: 6 }, (_, i) => <line key={`h${i}`} x1={PAD} x2={WIDTH-PAD} y1={PAD+i*(HEIGHT-PAD*2)/5} y2={PAD+i*(HEIGHT-PAD*2)/5} stroke="#cfcec5" />)}
      {Array.from({ length: 6 }, (_, i) => <line key={`v${i}`} y1={PAD} y2={HEIGHT-PAD} x1={PAD+i*(WIDTH-PAD*2)/5} x2={PAD+i*(WIDTH-PAD*2)/5} stroke="#cfcec5" />)}
      <line x1={PAD} x2={PAD} y1={PAD} y2={HEIGHT-PAD} stroke="#74786c" strokeWidth="2" />
      {profileSamples.slice(1).map((sample, index) => {
        const previous = profileSamples[index];
        return <line key={index} x1={toX(previous.radius)} y1={toY(previous.height)} x2={toX(sample.radius)} y2={toY(sample.height)} stroke={riskColor(sample.risk)} strokeWidth="4" strokeLinecap="round" />;
      })}
      <circle cx={toX(interpolateRadius(points, worstHeight))} cy={toY(worstHeight)} r="10" fill="none" stroke="#d5493f" strokeWidth="2" />
      {points.map((point) => <circle key={point.id} cx={toX(point.radius)} cy={toY(point.height)} r="6" fill="#faf9f4" stroke="#242621" strokeWidth="2" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(point.id, e.clientX, e.clientY); }} onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(point.id, e.clientX, e.clientY); }} />)}
    </svg>
    <div className="heat-legend"><span>Safe</span><i /><span>Risk</span></div>
  </div>;
}
