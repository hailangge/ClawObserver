import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { MathUtils, Vector3 } from "three";
import type { AgentVisualState, SceneSummary } from "../agentVisualState";
import { FIXED_WORKSTATION_SLOTS } from "../config/workstationSlots";
import { DESK_LABEL_ORIENTATION_MODE } from "./AgentDesk";
import { DeskGrid } from "./DeskGrid";
import { GlobalStatusBoard } from "./GlobalStatusBoard";
import { STRUCTURAL_OPACITY_MODE } from "./OfficeProps";
import { OfficeShell } from "./OfficeShell";

type AgentOfficeSceneProps = {
  agents: AgentVisualState[];
  summary: SceneSummary | null;
  hoveredAgentId: string | null;
  selectedAgentId: string | null;
  onHover: (agentId: string | null) => void;
  onSelect: (agentId: string | null) => void;
};

const CAMERA_TARGET = new Vector3(0, 0.95, 0.5);
const CAMERA_PITCH = MathUtils.degToRad(34);
const CAMERA_FOV = 40;
const SCENE_WIDTH = 17.5;
const SCENE_DEPTH = 14.5;
const SCENE_HEIGHT = 4.2;
const FIT_SCRATCH = new Vector3();
const DESK_SAMPLE_POINTS = FIXED_WORKSTATION_SLOTS.flatMap((slot) => {
  const [x, y, z] = slot.position;
  return [
    [x - 1.78, y + 0.14, z - 1.1],
    [x + 1.78, y + 0.14, z - 1.1],
    [x - 1.78, y + 2.28, z + 1.18],
    [x + 1.78, y + 2.28, z + 1.18],
  ] as const;
});

function resolveSceneRoot(canvas: HTMLCanvasElement): HTMLDivElement | null {
  return canvas.closest("[data-scene-root]");
}

function writeSceneFitMetrics(sceneRoot: HTMLDivElement, camera: { project?: unknown } & {
  updateMatrixWorld: () => void;
  position: { set: (x: number, y: number, z: number) => void };
  lookAt: (target: Vector3) => void;
  updateProjectionMatrix: () => void;
  fov: number;
  near: number;
  far: number;
}) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [x, y, z] of DESK_SAMPLE_POINTS) {
    FIT_SCRATCH.set(x, y, z).project(camera);
    const projectedX = (FIT_SCRATCH.x + 1) / 2;
    const projectedY = (1 - FIT_SCRATCH.y) / 2;
    minX = Math.min(minX, projectedX);
    maxX = Math.max(maxX, projectedX);
    minY = Math.min(minY, projectedY);
    maxY = Math.max(maxY, projectedY);
  }

  const leftMargin = minX;
  const rightMargin = 1 - maxX;
  const topMargin = minY;
  const bottomMargin = 1 - maxY;
  const fits = leftMargin >= 0 && rightMargin >= 0 && topMargin >= 0 && bottomMargin >= 0;

  sceneRoot.dataset.sceneFitStatus = fits ? "fit" : "overflow";
  sceneRoot.dataset.sceneFitLeft = leftMargin.toFixed(3);
  sceneRoot.dataset.sceneFitRight = rightMargin.toFixed(3);
  sceneRoot.dataset.sceneFitTop = topMargin.toFixed(3);
  sceneRoot.dataset.sceneFitBottom = bottomMargin.toFixed(3);
  sceneRoot.dataset.sceneFitPointCount = String(DESK_SAMPLE_POINTS.length);
}

function ResponsiveCameraRig() {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const size = useThree((state) => state.size);

  useEffect(() => {
    if (
      !camera ||
      typeof camera.updateProjectionMatrix !== "function" ||
      typeof camera.updateMatrixWorld !== "function" ||
      typeof camera.lookAt !== "function"
    ) {
      return;
    }

    const aspect = size.width / Math.max(size.height, 1);
    const verticalFov = MathUtils.degToRad(CAMERA_FOV);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    const effectiveHeight = SCENE_HEIGHT + SCENE_DEPTH * Math.sin(CAMERA_PITCH) * 0.74;
    const widthDistance = (SCENE_WIDTH * 0.62) / Math.tan(horizontalFov / 2);
    const heightDistance = (effectiveHeight * 0.58) / Math.tan(verticalFov / 2);
    const distance = Math.max(widthDistance, heightDistance, 13.9);

    camera.fov = CAMERA_FOV;
    camera.near = 0.1;
    camera.far = 60;
    camera.position.set(
      CAMERA_TARGET.x,
      CAMERA_TARGET.y + Math.sin(CAMERA_PITCH) * distance,
      CAMERA_TARGET.z + Math.cos(CAMERA_PITCH) * distance,
    );
    camera.lookAt(CAMERA_TARGET);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const sceneRoot = resolveSceneRoot(canvas);
    if (sceneRoot) {
      sceneRoot.dataset.sceneCameraDistance = distance.toFixed(3);
      sceneRoot.dataset.sceneCameraAspect = aspect.toFixed(3);
      writeSceneFitMetrics(sceneRoot, camera);
    }
  }, [camera, canvas, size.height, size.width]);

  return null;
}

export function AgentOfficeScene({
  agents,
  summary,
  hoveredAgentId,
  selectedAgentId,
  onHover,
  onSelect,
}: AgentOfficeSceneProps) {
  return (
    <div
      className="scene-canvas-shell"
      data-scene-root
      data-scene-desk-count="12"
      data-scene-has-status-board="true"
      data-scene-has-lounge="true"
      data-scene-asset-strategy="local-low-poly-seam"
      data-scene-label-orientation={DESK_LABEL_ORIENTATION_MODE}
      data-scene-structural-opacity={STRUCTURAL_OPACITY_MODE}
      data-runtime-status={summary?.captureStatus ?? "waiting"}
      data-scene-fit-status="pending"
    >
      <Canvas shadows={false} dpr={[1, 1.5]} camera={{ position: [0, 10.5, 14.8], fov: CAMERA_FOV, near: 0.1, far: 60 }}>
        <color attach="background" args={["#0f1822"]} />
        <fog attach="fog" args={["#0f1822", 22, 40]} />
        <ResponsiveCameraRig />
        <ambientLight intensity={1.18} />
        <hemisphereLight args={["#f2e4c8", "#314557", 1.28]} />
        <directionalLight position={[6, 13, 12]} intensity={1.32} color="#fff0d7" />
        <directionalLight position={[-12, 9, 3]} intensity={0.72} color="#a9d9ff" />
        <OfficeShell summary={summary} />
        <DeskGrid
          agents={agents}
          hoveredAgentId={hoveredAgentId}
          selectedAgentId={selectedAgentId}
          onHover={onHover}
          onSelect={onSelect}
        />
        <GlobalStatusBoard agents={agents} summary={summary} />
      </Canvas>
    </div>
  );
}
