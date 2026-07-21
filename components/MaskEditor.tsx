import { useRef } from "react";
import { useGeneratorStore } from "@/store/generatorStore";

const W = 260, H = 120, P = 12;

export function MaskEditor() {
  const ref = useRef<SVGSVGElement>(null);
  const { mask, updateMaskPoint } = useGeneratorStore();
  const x = (height: number) => P + height * (W - P * 2);
  const y = (strength: number) => H - P - strength * (H - P * 2);
  const ordered = [...mask].sort((a, b) => a.height - b.height);
  const path = ordered.map((point, index) => `${index ? "L" : "M"} ${x(point.height)} ${y(point.strength)}`).join(" ");

  const move = (id: string, clientX: number, clientY: number) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const strength = Math.max(0, Math.min(1, 1 - (((clientY - box.top) / box.height * H) - P) / (H - P * 2)));
    updateMaskPoint(id, { strength });
  };

  return <div className="mask-editor">
    <div className="mask-labels"><span>Bottom</span><span>Pattern strength</span><span>Top</span></div>
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} aria-label="Pattern height mask editor">
      <defs><linearGradient id="maskFill" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#d9663d" stopOpacity="0"/><stop offset="1" stopColor="#d9663d" stopOpacity=".28"/></linearGradient></defs>
      <path d={`${path} L ${x(1)} ${H-P} L ${x(0)} ${H-P} Z`} fill="url(#maskFill)" />
      <path d={path} fill="none" stroke="#d9663d" strokeWidth="2.5" />
      {ordered.map((point) => <circle key={point.id} cx={x(point.height)} cy={y(point.strength)} r="6" fill="#faf9f4" stroke="#242621" strokeWidth="2" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); move(point.id, event.clientX, event.clientY); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) move(point.id, event.clientX, event.clientY); }} />)}
    </svg>
  </div>;
}
