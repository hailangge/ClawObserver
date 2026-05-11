import type { SceneSummary } from "../agentVisualState";
import { OfficeProps } from "./OfficeProps";

const loungeSeatPositions = [-3.65, -1.2, 1.2, 3.65];
export const OVERHEAD_SIGHTLINE_MODE = "clear-back-row";
export const FRONT_LABEL_LANE_CLEARANCE_MODE = "open-center";

type OfficeShellProps = {
  summary: SceneSummary | null;
};

export function OfficeShell({ summary }: OfficeShellProps) {
  const runtimeStatus = summary?.captureStatus ?? "waiting";
  const loungeLampColor =
    runtimeStatus === "error"
      ? "#ff6673"
      : runtimeStatus === "degraded"
        ? "#ffb261"
        : runtimeStatus === "waiting"
          ? "#8ca0b4"
          : "#6ac5ff";
  const boardGlow = runtimeStatus === "error" ? "#a82c34" : runtimeStatus === "waiting" ? "#314150" : "#1d4f86";
  const entryAccent = runtimeStatus === "error" ? "#ff8b89" : runtimeStatus === "degraded" ? "#f4be73" : "#7fd7ff";

  return (
    <group
      userData={{
        sceneRole: "office-shell",
        hasLounge: true,
        overheadSightline: OVERHEAD_SIGHTLINE_MODE,
        frontLabelLaneClearance: FRONT_LABEL_LANE_CLEARANCE_MODE,
      }}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial color="#1a2530" roughness={0.98} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -0.2]}>
        <planeGeometry args={[16.9, 10.1]} />
        <meshStandardMaterial color="#7e9ab0" roughness={0.84} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0]}>
        <ringGeometry args={[2.35, 2.75, 28]} />
        <meshStandardMaterial color="#89b2c1" roughness={0.78} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.017, -0.2]}>
        <ringGeometry args={[3.3, 3.64, 30]} />
        <meshStandardMaterial color="#f7deb5" roughness={0.74} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 6.25]}>
        <planeGeometry args={[17.2, 4.15]} />
        <meshStandardMaterial color="#d39a68" roughness={0.88} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 4.18]}>
        <planeGeometry args={[17.2, 0.2]} />
        <meshStandardMaterial color="#f2dcc0" roughness={0.6} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.021, -3.48]}>
        <planeGeometry args={[16.9, 0.16]} />
        <meshStandardMaterial color="#f1d3aa" roughness={0.66} />
      </mesh>

      {[-6.4, -2.15, 2.15, 6.4].map((x) => (
        <mesh key={`rug-marker-${x}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.025, 5.98]}>
          <circleGeometry args={[0.42, 20]} />
          <meshStandardMaterial color={x < 0 ? "#f0b36a" : "#79c4d8"} roughness={0.84} />
        </mesh>
      ))}

      <mesh position={[0, 1.8, -7.2]}>
        <boxGeometry args={[20.8, 3.6, 0.35]} />
        <meshStandardMaterial color="#efd4b1" roughness={0.78} />
      </mesh>

      <mesh position={[-10.15, 1.5, 0.1]}>
        <boxGeometry args={[0.35, 3, 15.8]} />
        <meshStandardMaterial color="#c9b397" roughness={0.84} />
      </mesh>

      <mesh position={[10.15, 1.5, 0.1]}>
        <boxGeometry args={[0.35, 3, 15.8]} />
        <meshStandardMaterial color="#c9b397" roughness={0.84} />
      </mesh>

      {[-9.3, 9.3].map((x) => (
        <mesh key={`ceiling-side-rail-${x}`} position={[x, 3.1, 0.18]}>
          <boxGeometry args={[1.36, 0.2, 15.8]} />
          <meshStandardMaterial color="#fff0d7" roughness={0.84} />
        </mesh>
      ))}

      <mesh position={[0, 3.1, -6.38]}>
        <boxGeometry args={[18.8, 0.18, 1.16]} />
        <meshStandardMaterial color="#fff0d7" roughness={0.84} />
      </mesh>

      {[-6.2, 6.2].map((x) => (
        <mesh key={`front-corner-rail-${x}`} position={[x, 3.1, 6.26]}>
          <boxGeometry args={[3.9, 0.18, 0.86]} />
          <meshStandardMaterial color="#fff0d7" roughness={0.84} />
        </mesh>
      ))}

      <mesh position={[0, 3.08, -6.62]}>
        <boxGeometry args={[10.2, 0.06, 0.34]} />
        <meshStandardMaterial color="#fff0db" roughness={0.72} emissive="#f6deb2" emissiveIntensity={0.18} />
      </mesh>

      {[-8.2, -4.1, 0, 4.1, 8.2].map((x) => (
        <mesh key={`soffit-${x}`} position={[x, 3.06, -2.38]}>
          <boxGeometry args={[1.72, 0.08, 0.52]} />
          <meshStandardMaterial color="#f9ead4" roughness={0.74} emissive="#f6deb0" emissiveIntensity={0.12} />
        </mesh>
      ))}

      {[-7.1, -2.35, 2.35, 7.1].map((x) => (
        <group key={`pendant-${x}`} position={[x, 2.48, 1.45]}>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.42, 10]} />
            <meshStandardMaterial color="#7f8b96" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.22, 0.3, 0.22, 18]} />
            <meshStandardMaterial color="#fff0d8" emissive="#f6deb0" emissiveIntensity={0.28} roughness={0.64} />
          </mesh>
        </group>
      ))}

      {[-6.6, -2.2, 2.2, 6.6].map((x) => (
        <mesh key={`ceiling-dot-${x}`} position={[x, 2.96, 0.88]}>
          <sphereGeometry args={[0.13, 14, 14]} />
          <meshStandardMaterial color="#ffe2a8" emissive="#ffe2a8" emissiveIntensity={0.26} roughness={0.58} />
        </mesh>
      ))}

      <mesh position={[0, 0.25, 6.15]}>
        <boxGeometry args={[9.6, 0.32, 3.2]} />
        <meshStandardMaterial color="#d89a63" roughness={0.92} />
      </mesh>

      {loungeSeatPositions.map((x) => (
        <group key={`seat-${x}`} position={[x, 0.52, 7.18]}>
          <mesh>
            <boxGeometry args={[2.1, 0.48, 1.62]} />
            <meshStandardMaterial color="#86b8d8" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.46, -0.55]}>
            <boxGeometry args={[2.08, 0.48, 0.28]} />
            <meshStandardMaterial color="#5e88b0" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.18, 0.66]}>
            <boxGeometry args={[1.7, 0.08, 0.28]} />
            <meshStandardMaterial color="#b9d6e8" roughness={0.8} />
          </mesh>
          <mesh position={[-0.82, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.12, 0.42, 4, 8]} />
            <meshStandardMaterial color="#f5c66f" roughness={0.66} />
          </mesh>
          <mesh position={[0.82, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
            <capsuleGeometry args={[0.12, 0.42, 4, 8]} />
            <meshStandardMaterial color="#ef916a" roughness={0.66} />
          </mesh>
        </group>
      ))}

      <mesh position={[-7.4, 1.5, -5.4]}>
        <boxGeometry args={[4.2, 1.5, 0.2]} />
        <meshStandardMaterial color="#3e5872" roughness={0.76} metalness={0.12} />
      </mesh>

      <mesh position={[-7.4, 2.36, -5.3]}>
        <boxGeometry args={[3.52, 0.78, 0.08]} />
        <meshStandardMaterial color="#173049" emissive={boardGlow} emissiveIntensity={0.52} roughness={0.5} />
      </mesh>

      <mesh position={[-7.44, 1.55, -5.2]}>
        <boxGeometry args={[0.62, 0.22, 0.4]} />
        <meshStandardMaterial color="#efca8e" roughness={0.7} />
      </mesh>

      <mesh position={[7.7, 1.68, -5.56]}>
        <boxGeometry args={[3.2, 1.7, 0.18]} />
        <meshStandardMaterial color="#f2efe7" roughness={0.82} />
      </mesh>

      {[-0.8, 0, 0.8].map((x) => (
        <mesh key={`entry-accent-${x}`} position={[x, 0.22, 4.24]}>
          <cylinderGeometry args={[0.12, 0.12, 0.18, 18]} />
          <meshStandardMaterial color={entryAccent} emissive={entryAccent} emissiveIntensity={0.3} roughness={0.56} />
        </mesh>
      ))}

      <mesh position={[0, 1.9, 6.1]}>
        <boxGeometry args={[0.18, 2.2, 0.18]} />
        <meshStandardMaterial color="#99a7b2" roughness={0.64} />
      </mesh>

      <mesh position={[0, 3.02, 6.1]}>
        <sphereGeometry args={[0.22, 18, 18]} />
        <meshStandardMaterial color={loungeLampColor} emissive={loungeLampColor} emissiveIntensity={0.88} />
      </mesh>

      <OfficeProps compactMode />
    </group>
  );
}
