import { Billboard, Html, Text } from "@react-three/drei";
import { useMemo } from "react";
import { DoubleSide } from "three";
import type { AgentVisualState } from "../agentVisualState";
import { STATUS_VISUALS } from "../config/visualMapping";
import { capVisibleTaskBlocks } from "../lib/sceneState";
import { OfficeAssetModel } from "./OfficeAssetModel";
import { OFFICE_AVATAR_MODELS, type OfficeAvatarKey } from "../data/officeAvatarCatalog";
import { OfficeAvatarModel } from "./OfficeAvatarModel";

export const DESK_LABEL_ORIENTATION_MODE = "camera-facing-yaw";
export const DESK_LABEL_LAYER_MODE = "elevated-forward-billboard";
export const DESK_LABEL_PLATE_MODE = "opaque-high-contrast";
export const DESK_STRUCTURE_VISUAL_MODE = "opaque";
export const DESK_LABEL_HIERARCHY_MODE = "small-monitor-top-metadata-tag";
export const DESK_LABEL_SCALE_HIERARCHY_MODE = "small-secondary-corner-badge";
export const DESK_MONITOR_DETAIL_MODE = "integrated-screen-keyboard-mouse";
export const DESK_WORKSTATION_PROPORTION_MODE = "wide-front-facing-workstation";
export const DESK_INNER_WORKSTATION_ORIENTATION_MODE = "camera-facing-inner-workstation-group";
export const DESK_PERIPHERAL_VISIBILITY_MODE = "keyboard-mouse-readable";
export const DESK_LABEL_OCCLUSION_MODE = "monitor-corner-badge-clear";
export const DESK_SURFACE_WIDTH = 3.36;
export const DESK_SURFACE_DEPTH = 1.12;
export const DESK_SURFACE_ASPECT_RATIO = Number((DESK_SURFACE_WIDTH / DESK_SURFACE_DEPTH).toFixed(2));
export const DESK_LABEL_WIDTH = 1.02;
export const DESK_LABEL_HEIGHT = 0.28;
export const DESK_LABEL_ELEVATION = 2.1;
export const DESK_LABEL_FORWARD_OFFSET = 0.08;
export const DESK_LABEL_X_OFFSET = 0.06;
const DESK_LABEL_FONT_PATH = "/assets/prototype/office-assets/fonts/NimbusSans-Regular.otf";
const DESK_LABEL_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .:-";
export const DESK_AVATAR_PREVIEW_MODE = "preview-hyper-casual-cc-by-avatar";
export const DESK_AVATAR_PLACEMENT_MODE = "seated-behind-desk-facing-monitor";
export const DESK_AVATAR_VISIBLE_MARKER = "visible-avatar-preview-v1";
export const DESK_AVATAR_VISIBLE_LAYOUT_MODE = "seated-desk-cluster-closeup";
export const DESK_CHAIR_POSITION: [number, number, number] = [0.18, 0.4, -0.74];
export const DESK_MONITOR_POSITION: [number, number, number] = [-0.12, 1.08, -0.2];
export const DESK_MONITOR_GROUP_ROTATION_Y = Math.PI;
export const DESK_MONITOR_MODEL_ROTATION_Y = 0;

export const PREVIEW_AVATAR_DESK_LABELS = ["Desk 5", "Desk 6", "Desk 7", "Desk 8"] as const;

const PREVIEW_AVATAR_BY_DESK_LABEL: Partial<Record<string, OfficeAvatarKey>> = {
  "Desk 5": "hyper-casual-amber",
  "Desk 6": "hyper-casual-cyan",
  "Desk 7": "hyper-casual-green",
  "Desk 8": "hyper-casual-orange",
};

type PreviewAvatarTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  accentColor: string;
  rimColor: string;
  lightOffset: [number, number, number];
  rimLightOffset: [number, number, number];
};

const PREVIEW_AVATAR_TRANSFORMS: Record<(typeof PREVIEW_AVATAR_DESK_LABELS)[number], PreviewAvatarTransform> = {
  "Desk 5": {
    position: [1.48, 0.08, 1.82],
    rotation: [0, Math.PI / 2 - 0.18, 0],
    scale: [1.34, 1.34, 1.34],
    accentColor: "#8fe6ff",
    rimColor: "#ffd6a1",
    lightOffset: [0.32, 1.7, 1.7],
    rimLightOffset: [-0.88, 1.28, 0.28],
  },
  "Desk 6": {
    position: [0.58, 0.08, 1.62],
    rotation: [0, Math.PI / 2 - 0.08, 0],
    scale: [1.2, 1.2, 1.2],
    accentColor: "#9beeff",
    rimColor: "#ffe3b4",
    lightOffset: [0.18, 1.66, 1.62],
    rimLightOffset: [-0.62, 1.24, 0.18],
  },
  "Desk 7": {
    position: [-0.58, 0.08, 1.62],
    rotation: [0, -Math.PI / 2 + 0.08, 0],
    scale: [1.2, 1.2, 1.2],
    accentColor: "#a6fff0",
    rimColor: "#ffd8a8",
    lightOffset: [-0.18, 1.66, 1.62],
    rimLightOffset: [0.62, 1.24, 0.18],
  },
  "Desk 8": {
    position: [-1.48, 0.08, 1.82],
    rotation: [0, -Math.PI / 2 + 0.18, 0],
    scale: [1.34, 1.34, 1.34],
    accentColor: "#ffd6b4",
    rimColor: "#fff1cf",
    lightOffset: [-0.32, 1.7, 1.7],
    rimLightOffset: [0.88, 1.28, 0.28],
  },
};

type AgentDeskProps = {
  position: [number, number, number];
  facing: number;
  label: string;
  agent: AgentVisualState | null;
  hovered: boolean;
  selected: boolean;
  onHover: (agentId: string | null) => void;
  onSelect: (agentId: string | null) => void;
};

function DeskModel({ color, dimmed }: { color: string; dimmed: boolean }) {
  return (
    <group>
      <OfficeAssetModel
        assetKey="desk"
        position={[-0.68, 0.24, -0.12]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[1.24, 1.18, 0.82]}
        appearance={{ tint: dimmed ? "#42505d" : "#23394c", tintStrength: dimmed ? 0.94 : 0.92 }}
        userData={{ sceneRole: "desk-model", assetBacked: true, structuralOpacity: DESK_STRUCTURE_VISUAL_MODE }}
        fallback={
          <>
            <mesh position={[-0.7, 0.34, -0.12]}>
              <boxGeometry args={[0.62, 0.68, 0.58]} />
              <meshStandardMaterial color={dimmed ? "#3b4956" : "#213546"} roughness={0.7} metalness={0.06} />
            </mesh>
            <mesh position={[0.48, 0.34, -0.06]}>
              <boxGeometry args={[1.22, 0.52, 0.24]} />
              <meshStandardMaterial color={dimmed ? "#455260" : "#1a2c3d"} roughness={0.8} />
            </mesh>
            {[-1.2, 1.2].flatMap((x) => [-0.18, 0.18].map((z) => ({ x, z }))).map(({ x, z }) => (
              <mesh key={`${x}-${z}`} position={[x, 0.31, z]}>
                <boxGeometry args={[0.12, 0.62, 0.12]} />
                <meshStandardMaterial color="#7c91a7" roughness={0.62} metalness={0.14} />
              </mesh>
            ))}
          </>
        }
      />
      <mesh position={[0, 0.84, 0.14]}>
        <boxGeometry args={[3.58, 0.18, 1.02]} />
        <meshStandardMaterial color={dimmed ? "#2f3b47" : "#15293c"} roughness={0.6} metalness={0.14} />
      </mesh>
      <mesh position={[0, 0.95, 0.14]}>
        <boxGeometry args={[3.34, 0.04, 0.86]} />
        <meshStandardMaterial color={dimmed ? "#425366" : "#4679a7"} roughness={0.42} metalness={0.26} />
      </mesh>
      <mesh position={[0, 0.7, 0.58]}>
        <boxGeometry args={[3.32, 0.44, 0.12]} />
        <meshStandardMaterial color={dimmed ? "#283340" : "#112537"} roughness={0.66} metalness={0.08} />
      </mesh>
      <mesh position={[0, 1.01, 0.52]}>
        <boxGeometry args={[2.94, 0.03, 0.04]} />
        <meshStandardMaterial color={dimmed ? "#556575" : "#88f1ff"} emissive={dimmed ? "#000000" : "#57dcff"} emissiveIntensity={dimmed ? 0 : 0.24} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.67, -0.2]}>
        <boxGeometry args={[2.22, 0.08, 0.16]} />
        <meshStandardMaterial color={dimmed ? "#394552" : "#2c4761"} roughness={0.58} metalness={0.14} />
      </mesh>
      <mesh position={[-1.18, 0.5, 0.08]}>
        <boxGeometry args={[0.58, 0.78, 0.64]} />
        <meshStandardMaterial color={dimmed ? "#36424f" : "#20374a"} roughness={0.74} />
      </mesh>
      <mesh position={[1.2, 0.42, 0.06]}>
        <boxGeometry args={[0.14, 0.72, 0.56]} />
        <meshStandardMaterial color={dimmed ? "#667585" : "#7e9ab5"} roughness={0.54} metalness={0.2} />
      </mesh>
      <mesh position={[0.94, 0.17, 0.06]}>
        <boxGeometry args={[0.5, 0.08, 0.42]} />
        <meshStandardMaterial color={dimmed ? "#4f5c69" : "#6d87a2"} roughness={0.6} metalness={0.14} />
      </mesh>
      {[-1.44, 1.44].flatMap((x) => [-0.32, 0.32].map((z) => ({ x, z }))).map(({ x, z }) => (
        <mesh key={`desk-foot-${x}-${z}`} position={[x, 0.11, z + 0.08]}>
          <cylinderGeometry args={[0.06, 0.06, 0.18, 10]} />
          <meshStandardMaterial color={dimmed ? "#697581" : "#7590ab"} roughness={0.54} metalness={0.18} />
        </mesh>
      ))}
      <mesh position={[-0.06, 0.86, -0.14]}>
        <boxGeometry args={[1.08, 0.08, 0.18]} />
        <meshStandardMaterial color={dimmed ? "#4c5865" : "#4f6c8a"} roughness={0.68} />
      </mesh>
    </group>
  );
}

function Chair({ color, dimmed }: { color: string; dimmed: boolean }) {
  return (
    <group position={DESK_CHAIR_POSITION}>
      <OfficeAssetModel
        assetKey="chairDesk"
        rotation={[0, Math.PI, 0]}
        scale={[1.92, 1.54, 1.74]}
        appearance={{ tint: dimmed ? "#415260" : "#355b7e", tintStrength: dimmed ? 0.92 : 0.96 }}
        userData={{ sceneRole: "chair-model", assetBacked: true, structuralOpacity: DESK_STRUCTURE_VISUAL_MODE }}
        fallback={
          <>
            <mesh>
              <boxGeometry args={[1.02, 0.14, 0.88]} />
              <meshStandardMaterial color={color} roughness={0.76} />
            </mesh>
            <mesh position={[0, 0.58, -0.26]}>
              <boxGeometry args={[0.96, 0.92, 0.16]} />
              <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.2, 0]}>
              <cylinderGeometry args={[0.09, 0.11, 0.42, 14]} />
              <meshStandardMaterial color="#74818f" roughness={0.64} metalness={0.16} />
            </mesh>
            <mesh position={[0, -0.44, 0]}>
              <boxGeometry args={[1.02, 0.08, 0.22]} />
              <meshStandardMaterial color="#7f90a3" roughness={0.72} />
            </mesh>
          </>
        }
      />
      <mesh position={[0, 0.12, 0.04]}>
        <boxGeometry args={[0.92, 0.14, 0.76]} />
        <meshStandardMaterial color={dimmed ? "#4d5964" : "#365d83"} roughness={0.66} />
      </mesh>
      <mesh position={[0, 0.62, -0.2]}>
        <boxGeometry args={[0.96, 0.56, 0.18]} />
        <meshStandardMaterial color={dimmed ? "#43505c" : "#203f5c"} roughness={0.68} />
      </mesh>
      {[
        [0.44, -0.42, 0.36],
        [-0.44, -0.42, 0.36],
        [0.44, -0.42, -0.36],
        [-0.44, -0.42, -0.36],
      ].map(([x, y, z], index) => (
        <mesh key={`chair-wheel-${index}`} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.07, 0.025, 8, 12]} />
          <meshStandardMaterial color="#435161" roughness={0.72} metalness={0.12} />
        </mesh>
      ))}
      <mesh position={[0, -0.38, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.24, 12]} />
        <meshStandardMaterial color="#6d8092" roughness={0.58} metalness={0.18} />
      </mesh>
    </group>
  );
}

function Monitor({
  color,
  emissive,
  intensity,
  dimmed,
}: {
  color: string;
  emissive: string;
  intensity: number;
  dimmed: boolean;
}) {
  return (
    <group
      position={DESK_MONITOR_POSITION}
      rotation={[0, DESK_MONITOR_GROUP_ROTATION_Y, 0]}
      userData={{ sceneRole: "monitor-detail", monitorDetailMode: DESK_MONITOR_DETAIL_MODE }}
    >
      <OfficeAssetModel
        assetKey="computerScreen"
        position={[0, 0.06, -0.08]}
        rotation={[0, DESK_MONITOR_MODEL_ROTATION_Y, 0]}
        scale={[1.64, 1.82, 0.92]}
        appearance={{ tint: color, tintStrength: 0.36, opacity: dimmed ? 0.76 : 1 }}
        userData={{ sceneRole: "monitor-model", assetBacked: true }}
        fallback={
          <>
            <mesh position={[0, 0.48, 0]}>
              <boxGeometry args={[1.28, 0.84, 0.08]} />
              <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={intensity + 0.16} roughness={0.28} metalness={0.24} />
            </mesh>
            <mesh position={[0, 0.08, -0.02]}>
              <boxGeometry args={[0.1, 0.42, 0.1]} />
              <meshStandardMaterial color="#5b6e84" roughness={0.7} metalness={0.3} />
            </mesh>
            <mesh position={[0, -0.16, 0.08]}>
              <boxGeometry args={[0.56, 0.05, 0.3]} />
              <meshStandardMaterial color="#6a7f96" roughness={0.7} />
            </mesh>
          </>
        }
      />
      <mesh position={[0, 0.5, -0.01]}>
        <boxGeometry args={[1.5, 0.96, 0.14]} />
        <meshStandardMaterial color={dimmed ? "#33404d" : "#213447"} roughness={0.26} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.5, 0.07]}>
        <planeGeometry args={[1.26, 0.76]} />
        <meshStandardMaterial
          color={dimmed ? "#57b8d2" : "#7ff0ff"}
          emissive={dimmed ? "#2a6d86" : emissive}
          emissiveIntensity={dimmed ? 0.18 : intensity * 1.18}
          transparent
          opacity={dimmed ? 0.42 : 0.96}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.5, 0.078]}>
        <planeGeometry args={[1.38, 0.86]} />
        <meshStandardMaterial
          color={dimmed ? "#3b738f" : "#9bf3ff"}
          emissive={dimmed ? "#17485d" : "#62deff"}
          emissiveIntensity={dimmed ? 0.08 : intensity * 0.5}
          transparent
          opacity={dimmed ? 0.12 : 0.22}
          side={DoubleSide}
        />
      </mesh>
      <OfficeAssetModel
        assetKey="computerKeyboard"
        position={[0, -0.06, 0.48]}
        rotation={[0, Math.PI, 0]}
        scale={[1.7, 1.08, 1.16]}
        appearance={{ tint: dimmed ? "#7f93a5" : "#9ab4ca", tintStrength: 0.32, opacity: dimmed ? 0.94 : 1 }}
        userData={{ sceneRole: "keyboard-model", assetBacked: true }}
        fallback={
          <mesh position={[0, 0.01, 0.48]}>
            <boxGeometry args={[1.16, 0.05, 0.34]} />
            <meshStandardMaterial color={dimmed ? "#7f93a5" : "#9bb4c8"} roughness={0.82} />
          </mesh>
        }
      />
      <OfficeAssetModel
        assetKey="computerMouse"
        position={[0.86, -0.02, 0.46]}
        rotation={[0, Math.PI, 0]}
        scale={[1.48, 1.1, 1.18]}
        appearance={{ tint: dimmed ? "#8a9baa" : "#adc0d0", tintStrength: 0.28, opacity: dimmed ? 0.94 : 1 }}
        userData={{ sceneRole: "mouse-model", assetBacked: true }}
        fallback={
          <mesh position={[0.86, 0.02, 0.46]}>
            <capsuleGeometry args={[0.09, 0.08, 4, 8]} />
            <meshStandardMaterial color={dimmed ? "#8a9baa" : "#adc0d0"} roughness={0.86} />
          </mesh>
        }
      />
      {[
        [0, 0.98, 0.062, 1.44, 0.04],
        [0, 0.02, 0.062, 1.44, 0.04],
        [-0.72, 0.5, 0.062, 0.04, 0.84],
        [0.72, 0.5, 0.062, 0.04, 0.84],
      ].map(([x, y, z, width, height], index) => (
        <mesh key={`monitor-edge-${index}`} position={[x, y, z]}>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial
            color={dimmed ? "#223142" : "#8ff0ff"}
            emissive={dimmed ? "#000000" : "#5fe2ff"}
            emissiveIntensity={dimmed ? 0 : intensity * 0.74}
            transparent
            opacity={dimmed ? 0.12 : 0.82}
            side={DoubleSide}
          />
        </mesh>
      ))}
      <mesh position={[-0.34, 0.34, 0.08]}>
        <planeGeometry args={[0.34, 0.09]} />
        <meshStandardMaterial color="#7ef0ff" emissive="#7ef0ff" emissiveIntensity={dimmed ? 0 : 0.26} transparent opacity={0.68} side={DoubleSide} />
      </mesh>
      <mesh position={[0.18, 0.22, 0.08]}>
        <planeGeometry args={[0.42, 0.05]} />
        <meshStandardMaterial color="#52c6ff" emissive="#52c6ff" emissiveIntensity={dimmed ? 0 : 0.18} transparent opacity={0.6} side={DoubleSide} />
      </mesh>
      <mesh position={[0, -0.02, 0.5]}>
        <boxGeometry args={[1.24, 0.04, 0.42]} />
        <meshStandardMaterial color={dimmed ? "#516070" : "#44637f"} roughness={0.54} metalness={0.08} />
      </mesh>
      <mesh position={[0.86, -0.01, 0.48]}>
        <boxGeometry args={[0.34, 0.01, 0.42]} />
        <meshStandardMaterial color={dimmed ? "#2d3945" : "#213749"} roughness={0.78} />
      </mesh>
      <mesh position={[0, -0.2, -0.2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.34, 12]} />
        <meshStandardMaterial color={dimmed ? "#374656" : "#5c7591"} roughness={0.58} metalness={0.26} />
      </mesh>
      <mesh position={[0, -0.38, -0.12]}>
        <boxGeometry args={[0.52, 0.03, 0.26]} />
        <meshStandardMaterial color={dimmed ? "#506171" : "#748aa0"} roughness={0.58} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.5, 0.1]}>
        <planeGeometry args={[1.1, 0.64]} />
        <meshStandardMaterial
          color={dimmed ? "#36556b" : "#5fb2d8"}
          emissive={dimmed ? "#0f1c26" : "#2f7ca0"}
          emissiveIntensity={dimmed ? 0.04 : 0.1}
          transparent
          opacity={dimmed ? 0.08 : 0.12}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

function StatusLamp({ color, active }: { color: string; active: boolean }) {
  return (
    <group position={[1.28, 1.08, 0.16]}>
      <mesh>
        <cylinderGeometry args={[0.09, 0.11, 0.2, 18]} />
        <meshStandardMaterial color="#b7cadb" roughness={0.44} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <sphereGeometry args={[0.15, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.18 : 0.24} />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#7c91a7" roughness={0.7} />
      </mesh>
    </group>
  );
}

function TaskStack({ count }: { count: number }) {
  const visibleCount = capVisibleTaskBlocks(count);
  const blocks = useMemo(() => Array.from({ length: visibleCount }, (_, index) => index), [visibleCount]);

  return (
    <group position={[-1.18, 1.01, 0.08]}>
      {blocks.map((block) => (
        <mesh key={block} position={[0, block * 0.07, 0]}>
          <boxGeometry args={[0.42, 0.07, 0.42]} />
          <meshStandardMaterial color={block % 2 === 0 ? "#d7e7f8" : "#8cb4da"} roughness={0.86} />
        </mesh>
      ))}
      {visibleCount > 0 ? (
        <OfficeAssetModel
          assetKey="books"
          position={[0.14, visibleCount * 0.03, 0.1]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[1.02, 0.72, 0.98]}
          appearance={{ tint: "#6cb6ff", tintStrength: 0.16 }}
          userData={{ sceneRole: "books-model", assetBacked: true }}
          fallback={
            <mesh position={[0.14, visibleCount * 0.036, 0.08]}>
              <boxGeometry args={[0.18, 0.03, 0.2]} />
              <meshStandardMaterial color="#6cb6ff" roughness={0.8} />
            </mesh>
          }
        />
      ) : null}
      {visibleCount > 0 ? (
        <mesh position={[-0.12, visibleCount * 0.07 + 0.05, 0.06]} rotation={[0, 0.2, 0]}>
          <capsuleGeometry args={[0.06, 0.22, 4, 8]} />
          <meshStandardMaterial color="#c78351" roughness={0.72} />
        </mesh>
      ) : null}
    </group>
  );
}

function PreviewDeskAvatar({
  avatarKey,
  deskLabel,
  dimmed,
  selected,
}: {
  avatarKey: OfficeAvatarKey;
  deskLabel: string;
  dimmed: boolean;
  selected: boolean;
}) {
  const avatarDefinition = OFFICE_AVATAR_MODELS[avatarKey];
  const transform = PREVIEW_AVATAR_TRANSFORMS[deskLabel as keyof typeof PREVIEW_AVATAR_TRANSFORMS];
  const tint = dimmed ? "#b7c4d0" : selected ? "#ffffff" : avatarDefinition.tint;
  const tintStrength = dimmed ? 0.48 : 0.12;
  const opacity = dimmed ? 0.9 : 1;
  const emissive = dimmed ? "#4d6275" : transform?.accentColor ?? "#9beeff";
  const emissiveIntensity = dimmed ? 0.08 : selected ? 0.3 : 0.24;
  const transformPosition = transform?.position ?? [0.08, 0.12, 0.88];
  const transformRotation = transform?.rotation ?? [0, Math.PI, 0];
  const transformScale = transform?.scale ?? [0.74, 0.74, 0.74];
  const lightOffset = transform?.lightOffset ?? [0, 1.44, 1.26];
  const rimLightOffset = transform?.rimLightOffset ?? [0.52, 1.14, -0.62];
  const accentColor = transform?.accentColor ?? "#9beeff";
  const rimColor = transform?.rimColor ?? "#ffe0af";

  return (
    <group
      position={transformPosition}
      rotation={transformRotation}
      userData={{
        sceneRole: "desk-avatar-preview",
        avatarPreviewMode: DESK_AVATAR_PREVIEW_MODE,
        avatarPlacementMode: DESK_AVATAR_PLACEMENT_MODE,
        avatarPreviewSourceType: "glb-hyper-casual-character",
        retainedAvatarProvenance: "poly-pizza-hyper-casual-character-cc-by-3.0",
        avatarPreviewVisibleMarker: DESK_AVATAR_VISIBLE_MARKER,
        avatarPreviewVisibleLayoutMode: DESK_AVATAR_VISIBLE_LAYOUT_MODE,
        previewAvatarKey: avatarKey,
        deskLabel,
      }}
    >
      <pointLight
        position={lightOffset}
        color={accentColor}
        intensity={dimmed ? 0.18 : 1.34}
        distance={5.4}
        decay={1.7}
      />
      <pointLight
        position={rimLightOffset}
        color={rimColor}
        intensity={dimmed ? 0.08 : 0.72}
        distance={4.2}
        decay={1.8}
      />
      <mesh position={[0, 0.03, 0.08]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={8}>
        <circleGeometry args={[0.44, 24]} />
        <meshBasicMaterial color={accentColor} transparent opacity={dimmed ? 0.06 : 0.14} depthWrite={false} toneMapped={false} />
      </mesh>
      <OfficeAvatarModel
        avatarKey={avatarKey}
        position={[0, 0, 0]}
        rotation={[0, 0, 0]}
        scale={transformScale}
        appearance={{
          tint,
          tintStrength,
          opacity,
          emissive,
          emissiveIntensity,
          roughness: 0.8,
          metalness: 0.02,
          colorBoost: dimmed ? 1 : selected ? 1.18 : 1.14,
        }}
        userData={{
          sceneRole: "desk-avatar-preview-model",
          avatarPreviewMode: DESK_AVATAR_PREVIEW_MODE,
          avatarPreviewVisibleNode: DESK_AVATAR_VISIBLE_MARKER,
          avatarPreviewVisibleDesk: deskLabel,
        }}
      />
    </group>
  );
}

function AgentLabel({ text, selected, subtitle }: { text: string; selected: boolean; subtitle: string }) {
  return (
    <Billboard
      position={[DESK_LABEL_X_OFFSET, DESK_LABEL_ELEVATION, DESK_LABEL_FORWARD_OFFSET]}
      follow
      lockX
      lockZ
      userData={{
        sceneRole: "desk-label",
        orientationMode: DESK_LABEL_ORIENTATION_MODE,
        labelLayer: DESK_LABEL_LAYER_MODE,
        labelPlate: DESK_LABEL_PLATE_MODE,
        labelHierarchyMode: DESK_LABEL_HIERARCHY_MODE,
        labelScaleHierarchy: DESK_LABEL_SCALE_HIERARCHY_MODE,
      }}
    >
      <mesh position={[0, -0.005, -0.04]} renderOrder={40}>
        <planeGeometry args={[DESK_LABEL_WIDTH, DESK_LABEL_HEIGHT]} />
        <meshBasicMaterial color={selected ? "#091523" : "#07111c"} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.045, -0.03]} renderOrder={41}>
        <planeGeometry args={[0.84, 0.042]} />
        <meshBasicMaterial color={selected ? "#49d5ff" : "#1e607f"} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <Text
        position={[0, 0.022, 0.02]}
        font={DESK_LABEL_FONT_PATH}
        fontSize={0.094}
        characters={DESK_LABEL_CHARACTERS}
        color={selected ? "#f9fcff" : "#eef6ff"}
        outlineColor="#040b12"
        outlineWidth={0.01}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.86}
        textAlign="center"
        renderOrder={42}
        material-depthTest={false}
        material-depthWrite={false}
        material-toneMapped={false}
      >
        {text}
      </Text>
      <Text
        position={[0, -0.052, 0.02]}
        font={DESK_LABEL_FONT_PATH}
        fontSize={0.056}
        characters={DESK_LABEL_CHARACTERS}
        color={selected ? "#c9d9ea" : "#b7c9da"}
        outlineColor="#040b12"
        outlineWidth={0.008}
        anchorX="center"
        anchorY="middle"
        maxWidth={0.88}
        textAlign="center"
        renderOrder={42}
        material-depthTest={false}
        material-depthWrite={false}
        material-toneMapped={false}
      >
        {subtitle}
      </Text>
    </Billboard>
  );
}

export function AgentDesk({
  position,
  facing,
  label,
  agent,
  hovered,
  selected,
  onHover,
  onSelect,
}: AgentDeskProps) {
  const visual = STATUS_VISUALS[agent?.status ?? "offline"];
  const hoverScale = hovered || selected ? 1.03 : 1;
  const deskName = agent?.name ?? label;
  const deskSubtitle = agent ? `${agent.status} - ${Math.max(agent.taskCount, 0)} tasks` : "desk slot";
  const previewAvatarKey = PREVIEW_AVATAR_BY_DESK_LABEL[label];

  return (
    <group
      position={position}
      scale={[hoverScale, hoverScale, hoverScale]}
      userData={{
        sceneRole: "desk",
        deskLabel: label,
        agentId: agent?.id ?? null,
        workstationProportionMode: DESK_WORKSTATION_PROPORTION_MODE,
        deskAspectRatio: DESK_SURFACE_ASPECT_RATIO,
        labelScaleHierarchy: DESK_LABEL_SCALE_HIERARCHY_MODE,
      }}
      onPointerOver={() => onHover(agent?.id ?? null)}
      onPointerOut={() => onHover(null)}
      onClick={() => onSelect(agent?.id ?? null)}
    >
      <group
        rotation={[0, facing, 0]}
        userData={{
          sceneRole: "inner-workstation",
          innerWorkstationOrientationMode: DESK_INNER_WORKSTATION_ORIENTATION_MODE,
          peripheralVisibilityMode: DESK_PERIPHERAL_VISIBILITY_MODE,
          labelOcclusionMode: DESK_LABEL_OCCLUSION_MODE,
        }}
      >
        <DeskModel color={visual.deskColor} dimmed={visual.dimmed} />
        <Chair color={visual.deskColor} dimmed={visual.dimmed} />
        <Monitor color={visual.monitorColor} emissive={visual.monitorEmissive} intensity={visual.monitorIntensity} dimmed={visual.dimmed} />
        <StatusLamp color={visual.lampColor} active={!visual.dimmed} />
        <TaskStack count={agent?.taskCount ?? 0} />
        {previewAvatarKey ? (
          <PreviewDeskAvatar avatarKey={previewAvatarKey} deskLabel={label} dimmed={visual.dimmed} selected={selected} />
        ) : null}
        {!agent ? (
          <group position={[1.04, 1, 0.18]}>
            <mesh>
              <boxGeometry args={[0.76, 0.08, 0.34]} />
              <meshStandardMaterial color="#284667" roughness={0.84} />
            </mesh>
            <mesh position={[0.02, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.08, 0.26, 4, 8]} />
              <meshStandardMaterial color="#6ed9ff" roughness={0.72} />
            </mesh>
          </group>
        ) : (
          <mesh position={[1.06, 1, 0.18]} rotation={[0, 0.28, 0]}>
            <capsuleGeometry args={[0.06, 0.16, 4, 8]} />
            <meshStandardMaterial color={selected ? "#f3a35f" : "#996140"} roughness={0.64} />
          </mesh>
        )}
      </group>
      <AgentLabel text={deskName} selected={selected} subtitle={deskSubtitle} />
      {(hovered || selected) && (
        <Html position={[0, DESK_LABEL_ELEVATION + 0.14, 0.02]} center distanceFactor={12}>
          <div className="desk-hover-card" data-hover-card data-agent-name={agent?.name ?? ""}>
            <strong>{deskName}</strong>
            <span>{deskSubtitle}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
