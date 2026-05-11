import { Html, Text } from "@react-three/drei";
import { useMemo } from "react";
import type { AgentVisualState } from "../agentVisualState";
import { STATUS_VISUALS } from "../config/visualMapping";
import { capVisibleTaskBlocks } from "../lib/sceneState";

type AgentDeskProps = {
  position: [number, number, number];
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
      <mesh position={[0, 0.58, 0.06]}>
        <boxGeometry args={[2.85, 0.16, 1.76]} />
        <meshStandardMaterial color={color} roughness={0.7} metalness={0.06} transparent opacity={dimmed ? 0.62 : 1} />
      </mesh>
      <mesh position={[0, 0.48, 0]}>
        <boxGeometry args={[2.3, 0.08, 1.02]} />
        <meshStandardMaterial color="#6f7d87" roughness={0.84} transparent opacity={dimmed ? 0.45 : 0.9} />
      </mesh>
      {[-1.08, 1.08].flatMap((x) => [-0.62, 0.62].map((z) => ({ x, z }))).map(({ x, z }) => (
        <mesh key={`${x}-${z}`} position={[x, 0.26, z]}>
          <boxGeometry args={[0.11, 0.54, 0.11]} />
          <meshStandardMaterial color="#748597" roughness={0.68} metalness={0.14} />
        </mesh>
      ))}
      <mesh position={[0, 0.7, 0.62]}>
        <boxGeometry args={[2.2, 0.04, 0.14]} />
        <meshStandardMaterial color="#d8dcda" roughness={0.72} transparent opacity={dimmed ? 0.28 : 0.82} />
      </mesh>
      <mesh position={[-1.02, 0.74, -0.45]}>
        <boxGeometry args={[0.52, 0.04, 0.34]} />
        <meshStandardMaterial color="#d1c3a9" roughness={0.88} transparent opacity={dimmed ? 0.34 : 0.82} />
      </mesh>
      <mesh position={[0.88, 0.74, -0.48]}>
        <cylinderGeometry args={[0.11, 0.11, 0.18, 18]} />
        <meshStandardMaterial color="#f0ece7" roughness={0.86} transparent opacity={dimmed ? 0.32 : 0.92} />
      </mesh>
    </group>
  );
}

function Chair({ color, dimmed }: { color: string; dimmed: boolean }) {
  return (
    <group position={[0, 0.35, 1.12]}>
      <mesh>
        <boxGeometry args={[0.92, 0.12, 0.78]} />
        <meshStandardMaterial color={color} roughness={0.82} transparent opacity={dimmed ? 0.5 : 0.9} />
      </mesh>
      <mesh position={[0, 0.42, -0.28]}>
        <boxGeometry args={[0.9, 0.76, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.84} transparent opacity={dimmed ? 0.5 : 0.92} />
      </mesh>
      <mesh position={[0, -0.18, 0]}>
        <cylinderGeometry args={[0.07, 0.08, 0.36, 14]} />
        <meshStandardMaterial color="#6d7988" roughness={0.68} metalness={0.18} />
      </mesh>
      <mesh position={[0, -0.38, 0]}>
        <boxGeometry args={[0.9, 0.06, 0.18]} />
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
    <group position={[0, 1.06, -0.2]}>
      <mesh>
        <boxGeometry args={[1.12, 0.72, 0.08]} />
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
      <mesh position={[0, -0.44, 0]}>
        <boxGeometry args={[0.1, 0.36, 0.08]} />
        <meshStandardMaterial color="#596474" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0, -0.63, 0.02]}>
        <boxGeometry args={[0.46, 0.06, 0.2]} />
        <meshStandardMaterial color="#6a7788" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[0.95, 0.54]} />
        <meshStandardMaterial
          color={dimmed ? "#1d2430" : "#e3f1ff"}
          emissive={emissive}
          emissiveIntensity={dimmed ? 0 : intensity * 0.38}
          transparent
          opacity={dimmed ? 0.14 : 0.42}
        />
      </mesh>
      <mesh position={[-0.36, -0.14, 0.046]}>
        <planeGeometry args={[0.18, 0.05]} />
        <meshStandardMaterial color="#f4c977" emissive="#f4c977" emissiveIntensity={dimmed ? 0 : 0.08} transparent opacity={0.42} />
      </mesh>
      <mesh position={[0.24, -0.19, 0.046]}>
        <planeGeometry args={[0.28, 0.03]} />
        <meshStandardMaterial color="#78d4d3" emissive="#78d4d3" emissiveIntensity={dimmed ? 0 : 0.06} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function StatusLamp({ color, active }: { color: string; active: boolean }) {
  return (
    <group position={[1.08, 0.93, 0.58]}>
      <mesh>
        <cylinderGeometry args={[0.08, 0.08, 0.18, 18]} />
        <meshStandardMaterial color="#b6c0cb" roughness={0.48} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <sphereGeometry args={[0.12, 18, 18]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 1.1 : 0.24} />
      </mesh>
    </group>
  );
}

function TaskStack({ count }: { count: number }) {
  const visibleCount = capVisibleTaskBlocks(count);
  const blocks = useMemo(() => Array.from({ length: visibleCount }, (_, index) => index), [visibleCount]);

  return (
    <group position={[-1.02, 0.79, 0.26]}>
      {blocks.map((block) => (
        <mesh key={block} position={[0, block * 0.065, 0]}>
          <boxGeometry args={[0.34, 0.05, 0.44]} />
          <meshStandardMaterial color="#e8ecf1" roughness={0.88} />
        </mesh>
      ))}
      {visibleCount > 0 ? (
        <mesh position={[0.11, visibleCount * 0.03, 0.11]}>
          <boxGeometry args={[0.15, 0.02, 0.16]} />
          <meshStandardMaterial color="#f6d788" roughness={0.82} />
        </mesh>
      ) : null}
    </group>
  );
}

function AgentLabel({ text, selected, subtitle }: { text: string; selected: boolean; subtitle: string }) {
  return (
    <group position={[0, 1.42, 0.88]}>
      <Text
        fontSize={0.17}
        color={selected ? "#f7fbff" : "#d7e6f2"}
        outlineColor="#08131d"
        outlineWidth={0.016}
        anchorX="center"
        anchorY="middle"
      >
        {text}
      </Text>
      <Text
        position={[0, -0.18, 0]}
        fontSize={0.095}
        color="#96adc0"
        outlineColor="#08131d"
        outlineWidth={0.012}
        anchorX="center"
        anchorY="middle"
      >
        {subtitle}
      </Text>
    </group>
  );
}

export function AgentDesk({
  position,
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
      <AgentLabel text={deskName} selected={selected} subtitle={deskSubtitle} />
      {!agent ? (
        <mesh position={[0, 0.86, 0.12]}>
          <boxGeometry args={[0.92, 0.08, 0.46]} />
          <meshStandardMaterial color="#a28e75" roughness={0.9} transparent opacity={0.28} />
        </mesh>
      ) : null}
      {(hovered || selected) && (
        <Html position={[0, 1.68, 0.06]} center distanceFactor={14}>
          <div className="desk-hover-card" data-hover-card data-agent-name={agent?.name ?? ""}>
            <strong>{deskName}</strong>
            <span>{deskSubtitle}</span>
          </div>
        </Html>
      )}
    </group>
  );
}
