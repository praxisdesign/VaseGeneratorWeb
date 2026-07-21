import { Download, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { VASE_PRESETS } from "@/lib/presets";
import { downloadGcode, generateGcode } from "@/lib/gcode";
import { analyzeToolpath, generateToolpath } from "@/lib/toolpath";
import type { PatternType, PreviewMode } from "@/lib/types";
import { useGeneratorStore } from "@/store/generatorStore";
import { MaskEditor } from "./MaskEditor";
import { ProfileEditor } from "./ProfileEditor";
import { SimulationControls } from "./SimulationControls";
import { VasePreview } from "./VasePreview";

const PATTERNS: { value: PatternType; label: string }[] = [
  { value: "none", label: "None" }, { value: "verticalRibs", label: "Vertical Ribs" },
  { value: "horizontalBands", label: "Horizontal Bands" }, { value: "diamond", label: "Diamond" },
  { value: "spiral", label: "Spiral" }, { value: "cellular", label: "Cellular" }, { value: "noise", label: "Noise" },
];

export function VaseStudio() {
  const { presetId, points, mask, settings, selectPreset, updateSettings, updateSimulation } = useGeneratorStore();
  const path = useMemo(() => generateToolpath(points, settings, mask), [points, settings, mask]);
  const report = useMemo(() => analyzeToolpath(path, settings.maximumOffset), [path, settings.maximumOffset]);
  const scaledHeight = Math.round(settings.height * settings.overallScale);
  const scaledDiameter = Math.round(settings.maxDiameter * settings.overallScale);

  const goToRisk = () => updateSimulation({ simulationIndex: report.maximumRiskPoint.index, simulationPlaying: false });

  return <main className="studio">
    <header className="topbar"><div className="brand"><h1>VaseGeneratorWeb</h1><span>Concrete toolpath studio</span></div><div className={`status ${report.printable ? "" : "danger"}`}>{report.printable ? "Within offset limit" : `${report.warningCount} risky points`}</div></header>
    <div className="workspace">
      <aside className="sidebar left">
        <section className="section"><h2 className="section-title">Profile presets</h2><div className="preset-grid">{VASE_PRESETS.map((preset) => <button className={`preset ${presetId === preset.id ? "active" : ""}`} key={preset.id} onClick={() => selectPreset(preset.id)}>{preset.name}</button>)}</div></section>
        <section className="section"><h2 className="section-title">Profile + heatmap</h2><ProfileEditor /></section>
        <button className="risk-card" onClick={goToRisk}><span>Maximum overhang</span><strong>{report.maximumOffset.toFixed(1)} mm</strong><small>{report.maximumAngle.toFixed(1)}° · Z {report.maximumRiskPoint.z.toFixed(0)} mm</small></button>
        <p className="note">색상은 레이어 간 수평 이동량 기준입니다. 실제 출력 전 재료와 장비 시험으로 허용값을 보정하세요.</p>
      </aside>

      <section className="viewport" aria-label="3D vase preview">
        <div className="viewport-label"><div className="mode-tabs">{(["material","bead","heatmap"] as PreviewMode[]).map((mode) => <button className={settings.previewMode === mode ? "active" : ""} key={mode} onClick={() => updateSettings({ previewMode: mode })}>{mode}</button>)}</div></div>
        <VasePreview />
        <div className="metrics"><span className="metric">{scaledHeight} mm high</span><span className="metric">{scaledDiameter} mm max Ø</span><span className="metric">{Math.ceil(scaledHeight/settings.layerHeight)} layers</span><span className="metric">{formatTime(report.totalTime)}</span></div>
        <SimulationControls path={path} />
      </section>

      <aside className="sidebar right">
        <section className="section"><h2 className="section-title">Dimensions</h2>
          <Range label="Overall scale" value={Math.round(settings.overallScale*100)} min={25} max={200} step={5} unit="%" onChange={(v) => updateSettings({ overallScale: v/100 })} />
          <Range label="Height" value={settings.height} min={200} max={1200} step={20} unit="mm" onChange={(height) => updateSettings({ height })} />
          <Range label="Max diameter" value={settings.maxDiameter} min={140} max={800} step={10} unit="mm" onChange={(maxDiameter) => updateSettings({ maxDiameter })} />
          <Range label="Print speed" value={settings.printSpeed} min={300} max={3600} step={100} unit="mm/min" onChange={(printSpeed) => updateSettings({ printSpeed })} />
          <Range label="Max layer offset" value={settings.maximumOffset} min={2} max={15} step={.5} unit="mm" onChange={(maximumOffset) => updateSettings({ maximumOffset })} />
        </section>
        <section className="section"><h2 className="section-title">Surface pattern</h2>
          <label className="select-control">Pattern<select value={settings.patternType} onChange={(e) => updateSettings({ patternType: e.target.value as PatternType })}>{PATTERNS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
          <Range label="Amplitude" value={settings.patternAmplitude} min={0} max={12} step={1} unit="mm" onChange={(patternAmplitude) => updateSettings({ patternAmplitude })} />
          <Range label="Frequency" value={settings.patternFrequency} min={2} max={20} step={1} unit="x" onChange={(patternFrequency) => updateSettings({ patternFrequency })} />
          <Range label="Twist" value={settings.patternTwist} min={0} max={10} step={.25} unit="turns" onChange={(patternTwist) => updateSettings({ patternTwist })} />
          {settings.patternType === "noise" && <Range label="Seed" value={settings.patternSeed} min={1} max={30} step={1} unit="" onChange={(patternSeed) => updateSettings({ patternSeed })} />}
          <MaskEditor />
        </section>
        <section className="actions"><button className="primary" onClick={() => downloadGcode(generateGcode(path, settings))}><Download size={15}/> Download G-code</button><button className="secondary" onClick={() => selectPreset(presetId)}><RotateCcw size={15}/> Reset profile</button></section>
      </aside>
    </div>
  </main>;
}

function Range({ label,value,min,max,step,unit,onChange }: { label:string; value:number; min:number; max:number; step:number; unit:string; onChange:(value:number)=>void }) {
  return <label className="control"><span className="control-head"><span>{label}</span><output>{value} {unit}</output></span><input type="range" value={value} min={min} max={max} step={step} onChange={(e) => onChange(Number(e.target.value))}/></label>;
}
function formatTime(seconds:number) { const m=Math.floor(seconds/60), s=Math.floor(seconds%60); return `${m}:${String(s).padStart(2,"0")}`; }
