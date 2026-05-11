import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { MathUtils, Vector3 } from "three";
import type { AgentVisualState, SceneSummary } from "../agentVisualState";
import { FIXED_WORKSTATION_SLOTS } from "../config/workstationSlots";
import {
  DESK_LABEL_ELEVATION,
  DESK_LABEL_FORWARD_OFFSET,
  DESK_LABEL_HEIGHT,
  DESK_LABEL_LAYER_MODE,
  DESK_LABEL_ORIENTATION_MODE,
  DESK_LABEL_PLATE_MODE,
  DESK_LABEL_WIDTH,
  DESK_STRUCTURE_VISUAL_MODE,
} from "./AgentDesk";
import { OFFICE_ASSET_LICENSE_PATH, OFFICE_ASSET_MODEL_COUNT, OFFICE_ASSET_PROVENANCE_PATH, OFFICE_ASSET_SOURCE, OFFICE_ASSET_STRATEGY } from "../data/officeAssetCatalog";
import { DeskGrid } from "./DeskGrid";
import { GlobalStatusBoard } from "./GlobalStatusBoard";
import { STRUCTURAL_OPACITY_MODE } from "./OfficeProps";
import { OfficeShell, OVERHEAD_SIGHTLINE_MODE } from "./OfficeShell";

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
export const SCENE_FRAMELOOP_MODE = "demand";
export const SCENE_PERFORMANCE_MODE = "idle-on-demand";
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
const LABEL_SAMPLE_POINTS = FIXED_WORKSTATION_SLOTS.flatMap((slot) => {
  const [x, y, z] = slot.position;
  return [
    [x - DESK_LABEL_WIDTH / 2, y + DESK_LABEL_ELEVATION + DESK_LABEL_HEIGHT / 2, z + DESK_LABEL_FORWARD_OFFSET],
    [x + DESK_LABEL_WIDTH / 2, y + DESK_LABEL_ELEVATION + DESK_LABEL_HEIGHT / 2, z + DESK_LABEL_FORWARD_OFFSET],
    [x - DESK_LABEL_WIDTH / 2, y + DESK_LABEL_ELEVATION - DESK_LABEL_HEIGHT / 2, z + DESK_LABEL_FORWARD_OFFSET],
    [x + DESK_LABEL_WIDTH / 2, y + DESK_LABEL_ELEVATION - DESK_LABEL_HEIGHT / 2, z + DESK_LABEL_FORWARD_OFFSET],
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

function writeProjectedMargins(
  sceneRoot: HTMLDivElement,
  camera: { project?: unknown } & {
    updateMatrixWorld: () => void;
    position: { set: (x: number, y: number, z: number) => void };
    lookAt: (target: Vector3) => void;
    updateProjectionMatrix: () => void;
    fov: number;
    near: number;
    far: number;
  },
  samplePoints: readonly (readonly [number, number, number])[],
  prefix: string,
) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [x, y, z] of samplePoints) {
    FIT_SCRATCH.set(x, y, z).project(camera);
    const projectedX = (FIT_SCRATCH.x + 1) / 2;
    const projectedY = (1 - FIT_SCRATCH.y) / 2;
    minX = Math.min(minX, projectedX);
    maxX = Math.max(maxX, projectedX);
    minY = Math.min(minY, projectedY);
    maxY = Math.max(maxY, projectedY);
  }

  sceneRoot.dataset[`${prefix}FitStatus`] =
    minX >= 0 && maxX <= 1 && minY >= 0 && maxY <= 1 ? "fit" : "overflow";
  sceneRoot.dataset[`${prefix}FitLeft`] = minX.toFixed(3);
  sceneRoot.dataset[`${prefix}FitRight`] = (1 - maxX).toFixed(3);
  sceneRoot.dataset[`${prefix}FitTop`] = minY.toFixed(3);
  sceneRoot.dataset[`${prefix}FitBottom`] = (1 - maxY).toFixed(3);
  sceneRoot.dataset[`${prefix}FitPointCount`] = String(samplePoints.length);
}

function ResponsiveCameraRig() {
  const camera = useThree((state) => state.camera);
  const canvas = useThree((state) => state.gl.domElement);
  const invalidate = useThree((state) => state.invalidate);
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
    const distance = Math.max(widthDistance, heightDistance, 14.15);

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
      writeProjectedMargins(sceneRoot, camera, LABEL_SAMPLE_POINTS, "sceneLabel");
    }

    invalidate();
  }, [camera, canvas, invalidate, size.height, size.width]);

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
      data-scene-asset-strategy={OFFICE_ASSET_STRATEGY}
      data-scene-asset-source={OFFICE_ASSET_SOURCE}
      data-scene-office-asset-model-count={String(OFFICE_ASSET_MODEL_COUNT)}
      data-scene-license-path={OFFICE_ASSET_LICENSE_PATH}
      data-scene-provenance-path={OFFICE_ASSET_PROVENANCE_PATH}
      data-scene-label-orientation={DESK_LABEL_ORIENTATION_MODE}
      data-scene-label-layer={DESK_LABEL_LAYER_MODE}
      data-scene-label-plate={DESK_LABEL_PLATE_MODE}
      data-scene-desk-structure-visual={DESK_STRUCTURE_VISUAL_MODE}
      data-scene-structural-opacity={STRUCTURAL_OPACITY_MODE}
      data-scene-overhead-sightline={OVERHEAD_SIGHTLINE_MODE}
      data-scene-frameloop={SCENE_FRAMELOOP_MODE}
      data-scene-performance-mode={SCENE_PERFORMANCE_MODE}
      data-runtime-status={summary?.captureStatus ?? "waiting"}
      data-scene-fit-status="pending"
      data-scene-label-fit-status="pending"
    >
      <Canvas
        shadows={false}
        dpr={[1, 1.5]}
        frameloop={SCENE_FRAMELOOP_MODE}
        camera={{ position: [0, 10.5, 14.8], fov: CAMERA_FOV, near: 0.1, far: 60 }}
      >
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
