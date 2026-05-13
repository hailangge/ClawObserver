import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { MathUtils, Vector3 } from "three";
import type { AgentVisualState, SceneSummary } from "../agentVisualState";
import { FIXED_WORKSTATION_SLOTS } from "../config/workstationSlots";
import {
  DESK_LABEL_ELEVATION,
  DESK_LABEL_FORWARD_OFFSET,
  DESK_LABEL_HEIGHT,
  DESK_AVATAR_PLACEMENT_MODE,
  DESK_AVATAR_PREVIEW_MODE,
  DESK_LABEL_HIERARCHY_MODE,
  DESK_LABEL_LAYER_MODE,
  DESK_LABEL_ORIENTATION_MODE,
  DESK_LABEL_PLATE_MODE,
  DESK_LABEL_SCALE_HIERARCHY_MODE,
  DESK_LABEL_OCCLUSION_MODE,
  DESK_INNER_WORKSTATION_ORIENTATION_MODE,
  DESK_LABEL_WIDTH,
  DESK_LABEL_X_OFFSET,
  DESK_AVATAR_VISIBLE_LAYOUT_MODE,
  DESK_AVATAR_VISIBLE_MARKER,
  DESK_MONITOR_DETAIL_MODE,
  DESK_PERIPHERAL_VISIBILITY_MODE,
  PREVIEW_AVATAR_DESK_LABELS,
  DESK_SURFACE_ASPECT_RATIO,
  DESK_STRUCTURE_VISUAL_MODE,
  DESK_WORKSTATION_PROPORTION_MODE,
} from "./AgentDesk";
import { OFFICE_ASSET_LICENSE_PATH, OFFICE_ASSET_MODEL_COUNT, OFFICE_ASSET_PROVENANCE_PATH, OFFICE_ASSET_SOURCE, OFFICE_ASSET_STRATEGY } from "../data/officeAssetCatalog";
import {
  OFFICE_AVATAR_PREVIEW_LICENSE_PATH,
  OFFICE_AVATAR_PREVIEW_MODEL_COUNT,
  OFFICE_AVATAR_PREVIEW_MODE,
  OFFICE_AVATAR_PREVIEW_PROVENANCE_PATH,
  OFFICE_AVATAR_PREVIEW_SOURCE,
} from "../data/officeAvatarCatalog";
import { DeskGrid } from "./DeskGrid";
import { GlobalStatusBoard } from "./GlobalStatusBoard";
import { AVATAR_DEMO_STAGE_COUNT, AVATAR_DEMO_STAGE_MARKER, AVATAR_DEMO_STAGE_MODE, OfficeAvatarDemoStage } from "./OfficeAvatarDemoStage";
import { STRUCTURAL_OPACITY_MODE } from "./OfficeProps";
import { FRONT_LABEL_LANE_CLEARANCE_MODE, OfficeShell, OVERHEAD_SIGHTLINE_MODE } from "./OfficeShell";

type AgentOfficeSceneProps = {
  agents: AgentVisualState[];
  summary: SceneSummary | null;
  hoveredAgentId: string | null;
  selectedAgentId: string | null;
  onHover: (agentId: string | null) => void;
  onSelect: (agentId: string | null) => void;
};

const CAMERA_TARGET = new Vector3(0, 1.02, 0.9);
const CAMERA_PITCH = MathUtils.degToRad(30);
const CAMERA_FOV = 40;
const SCENE_WIDTH = 17.5;
const SCENE_DEPTH = 14.5;
const SCENE_HEIGHT = 4.2;
export const SCENE_FRAMELOOP_MODE = "demand";
export const SCENE_PERFORMANCE_MODE = "idle-on-demand";
export const SCENE_STYLE_PROFILE = "toy-office-command-center";
export const SCENE_STYLE_REFERENCE_MODE = "quaternius-inspired-command-center-safe-emulation";
export const SCENE_WORKSTATION_ORIENTATION_MODE = "all-desks-face-camera";
export const SCENE_MONITOR_STYLE_MODE = "screen-plane-cyan-edge";
export const SCENE_LABEL_HIERARCHY_MODE = DESK_LABEL_HIERARCHY_MODE;
export const SCENE_LABEL_SCALE_HIERARCHY_CONTRACT = DESK_LABEL_SCALE_HIERARCHY_MODE;
export const SCENE_MONITOR_DETAIL_CONTRACT = DESK_MONITOR_DETAIL_MODE;
export const SCENE_WORKSTATION_PROPORTION_CONTRACT = DESK_WORKSTATION_PROPORTION_MODE;
export const SCENE_WORKSTATION_DESK_ASPECT_CONTRACT = DESK_SURFACE_ASPECT_RATIO;
export const SCENE_INNER_WORKSTATION_ORIENTATION_CONTRACT = DESK_INNER_WORKSTATION_ORIENTATION_MODE;
export const SCENE_PERIPHERAL_VISIBILITY_CONTRACT = DESK_PERIPHERAL_VISIBILITY_MODE;
export const SCENE_LABEL_OCCLUSION_CONTRACT = DESK_LABEL_OCCLUSION_MODE;
export const SCENE_AVATAR_PREVIEW_CONTRACT = DESK_AVATAR_PREVIEW_MODE;
export const SCENE_AVATAR_PLACEMENT_CONTRACT = DESK_AVATAR_PLACEMENT_MODE;
export const SCENE_AVATAR_PREVIEW_SOURCE = "poly-pizza-hyper-casual-local-preview";
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
    [x + DESK_LABEL_X_OFFSET - DESK_LABEL_WIDTH / 2, y + DESK_LABEL_ELEVATION + DESK_LABEL_HEIGHT / 2, z + DESK_LABEL_FORWARD_OFFSET],
    [x + DESK_LABEL_X_OFFSET + DESK_LABEL_WIDTH / 2, y + DESK_LABEL_ELEVATION + DESK_LABEL_HEIGHT / 2, z + DESK_LABEL_FORWARD_OFFSET],
    [x + DESK_LABEL_X_OFFSET - DESK_LABEL_WIDTH / 2, y + DESK_LABEL_ELEVATION - DESK_LABEL_HEIGHT / 2, z + DESK_LABEL_FORWARD_OFFSET],
    [x + DESK_LABEL_X_OFFSET + DESK_LABEL_WIDTH / 2, y + DESK_LABEL_ELEVATION - DESK_LABEL_HEIGHT / 2, z + DESK_LABEL_FORWARD_OFFSET],
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
  const visibleAvatarDeskLabels = PREVIEW_AVATAR_DESK_LABELS;

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
      data-scene-avatar-preview-mode={SCENE_AVATAR_PREVIEW_CONTRACT}
      data-scene-avatar-preview-source={SCENE_AVATAR_PREVIEW_SOURCE}
      data-scene-avatar-preview-provenance-source={OFFICE_AVATAR_PREVIEW_SOURCE}
      data-scene-avatar-preview-model-count={String(OFFICE_AVATAR_PREVIEW_MODEL_COUNT)}
      data-scene-avatar-preview-license-path={OFFICE_AVATAR_PREVIEW_LICENSE_PATH}
      data-scene-avatar-preview-provenance-path={OFFICE_AVATAR_PREVIEW_PROVENANCE_PATH}
      data-scene-avatar-placement={SCENE_AVATAR_PLACEMENT_CONTRACT}
      data-scene-avatar-preview-visible-marker={DESK_AVATAR_VISIBLE_MARKER}
      data-scene-avatar-preview-visible-count={String(PREVIEW_AVATAR_DESK_LABELS.length)}
      data-scene-avatar-preview-visible-desks={PREVIEW_AVATAR_DESK_LABELS.join(",")}
      data-scene-avatar-preview-visible-layout={DESK_AVATAR_VISIBLE_LAYOUT_MODE}
      data-scene-avatar-demo-stage={AVATAR_DEMO_STAGE_MARKER}
      data-scene-avatar-demo-stage-mode={AVATAR_DEMO_STAGE_MODE}
      data-scene-avatar-demo-stage-count={String(AVATAR_DEMO_STAGE_COUNT)}
      data-scene-label-orientation={DESK_LABEL_ORIENTATION_MODE}
      data-scene-label-layer={DESK_LABEL_LAYER_MODE}
      data-scene-label-plate={DESK_LABEL_PLATE_MODE}
      data-scene-desk-structure-visual={DESK_STRUCTURE_VISUAL_MODE}
      data-scene-structural-opacity={STRUCTURAL_OPACITY_MODE}
      data-scene-overhead-sightline={OVERHEAD_SIGHTLINE_MODE}
      data-scene-front-label-lane-clearance={FRONT_LABEL_LANE_CLEARANCE_MODE}
      data-scene-frameloop={SCENE_FRAMELOOP_MODE}
      data-scene-performance-mode={SCENE_PERFORMANCE_MODE}
      data-scene-style-profile={SCENE_STYLE_PROFILE}
      data-scene-style-reference={SCENE_STYLE_REFERENCE_MODE}
      data-scene-workstation-orientation={SCENE_WORKSTATION_ORIENTATION_MODE}
      data-scene-monitor-style={SCENE_MONITOR_STYLE_MODE}
      data-scene-label-hierarchy={SCENE_LABEL_HIERARCHY_MODE}
      data-scene-label-scale-hierarchy={SCENE_LABEL_SCALE_HIERARCHY_CONTRACT}
      data-scene-monitor-detail={SCENE_MONITOR_DETAIL_CONTRACT}
      data-scene-workstation-proportion={SCENE_WORKSTATION_PROPORTION_CONTRACT}
      data-scene-desk-aspect={String(SCENE_WORKSTATION_DESK_ASPECT_CONTRACT)}
      data-scene-inner-workstation-orientation={SCENE_INNER_WORKSTATION_ORIENTATION_CONTRACT}
      data-scene-peripheral-visibility={SCENE_PERIPHERAL_VISIBILITY_CONTRACT}
      data-scene-label-occlusion={SCENE_LABEL_OCCLUSION_CONTRACT}
      data-runtime-status={summary?.captureStatus ?? "waiting"}
      data-scene-fit-status="pending"
      data-scene-label-fit-status="pending"
    >
      <OfficeAvatarDemoStage />
      <div className="scene-avatar-preview-contract" aria-hidden="true">
        {visibleAvatarDeskLabels.map((deskLabel) => (
          <span
            key={deskLabel}
            data-avatar-preview-visible-node={DESK_AVATAR_VISIBLE_MARKER}
            data-avatar-preview-visible-desk={deskLabel}
            data-avatar-preview-visible-layout={DESK_AVATAR_VISIBLE_LAYOUT_MODE}
          />
        ))}
      </div>
      <Canvas
        id="main-scene-canvas"
        shadows={false}
        dpr={[1, 1.5]}
        frameloop={SCENE_FRAMELOOP_MODE}
        camera={{ position: [0, 10.5, 14.8], fov: CAMERA_FOV, near: 0.1, far: 60 }}
      >
        <color attach="background" args={["#08111c"]} />
        <fog attach="fog" args={["#08111c", 21, 38]} />
        <ResponsiveCameraRig />
        <ambientLight intensity={1.08} />
        <hemisphereLight args={["#7ed6ff", "#15314a", 1.24]} />
        <directionalLight position={[6, 13, 12]} intensity={0.94} color="#6cbcff" />
        <directionalLight position={[-12, 9, 3]} intensity={1.22} color="#7ee5ff" />
        <directionalLight position={[0, 7, -10]} intensity={0.22} color="#b86e41" />
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
