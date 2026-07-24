import { Canvas, useThree } from "@react-three/fiber";
import { Grid, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { createLathePoints } from "@/lib/geometry";
import { applyPattern } from "@/lib/patterns";
import { generateToolpath, riskColor } from "@/lib/toolpath";
import { useGeneratorStore } from "@/store/generatorStore";
import type { CameraSnapshot, ToolpathPoint } from "@/lib/types";

// Guards against ever saving or restoring a broken camera snapshot -- e.g. one
// captured mid-glitch while the Canvas/OrbitControls default-camera registration is
// still settling right after mount (position and target collapsed to the same
// point, or a NaN/Infinity). Restoring a snapshot like this would reproduce a
// "camera won't move" state on every future visit.
function isValidCameraSnapshot(camera: CameraSnapshot | null): camera is CameraSnapshot {
  if (!camera) return false;
  const values = [...camera.position, ...camera.target];
  if (values.length !== 6 || values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    return false;
  }
  const [px, py, pz] = camera.position;
  const [tx, ty, tz] = camera.target;
  return Math.hypot(px - tx, py - ty, pz - tz) > 1e-4;
}

function CameraController() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera, invalidate } = useThree();
  const storedCamera = useGeneratorStore((state) => state.camera);
  const setCamera = useGeneratorStore((state) => state.setCamera);
  const hasAppliedRef = useRef(false);

  useEffect(() => {
    if (hasAppliedRef.current || !isValidCameraSnapshot(storedCamera)) {
      return undefined;
    }
    hasAppliedRef.current = true;

    const applyRestoredCamera = () => {
      camera.position.set(...storedCamera.position);
      camera.updateProjectionMatrix();
      controlsRef.current?.target.set(...storedCamera.target);
      controlsRef.current?.update();
      invalidate();
    };

    // Re-assert for a short window: right after the Canvas first mounts, the
    // default-camera/OrbitControls registration can still be settling, which
    // silently overwrites a same-tick set() a moment later and can even leave
    // OrbitControls unresponsive to further drag/orbit input.
    let cancelled = false;
    let frame = 0;
    const reapply = () => {
      if (cancelled) return;
      applyRestoredCamera();
      frame += 1;
      if (frame < 20) requestAnimationFrame(reapply);
    };
    reapply();
    return () => {
      cancelled = true;
    };
  }, [camera, invalidate, storedCamera]);

  function handleCameraChangeEnd() {
    const controls = controlsRef.current;
    if (!controls) return;
    const candidate: CameraSnapshot = {
      position: controls.object.position.toArray() as [number, number, number],
      target: controls.target.toArray() as [number, number, number],
    };
    if (isValidCameraSnapshot(candidate)) setCamera(candidate);
  }

  return (
    <OrbitControls ref={controlsRef} makeDefault target={[0, 300, 0]} minDistance={500} maxDistance={2500} onEnd={handleCameraChangeEnd} />
  );
}

export function VasePreview() {
  return <Canvas camera={{ position: [900, 560, 1100], fov: 42, near: 1, far: 5000 }} shadows gl={{ preserveDrawingBuffer: true }}>
    <color attach="background" args={["#edf2f7"]} />
    <ambientLight intensity={1.4} />
    <directionalLight position={[300, 500, 300]} intensity={2.8} castShadow />
    <VaseGeometry />
    <Grid args={[1600, 1600]} cellSize={35} cellColor="#d5deea" sectionSize={175} sectionColor="#b8c5d6" fadeDistance={1300} />
    <CameraController />
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
