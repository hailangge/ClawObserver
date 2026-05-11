import type { SceneSummary } from "../agentVisualState";
import { OfficeProps } from "./OfficeProps";

const loungeSeatPositions = [-3.65, -1.2, 1.2, 3.65];
const loungeTablePositions = [-2.7, 0, 2.7];
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

  return (
    <group userData={{ sceneRole: "office-shell", hasLounge: true }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <planeGeometry args={[24, 20]} />
        <meshStandardMaterial color="#111a21" roughness={0.98} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -0.2]}>
        <planeGeometry args={[16.9, 10.1]} />
        <meshStandardMaterial color="#596e80" roughness={0.88} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 6.25]}>
        <planeGeometry args={[17.2, 4.15]} />
        <meshStandardMaterial color="#c28f63" roughness={0.9} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 4.18]}>
        <planeGeometry args={[17.2, 0.2]} />
        <meshStandardMaterial color="#e0d6c7" roughness={0.66} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.021, -3.48]}>
        <planeGeometry args={[16.9, 0.16]} />
        <meshStandardMaterial color="#d3c7b8" roughness={0.72} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <ringGeometry args={[2.35, 2.75, 28]} />
        <meshStandardMaterial color="#697e8f" roughness={0.84} transparent opacity={0.32} />
      </mesh>

      <mesh position={[0, 1.8, -7.2]}>
        <boxGeometry args={[20.8, 3.6, 0.35]} />
        <meshStandardMaterial color="#d8c7ae" roughness={0.82} />
      </mesh>

      <mesh position={[-10.15, 1.5, 0.1]}>
        <boxGeometry args={[0.35, 3, 15.8]} />
        <meshStandardMaterial color="#a29380" roughness={0.88} />
      </mesh>

      <mesh position={[10.15, 1.5, 0.1]}>
        <boxGeometry args={[0.35, 3, 15.8]} />
        <meshStandardMaterial color="#a29380" roughness={0.88} />
      </mesh>

      <mesh position={[0, 3.02, -5.45]}>
        <boxGeometry args={[11.4, 0.08, 1.15]} />
        <meshStandardMaterial color="#f5ead8" emissive="#f3ddb0" emissiveIntensity={0.24} />
      </mesh>

      {[-8.2, -4.1, 0, 4.1, 8.2].map((x) => (
        <mesh key={`soffit-${x}`} position={[x, 2.84, -1.05]}>
          <boxGeometry args={[2.2, 0.12, 1.65]} />
          <meshStandardMaterial color="#eadfcd" roughness={0.78} emissive="#f0dfbe" emissiveIntensity={0.08} />
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
            <meshStandardMaterial color="#f3e3cb" emissive="#f6deb0" emissiveIntensity={0.18} roughness={0.7} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 0.25, 6.15]}>
        <boxGeometry args={[9.6, 0.32, 3.2]} />
        <meshStandardMaterial color="#ba835a" roughness={0.95} />
      </mesh>

      {loungeTablePositions.map((x) => (
        <group key={`table-${x}`} position={[x, 0.78, 6.1]}>
          <mesh>
            <boxGeometry args={[2.1, 0.18, 0.94]} />
            <meshStandardMaterial color="#718aa0" roughness={0.8} />
          </mesh>
          {[-0.78, 0.78].map((legX) => (
            <mesh key={legX} position={[legX, -0.4, 0]}>
              <boxGeometry args={[0.12, 0.76, 0.12]} />
              <meshStandardMaterial color="#607384" roughness={0.78} />
            </mesh>
          ))}
        </group>
      ))}

      {loungeSeatPositions.map((x) => (
        <group key={`seat-${x}`} position={[x, 0.52, 7.18]}>
          <mesh>
            <boxGeometry args={[2.1, 0.48, 1.62]} />
            <meshStandardMaterial color="#79a8cb" roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.46, -0.55]}>
            <boxGeometry args={[2.08, 0.48, 0.28]} />
            <meshStandardMaterial color="#6c98bb" roughness={0.82} />
          </mesh>
          <mesh position={[0, -0.18, 0.66]}>
            <boxGeometry args={[1.7, 0.08, 0.28]} />
            <meshStandardMaterial color="#8bb7d6" roughness={0.84} />
          </mesh>
        </group>
      ))}

      <mesh position={[-7.4, 1.5, -5.4]}>
        <boxGeometry args={[4.2, 1.5, 0.2]} />
        <meshStandardMaterial color="#2b425a" roughness={0.8} metalness={0.18} />
      </mesh>

      <mesh position={[-7.4, 2.36, -5.3]}>
        <boxGeometry args={[3.52, 0.78, 0.08]} />
        <meshStandardMaterial color="#132537" emissive={boardGlow} emissiveIntensity={0.44} roughness={0.55} />
      </mesh>

      <mesh position={[-7.44, 1.55, -5.2]}>
        <boxGeometry args={[0.62, 0.22, 0.4]} />
        <meshStandardMaterial color="#d4b88b" roughness={0.75} />
      </mesh>

      <mesh position={[0, 1.9, 6.1]}>
        <boxGeometry args={[0.18, 2.2, 0.18]} />
        <meshStandardMaterial color="#8a98a5" roughness={0.7} />
      </mesh>

      <mesh position={[0, 3.02, 6.1]}>
        <sphereGeometry args={[0.22, 18, 18]} />
        <meshStandardMaterial color={loungeLampColor} emissive={loungeLampColor} emissiveIntensity={0.75} />
      </mesh>

      <OfficeProps compactMode />
    </group>
  );
}
