import { Canvas } from "@react-three/fiber";
import { Grid, Line, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { createLathePoints } from "@/lib/geometry";
import { applyPattern } from "@/lib/patterns";
import { generateToolpath, riskColor } from "@/lib/toolpath";
import { useGeneratorStore } from "@/store/generatorStore";
import type { ToolpathPoint } from "@/lib/types";

export function VasePreview() {
  return <Canvas camera={{ position: [900, 560, 1100], fov: 42, near: 1, far: 5000 }} shadows>
    <color attach="background" args={["#edf2f7"]} />
    <ambientLight intensity={1.4} />
    <directionalLight position={[300, 500, 300]} intensity={2.8} castShadow />
    <VaseGeometry />
    <Grid args={[1600, 1600]} cellSize={35} cellColor="#d5deea" sectionSize={175} sectionColor="#b8c5d6" fadeDistance={1300} />
    <OrbitControls makeDefault target={[0, 300, 0]} minDistance={500} maxDistance={2500} />
  </Canvas>;
}

function VaseGeometry() {
  const { points, mask, settings, simulationIndex } = useGeneratorStore();
  const path = useMemo(() => generateToolpath(points, settings, mask), [points, settings, mask]);
  return <>
    {settings.previewMode === "material" && <MaterialVase />}
    {settings.previewMode === "bead" && <BeadPath path={path} heatmap={false} />}
    {settings.previewMode === "heatmap" && <BeadPath path={path} heatmap />}
    <SimulationOverlay path={path} index={Math.min(simulationIndex, path.length - 1)} />
  </>;
}

function MaterialVase() {
  const { points, mask, settings } = useGeneratorStore();
  const geometry = useMemo(() => {
    const scaledHeight = settings.height * settings.overallScale;
    const result = new THREE.LatheGeometry(createLathePoints(points, settings), settings.radialSegments);
    const position = result.attributes.position;
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index), y = position.getY(index), z = position.getZ(index);
      const angle = Math.atan2(z, x), radius = Math.hypot(x, z);
      const next = applyPattern(radius, angle, y / scaledHeight, settings, mask);
      position.setXYZ(index, Math.cos(angle) * next, y, Math.sin(angle) * next);
    }
    result.computeVertexNormals();
    return result;
  }, [points, mask, settings]);
  return <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color="#9aa8b8" roughness={.74} side={THREE.DoubleSide} /></mesh>;
}

function BeadPath({ path, heatmap }: { path: ToolpathPoint[]; heatmap: boolean }) {
  const nozzle = useGeneratorStore((state) => state.settings.nozzleDiameter);
  const geometry = useMemo(() => {
    const centers = path.map((p) => new THREE.Vector3(p.x, p.z, p.y));
    const curve = new THREE.CatmullRomCurve3(centers, false, "centripetal");
    const radial = 12;
    const tube = new THREE.TubeGeometry(curve, path.length - 1, nozzle * .5, radial, false);
    if (heatmap) {
      const colors = new Float32Array(tube.attributes.position.count * 3);
      const color = new THREE.Color();
      for (let vertex = 0; vertex < tube.attributes.position.count; vertex += 1) {
        const ring = Math.min(path.length - 1, Math.floor(vertex / (radial + 1)));
        color.set(riskColor(path[ring].risk));
        colors[vertex * 3] = color.r; colors[vertex * 3 + 1] = color.g; colors[vertex * 3 + 2] = color.b;
      }
      tube.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
    return tube;
  }, [path, nozzle, heatmap]);
  const start = path[0];
  const end = path[path.length - 1];
  const beadColor = "#8191a5";
  return <>
    <mesh geometry={geometry} castShadow receiveShadow renderOrder={1}><meshStandardMaterial color={heatmap ? "white" : beadColor} vertexColors={heatmap} roughness={.82} /></mesh>
    <mesh position={[start.x, start.z, start.y]} castShadow receiveShadow>
      <sphereGeometry args={[nozzle * .5, 20, 14]} />
      <meshStandardMaterial color={heatmap ? riskColor(start.risk) : beadColor} roughness={.82} />
    </mesh>
    <mesh position={[end.x, end.z, end.y]} castShadow receiveShadow>
      <sphereGeometry args={[nozzle * .5, 20, 14]} />
      <meshStandardMaterial color={heatmap ? riskColor(end.risk) : beadColor} roughness={.82} />
    </mesh>
  </>;
}

function SimulationOverlay({ path, index }: { path: ToolpathPoint[]; index: number }) {
  const current = path[index];
  const printed = path.slice(0, index + 1).map((p) => [p.x, p.z, p.y] as [number, number, number]);
  const remaining = path.slice(index).map((p) => [p.x, p.z, p.y] as [number, number, number]);
  return <>
    {printed.length > 1 && <Line points={printed} color="#fff2be" lineWidth={5} depthTest={false} renderOrder={10} />}
    {remaining.length > 1 && <Line points={remaining} color="#5e625b" transparent opacity={.28} lineWidth={1.5} depthTest={false} renderOrder={9} />}
    <group position={[current.x, current.z, current.y]} renderOrder={20}>
      <mesh><sphereGeometry args={[28, 24, 24]} /><meshBasicMaterial color="#ff5a1f" depthTest={false} toneMapped={false} /></mesh>
      <mesh position={[0, 42, 0]}><coneGeometry args={[18, 52, 20]} /><meshBasicMaterial color="#fff0a6" depthTest={false} toneMapped={false} /></mesh>
      <pointLight color="#ff6a00" intensity={35} distance={130} />
    </group>
  </>;
}
