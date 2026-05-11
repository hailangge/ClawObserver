import { Html } from "@react-three/drei";
import type { AgentVisualState, SceneSummary } from "../agentVisualState";

type GlobalStatusBoardProps = {
  agents: AgentVisualState[];
  summary: SceneSummary | null;
};

export function GlobalStatusBoard({ agents, summary }: GlobalStatusBoardProps) {
  const counts = agents.reduce(
    (accumulator, agent) => {
      accumulator[agent.status] += 1;
      return accumulator;
    },
    { idle: 0, busy: 0, error: 0, offline: 0 },
  );

  return (
    <group position={[0, 2.08, -6.96]} userData={{ sceneRole: "status-board" }}>
      <mesh>
        <boxGeometry args={[5.3, 1.24, 0.12]} />
        <meshStandardMaterial color="#14202e" metalness={0.24} roughness={0.68} />
      </mesh>
      <mesh position={[0, 0, 0.075]}>
        <planeGeometry args={[4.86, 0.92]} />
        <meshStandardMaterial color="#0c1722" emissive="#10273b" emissiveIntensity={0.24} roughness={0.4} />
      </mesh>
      <Html transform distanceFactor={11}>
        <div
          className="status-board"
          data-status-board
          data-runtime-status={summary?.captureStatus ?? "waiting"}
          data-busy-count={counts.busy}
          data-idle-count={counts.idle}
          data-error-count={counts.error}
          data-offline-count={counts.offline}
        >
          <strong>Global status</strong>
          <span>busy {counts.busy}</span>
          <span>idle {counts.idle}</span>
          <span>error {counts.error}</span>
          <span>offline {counts.offline}</span>
          <span>queue {summary?.queueDepth ?? 0}</span>
        </div>
      </Html>
    </group>
  );
}
