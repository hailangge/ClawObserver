import { Billboard, Html, Text } from "@react-three/drei";
import { useMemo } from "react";
import type { AgentVisualState } from "../agentVisualState";
import { STATUS_VISUALS } from "../config/visualMapping";
import { capVisibleTaskBlocks } from "../lib/sceneState";
import { OfficeAssetModel } from "./OfficeAssetModel";

export const DESK_LABEL_ORIENTATION_MODE = "camera-facing-yaw";
export const DESK_LABEL_LAYER_MODE = "elevated-forward-billboard";
export const DESK_LABEL_PLATE_MODE = "opaque-high-contrast";
export const DESK_STRUCTURE_VISUAL_MODE = "opaque";
export const DESK_LABEL_WIDTH = 2.54;
export const DESK_LABEL_HEIGHT = 1.02;
export const DESK_LABEL_ELEVATION = 2.34;
export const DESK_LABEL_FORWARD_OFFSET = 1.42;
const DESK_LABEL_FONT_PATH = "/assets/prototype/office-assets/fonts/NimbusSans-Regular.otf";
const DESK_LABEL_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .:-";

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
        position={[0, 0.56, 0.04]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[4.7, 3.35, 5.52]}
        appearance={{ tint: color, tintStrength: dimmed ? 0.18 : 0.14 }}
        userData={{ sceneRole: "desk-model", assetBacked: true, structuralOpacity: DESK_STRUCTURE_VISUAL_MODE }}
        fallback={
          <>
            <mesh position={[0, 0.72, 0.06]}>
              <boxGeometry args={[3.58, 0.24, 2.3]} />
              <meshStandardMaterial color={color} roughness={0.66} metalness={0.05} />
            </mesh>
            <mesh position={[0, 0.58, 0.02]}>
              <boxGeometry args={[3.02, 0.14, 1.3]} />
              <meshStandardMaterial color={dimmed ? "#75818a" : "#eff0ea"} roughness={0.76} />
            </mesh>
            {[-1.34, 1.34].flatMap((x) => [-0.84, 0.84].map((z) => ({ x, z }))).map(({ x, z }) => (
              <mesh key={`${x}-${z}`} position={[x, 0.31, z]}>
                <boxGeometry args={[0.16, 0.7, 0.16]} />
                <meshStandardMaterial color="#9eacb8" roughness={0.62} metalness={0.14} />
              </mesh>
            ))}
          </>
        }
      />
      <mesh position={[0, 0.9, 0.88]}>
        <boxGeometry args={[2.64, 0.085, 0.22]} />
        <meshStandardMaterial color={dimmed ? "#90989f" : "#f1e6d5"} roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.92, -0.88]}>
        <boxGeometry args={[2.5, 0.08, 0.22]} />
        <meshStandardMaterial color={dimmed ? "#74818c" : "#f0cf8e"} roughness={0.58} />
      </mesh>
      {[-1.28, 1.28].map((x) => (
        <mesh key={`edge-bump-${x}`} position={[x, 0.82, 0.1]}>
          <capsuleGeometry args={[0.12, 1.55, 6, 10]} />
          <meshStandardMaterial color={dimmed ? "#7c8892" : "#d7bf9d"} roughness={0.7} />
        </mesh>
      ))}
      {[-0.92, 0.92].map((x) => (
        <mesh key={`caster-${x}`} position={[x, 0.1, 1.1]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.09, 0.04, 8, 14]} />
          <meshStandardMaterial color="#56606b" roughness={0.7} metalness={0.12} />
        </mesh>
      ))}
      <mesh position={[0, 0.97, 0.08]}>
        <boxGeometry args={[1.12, 0.09, 1.72]} />
        <meshStandardMaterial color={dimmed ? "#e0d6c6" : "#fff7ea"} roughness={0.92} />
      </mesh>
    </group>
  );
}

function Chair({ color, dimmed }: { color: string; dimmed: boolean }) {
  return (
    <group position={[0, 0.44, 1.38]}>
      <OfficeAssetModel
        assetKey="chairDesk"
        rotation={[0, Math.PI / 2, 0]}
        scale={[3.46, 2.22, 3.18]}
        appearance={{ tint: color, tintStrength: dimmed ? 0.16 : 0.12 }}
        userData={{ sceneRole: "chair-model", assetBacked: true, structuralOpacity: DESK_STRUCTURE_VISUAL_MODE }}
        fallback={
          <>
            <mesh>
              <boxGeometry args={[1.18, 0.18, 1.02]} />
              <meshStandardMaterial color={color} roughness={0.76} />
            </mesh>
            <mesh position={[0, 0.58, -0.34]}>
              <boxGeometry args={[1.08, 1.02, 0.18]} />
              <meshStandardMaterial color={color} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.22, 0]}>
              <cylinderGeometry args={[0.11, 0.13, 0.46, 14]} />
              <meshStandardMaterial color="#74818f" roughness={0.64} metalness={0.16} />
            </mesh>
            <mesh position={[0, -0.47, 0]}>
              <boxGeometry args={[1.14, 0.1, 0.24]} />
              <meshStandardMaterial color="#7f90a3" roughness={0.72} />
            </mesh>
          </>
        }
      />
      <mesh position={[0, 0.16, -0.02]}>
        <boxGeometry args={[1.14, 0.18, 0.92]} />
        <meshStandardMaterial color={dimmed ? "#7d8891" : "#f1c96e"} roughness={0.66} />
      </mesh>
      <mesh position={[0, 0.72, -0.34]}>
        <boxGeometry args={[1.14, 0.68, 0.24]} />
        <meshStandardMaterial color={dimmed ? "#6c7680" : "#efb062"} roughness={0.68} />
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
    <group position={[0, 1.22, -0.22]}>
      <OfficeAssetModel
        assetKey="computerScreen"
        position={[0, -0.42, 0]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[3.08, 3.42, 1.34]}
        appearance={{ tint: color, tintStrength: 0.12, opacity: dimmed ? 0.38 : 1 }}
        userData={{ sceneRole: "monitor-model", assetBacked: true }}
        fallback={
          <>
            <mesh>
              <boxGeometry args={[1.42, 0.92, 0.1]} />
              <meshStandardMaterial
                color={color}
                emissive={emissive}
                emissiveIntensity={intensity + 0.08}
                roughness={0.24}
                metalness={0.22}
                transparent
                opacity={dimmed ? 0.34 : 1}
              />
            </mesh>
            <mesh position={[0, -0.56, 0]}>
              <boxGeometry args={[0.12, 0.44, 0.08]} />
              <meshStandardMaterial color="#596474" roughness={0.7} metalness={0.3} />
            </mesh>
            <mesh position={[0, -0.8, 0.02]}>
              <boxGeometry args={[0.56, 0.08, 0.24]} />
              <meshStandardMaterial color="#6a7788" roughness={0.7} />
            </mesh>
          </>
        }
      />
      <OfficeAssetModel
        assetKey="computerKeyboard"
        position={[0.1, -0.95, 0.38]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[2.54, 1.52, 1.76]}
        appearance={{ tint: dimmed ? "#b4aca0" : "#e2d9c7", tintStrength: 0.28, opacity: dimmed ? 0.66 : 1 }}
        userData={{ sceneRole: "keyboard-model", assetBacked: true }}
        fallback={
          <mesh position={[0, -0.88, 0.4]}>
            <boxGeometry args={[0.88, 0.05, 0.3]} />
            <meshStandardMaterial color={dimmed ? "#afa79a" : "#ddd6c7"} roughness={0.86} />
          </mesh>
        }
      />
      <OfficeAssetModel
        assetKey="computerMouse"
        position={[0.78, -0.94, 0.42]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[2.32, 1.64, 1.84]}
        appearance={{ tint: dimmed ? "#cbc3b5" : "#f0ece7", tintStrength: 0.18, opacity: dimmed ? 0.62 : 1 }}
        userData={{ sceneRole: "mouse-model", assetBacked: true }}
        fallback={
          <mesh position={[0.74, -0.9, 0.42]}>
            <capsuleGeometry args={[0.1, 0.08, 4, 8]} />
            <meshStandardMaterial color={dimmed ? "#c7bfae" : "#f0ece7"} roughness={0.86} />
          </mesh>
        }
      />
      <mesh position={[0, 0, 0.055]}>
        <planeGeometry args={[1.32, 0.8]} />
        <meshStandardMaterial
          color={dimmed ? "#1d2430" : "#e3f1ff"}
          emissive={emissive}
          emissiveIntensity={dimmed ? 0 : intensity * 0.38}
          transparent
          opacity={dimmed ? 0.14 : 0.42}
        />
      </mesh>
      <mesh position={[-0.44, -0.18, 0.056]}>
        <planeGeometry args={[0.24, 0.07]} />
        <meshStandardMaterial color="#f4c977" emissive="#f4c977" emissiveIntensity={dimmed ? 0 : 0.08} transparent opacity={0.42} />
      </mesh>
      <mesh position={[0.3, -0.24, 0.056]}>
        <planeGeometry args={[0.36, 0.04]} />
        <meshStandardMaterial color="#78d4d3" emissive="#78d4d3" emissiveIntensity={dimmed ? 0 : 0.06} transparent opacity={0.3} />
      </mesh>
      <mesh position={[0, -0.44, -0.02]}>
        <boxGeometry args={[1.62, 0.12, 0.16]} />
        <meshStandardMaterial color={dimmed ? "#8a949e" : "#f4d792"} roughness={0.56} />
      </mesh>
    </group>
  );
}

function StatusLamp({ color, active }: { color: string; active: boolean }) {
  return (
    <group position={[1.18, 1.08, -0.42]}>
      <mesh>
        <cylinderGeometry args={[0.12, 0.14, 0.26, 18]} />
        <meshStandardMaterial color="#d3dde5" roughness={0.44} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <sphereGeometry args={[0.19, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.18 : 0.24} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color="#f8e7c3" roughness={0.7} />
      </mesh>
    </group>
  );
}

function TaskStack({ count }: { count: number }) {
  const visibleCount = capVisibleTaskBlocks(count);
  const blocks = useMemo(() => Array.from({ length: visibleCount }, (_, index) => index), [visibleCount]);

  return (
    <group position={[-1.18, 0.9, -0.12]}>
      {blocks.map((block) => (
        <mesh key={block} position={[0, block * 0.08, 0]}>
          <boxGeometry args={[0.48, 0.08, 0.56]} />
          <meshStandardMaterial color={block % 2 === 0 ? "#f3f0e7" : "#dbe7f5"} roughness={0.86} />
        </mesh>
      ))}
      {visibleCount > 0 ? (
        <OfficeAssetModel
          assetKey="books"
          position={[0.16, visibleCount * 0.03, 0.16]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[1.16, 0.82, 1.12]}
          appearance={{ tint: "#f6d788", tintStrength: 0.16 }}
          userData={{ sceneRole: "books-model", assetBacked: true }}
          fallback={
            <mesh position={[0.14, visibleCount * 0.036, 0.12]}>
              <boxGeometry args={[0.18, 0.03, 0.2]} />
              <meshStandardMaterial color="#f6d788" roughness={0.8} />
            </mesh>
          }
        />
      ) : null}
      {visibleCount > 0 ? (
        <mesh position={[-0.14, visibleCount * 0.08 + 0.05, 0.08]} rotation={[0, 0.2, 0]}>
          <capsuleGeometry args={[0.08, 0.26, 4, 8]} />
          <meshStandardMaterial color="#ef8f69" roughness={0.72} />
        </mesh>
      ) : null}
    </group>
  );
}

function AgentLabel({ text, selected, subtitle }: { text: string; selected: boolean; subtitle: string }) {
  return (
    <Billboard
      position={[0, DESK_LABEL_ELEVATION, DESK_LABEL_FORWARD_OFFSET]}
      follow
      lockX
      lockZ
      userData={{
        sceneRole: "desk-label",
        orientationMode: DESK_LABEL_ORIENTATION_MODE,
        labelLayer: DESK_LABEL_LAYER_MODE,
        labelPlate: DESK_LABEL_PLATE_MODE,
      }}
    >
      <mesh position={[0, -0.01, -0.04]} renderOrder={40}>
        <planeGeometry args={[DESK_LABEL_WIDTH, DESK_LABEL_HEIGHT]} />
        <meshBasicMaterial
          color={selected ? "#091523" : "#07111c"}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, -0.01, -0.03]} renderOrder={41}>
        <planeGeometry args={[2.3, 0.82]} />
        <meshBasicMaterial
          color={selected ? "#16324c" : "#0d2438"}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <Text
        position={[0, 0.16, 0.02]}
        font={DESK_LABEL_FONT_PATH}
        fontSize={0.21}
        characters={DESK_LABEL_CHARACTERS}
        color={selected ? "#f9fcff" : "#eef6ff"}
        outlineColor="#040b12"
        outlineWidth={0.018}
        anchorX="center"
        anchorY="middle"
        maxWidth={2.06}
        textAlign="center"
        renderOrder={42}
        material-depthTest={false}
        material-depthWrite={false}
        material-toneMapped={false}
      >
        {text}
      </Text>
      <Text
        position={[0, -0.2, 0.02]}
        font={DESK_LABEL_FONT_PATH}
        fontSize={0.112}
        characters={DESK_LABEL_CHARACTERS}
        color={selected ? "#c9d9ea" : "#b7c9da"}
        outlineColor="#040b12"
        outlineWidth={0.012}
        anchorX="center"
        anchorY="middle"
        maxWidth={2.04}
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
  const deskSubtitle = agent ? `${agent.status} - ${Math.max(agent.taskCount, 0)} tasks` : "toy office slot";

  return (
    <group
      position={position}
      scale={[hoverScale, hoverScale, hoverScale]}
      userData={{ sceneRole: "desk", deskLabel: label, agentId: agent?.id ?? null }}
      onPointerOver={() => onHover(agent?.id ?? null)}
      onPointerOut={() => onHover(null)}
      onClick={() => onSelect(agent?.id ?? null)}
    >
      <group rotation={[0, facing, 0]}>
        <DeskModel color={visual.deskColor} dimmed={visual.dimmed} />
        <Chair color={visual.deskColor} dimmed={visual.dimmed} />
        <Monitor
          color={visual.monitorColor}
          emissive={visual.monitorEmissive}
          intensity={visual.monitorIntensity}
          dimmed={visual.dimmed}
        />
        <StatusLamp color={visual.lampColor} active={!visual.dimmed} />
        <TaskStack count={agent?.taskCount ?? 0} />
        {!agent ? (
          <group position={[0, 1.02, 0.18]}>
            <mesh>
              <boxGeometry args={[1.18, 0.12, 0.64]} />
              <meshStandardMaterial color="#d6b28d" roughness={0.88} />
            </mesh>
            <mesh position={[0.02, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
              <capsuleGeometry args={[0.12, 0.42, 4, 8]} />
              <meshStandardMaterial color="#f3df93" roughness={0.72} />
            </mesh>
          </group>
        ) : (
          <mesh position={[1.02, 0.98, 0.38]} rotation={[0, 0.45, 0]}>
            <capsuleGeometry args={[0.08, 0.22, 4, 8]} />
            <meshStandardMaterial color={selected ? "#ffd788" : "#f2b06b"} roughness={0.64} />
          </mesh>
        )}
      </group>
      <AgentLabel text={deskName} selected={selected} subtitle={deskSubtitle} />
      {(hovered || selected) && (
        <Html position={[0, DESK_LABEL_ELEVATION + 0.06, 0.2]} center distanceFactor={12}>
          <div className="desk-hover-card" data-hover-card data-agent-name={agent?.name ?? ""}>
            <strong>{deskName}</strong>
            <span>{deskSubtitle}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
