import { Billboard, Html, Text } from "@react-three/drei";
import { useMemo } from "react";
import type { AgentVisualState } from "../agentVisualState";
import { STATUS_VISUALS } from "../config/visualMapping";
import { capVisibleTaskBlocks } from "../lib/sceneState";

export const DESK_LABEL_ORIENTATION_MODE = "camera-facing-yaw";

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
      <mesh position={[0, 0.68, 0.04]}>
        <boxGeometry args={[3.3, 0.18, 2.08]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.06} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[2.8, 0.1, 1.18]} />
        <meshStandardMaterial color={dimmed ? "#55616b" : "#6f7d87"} roughness={0.84} />
      </mesh>
      {[-1.22, 1.22].flatMap((x) => [-0.76, 0.76].map((z) => ({ x, z }))).map(({ x, z }) => (
        <mesh key={`${x}-${z}`} position={[x, 0.31, z]}>
          <boxGeometry args={[0.13, 0.66, 0.13]} />
          <meshStandardMaterial color="#748597" roughness={0.68} metalness={0.14} />
        </mesh>
      ))}
      <mesh position={[0, 0.82, 0.76]}>
        <boxGeometry args={[2.56, 0.05, 0.16]} />
        <meshStandardMaterial color={dimmed ? "#8d989e" : "#d8dcda"} roughness={0.72} />
      </mesh>
      <mesh position={[-1.16, 0.84, -0.54]}>
        <boxGeometry args={[0.66, 0.05, 0.42]} />
        <meshStandardMaterial color={dimmed ? "#948978" : "#d1c3a9"} roughness={0.88} />
      </mesh>
      <mesh position={[1.08, 0.84, -0.58]}>
        <cylinderGeometry args={[0.14, 0.14, 0.22, 18]} />
        <meshStandardMaterial color={dimmed ? "#b6b0ab" : "#f0ece7"} roughness={0.86} />
      </mesh>
    </group>
  );
}

function Chair({ color, dimmed }: { color: string; dimmed: boolean }) {
  return (
    <group position={[0, 0.42, 1.3]}>
      <mesh>
        <boxGeometry args={[1.08, 0.14, 0.92]} />
        <meshStandardMaterial color={color} roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.52, -0.32]}>
        <boxGeometry args={[1.04, 0.9, 0.14]} />
        <meshStandardMaterial color={color} roughness={0.84} />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <cylinderGeometry args={[0.08, 0.09, 0.42, 14]} />
        <meshStandardMaterial color="#6d7988" roughness={0.68} metalness={0.18} />
      </mesh>
      <mesh position={[0, -0.44, 0]}>
        <boxGeometry args={[1.02, 0.08, 0.2]} />
        <meshStandardMaterial color="#66778a" roughness={0.76} />
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
      <mesh position={[0, 0, 0.055]}>
        <planeGeometry args={[1.22, 0.72]} />
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
    </group>
  );
}

function StatusLamp({ color, active }: { color: string; active: boolean }) {
  return (
    <group position={[1.3, 1.08, 0.72]}>
      <mesh>
        <cylinderGeometry args={[0.1, 0.1, 0.22, 18]} />
        <meshStandardMaterial color="#b6c0cb" roughness={0.48} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <sphereGeometry args={[0.16, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.1 : 0.24} />
      </mesh>
    </group>
  );
}

function TaskStack({ count }: { count: number }) {
  const visibleCount = capVisibleTaskBlocks(count);
  const blocks = useMemo(() => Array.from({ length: visibleCount }, (_, index) => index), [visibleCount]);

  return (
    <group position={[-1.24, 0.9, 0.34]}>
      {blocks.map((block) => (
        <mesh key={block} position={[0, block * 0.08, 0]}>
          <boxGeometry args={[0.42, 0.06, 0.52]} />
          <meshStandardMaterial color="#e8ecf1" roughness={0.88} />
        </mesh>
      ))}
      {visibleCount > 0 ? (
        <mesh position={[0.14, visibleCount * 0.036, 0.12]}>
          <boxGeometry args={[0.18, 0.03, 0.2]} />
          <meshStandardMaterial color="#f6d788" roughness={0.82} />
        </mesh>
      ) : null}
    </group>
  );
}

function AgentLabel({ text, selected, subtitle }: { text: string; selected: boolean; subtitle: string }) {
  return (
    <Billboard
      position={[0, 1.76, 0.98]}
      follow
      lockX
      lockZ
      userData={{ sceneRole: "desk-label", orientationMode: DESK_LABEL_ORIENTATION_MODE }}
    >
      <Text
        fontSize={0.23}
        color={selected ? "#f7fbff" : "#d7e6f2"}
        outlineColor="#08131d"
        outlineWidth={0.022}
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
      <Text
        position={[0, -0.24, 0]}
        fontSize={0.122}
        color="#96adc0"
        outlineColor="#08131d"
        outlineWidth={0.016}
        anchorX="center"
        anchorY="middle"
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
  const deskSubtitle = agent ? `${agent.status} · ${Math.max(agent.taskCount, 0)} tasks` : "empty slot";

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
          <mesh position={[0, 0.98, 0.16]}>
            <boxGeometry args={[1.08, 0.1, 0.56]} />
            <meshStandardMaterial color="#a28e75" roughness={0.9} />
          </mesh>
        ) : null}
      </group>
      <AgentLabel text={deskName} selected={selected} subtitle={deskSubtitle} />
      {(hovered || selected) && (
        <Html position={[0, 2.04, 0.06]} center distanceFactor={12}>
          <div className="desk-hover-card" data-hover-card data-agent-name={agent?.name ?? ""}>
            <strong>{deskName}</strong>
            <span>{deskSubtitle}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
