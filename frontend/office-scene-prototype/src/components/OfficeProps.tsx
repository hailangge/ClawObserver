import { OfficeAssetModel } from "./OfficeAssetModel";

type OfficePropsProps = {
  compactMode?: boolean;
};

export const STRUCTURAL_OPACITY_MODE = "opaque";

const sidePlanters = [
  [-8.4, 0.55, -5.6],
  [8.4, 0.55, -5.6],
  [-8.2, 0.55, 4.55],
  [8.2, 0.55, 4.55],
] as const;

const partitions = [
  [-5.25, 0.92, -1.45],
  [0, 0.92, -1.45],
  [5.25, 0.92, -1.45],
  [-5.25, 0.92, 1.8],
  [0, 0.92, 1.8],
  [5.25, 0.92, 1.8],
] as const;

const storageWall = [-7.35, -2.45, 2.45, 7.35];
const pinboardPositions = [-5.7, 0, 5.7];

function Planter({ position }: { position: readonly [number, number, number] }) {
  return (
    <group position={position as [number, number, number]}>
      <OfficeAssetModel
        assetKey="pottedPlant"
        scale={[3.74, 1.52, 3.74]}
        appearance={{ tint: "#86ba76", tintStrength: 0.18 }}
        userData={{ sceneRole: "planter-model", assetBacked: true }}
        fallback={
          <>
            <mesh>
              <boxGeometry args={[1.02, 0.56, 1.02]} />
              <meshStandardMaterial color="#a17352" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.6, 0]}>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial color="#7fb66f" roughness={0.92} />
            </mesh>
            <mesh position={[0.22, 0.96, 0.1]} rotation={[0.1, 0, 0.25]}>
              <cylinderGeometry args={[0.08, 0.1, 0.48, 10]} />
              <meshStandardMaterial color="#93c17f" roughness={0.86} />
            </mesh>
          </>
        }
      />
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[0.58, 0.64, 0.1, 18]} />
        <meshStandardMaterial color="#f4d6a4" roughness={0.7} />
      </mesh>
    </group>
  );
}

function Partition({ position }: { position: readonly [number, number, number] }) {
  return (
    <group
      position={position as [number, number, number]}
      userData={{ sceneRole: "partition", structuralOpacity: STRUCTURAL_OPACITY_MODE }}
    >
      <mesh>
        <boxGeometry args={[0.18, 1.32, 2.42]} />
        <meshStandardMaterial color="#eef0e8" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.24, 0.14, 2.56]} />
        <meshStandardMaterial color="#8cb5c4" roughness={0.74} />
      </mesh>
      <mesh position={[0, -0.66, 0]}>
        <boxGeometry args={[0.26, 0.08, 2.56]} />
        <meshStandardMaterial color="#f5d39d" roughness={0.72} />
      </mesh>
    </group>
  );
}

function StorageBay({ x }: { x: number }) {
  return (
    <group position={[x, 0.85, -5.82]}>
      <OfficeAssetModel
        assetKey="bookcaseOpen"
        rotation={[0, Math.PI / 2, 0]}
        scale={[4.9, 2.12, 2.28]}
        appearance={{ tint: "#c98d63", tintStrength: 0.22 }}
        userData={{ sceneRole: "bookcase-model", assetBacked: true }}
        fallback={
          <>
            <mesh>
              <boxGeometry args={[1.96, 1.82, 0.48]} />
              <meshStandardMaterial color="#b2774f" roughness={0.86} />
            </mesh>
            <mesh position={[0, 0.52, 0.27]}>
              <boxGeometry args={[1.52, 0.82, 0.04]} />
              <meshStandardMaterial color="#f3e6d2" roughness={0.8} />
            </mesh>
          </>
        }
      />
      {[-0.42, 0.06, 0.44].map((offset, index) => (
        <OfficeAssetModel
          key={offset}
          assetKey="books"
          position={[offset, 0.08 + index * 0.18, 0.11]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[1.34, 1.14, 1.28]}
          appearance={{ tint: index === 1 ? "#4f9dd0" : index === 2 ? "#f0a16e" : "#efcd78", tintStrength: 0.24 }}
          userData={{ sceneRole: "bookcase-books-model", assetBacked: true }}
          fallback={
            <mesh position={[offset, -0.22 + index * 0.14, 0.22]}>
              <boxGeometry args={[0.3, 0.14, 0.28]} />
              <meshStandardMaterial color={index === 1 ? "#4f9dd0" : index === 2 ? "#f0a16e" : "#efcd78"} roughness={0.78} />
            </mesh>
          }
        />
      ))}
      <mesh position={[0, -0.02, 0.44]}>
        <capsuleGeometry args={[0.14, 1.56, 4, 10]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f6e1b1" roughness={0.72} />
      </mesh>
    </group>
  );
}

function LoungeTable({ x }: { x: number }) {
  return (
    <group position={[x, 0.78, 6.1]}>
      <OfficeAssetModel
        assetKey="tableCoffee"
        rotation={[0, Math.PI / 2, 0]}
        scale={[3.52, 1.34, 2.82]}
        appearance={{ tint: "#82abc4", tintStrength: 0.22 }}
        userData={{ sceneRole: "lounge-table-model", assetBacked: true }}
        fallback={
          <>
            <mesh>
              <boxGeometry args={[2.28, 0.22, 1.04]} />
              <meshStandardMaterial color="#7fb1c7" roughness={0.76} />
            </mesh>
            {[-0.82, 0.82].map((legX) => (
              <mesh key={legX} position={[legX, -0.44, 0]}>
                <boxGeometry args={[0.16, 0.82, 0.16]} />
                <meshStandardMaterial color="#6f8ba0" roughness={0.72} />
              </mesh>
            ))}
          </>
        }
      />
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[1.46, 0.08, 0.74]} />
        <meshStandardMaterial color="#f8dfb0" roughness={0.72} />
      </mesh>
      <mesh position={[-0.38, 0.24, 0.12]}>
        <capsuleGeometry args={[0.08, 0.22, 4, 8]} />
        <meshStandardMaterial color="#ed8e67" roughness={0.68} />
      </mesh>
      <mesh position={[0.42, 0.24, -0.1]}>
        <capsuleGeometry args={[0.08, 0.22, 4, 8]} />
        <meshStandardMaterial color="#7cc4d3" roughness={0.68} />
      </mesh>
    </group>
  );
}

function Pinboard({ x }: { x: number }) {
  return (
    <group position={[x, 1.5, -6.56]}>
      <mesh>
        <boxGeometry args={[2.34, 1.34, 0.1]} />
        <meshStandardMaterial color="#f7f1e7" roughness={0.8} />
      </mesh>
      {[-0.58, 0, 0.58].map((offset, index) => (
        <mesh key={offset} position={[offset, 0.05 * index, 0.06]}>
          <planeGeometry args={[0.38, 0.24]} />
          <meshStandardMaterial color={index === 1 ? "#f4cd73" : index === 2 ? "#ef9a71" : "#89bfe0"} roughness={0.68} />
        </mesh>
      ))}
      <mesh position={[0.72, -0.32, 0.06]}>
        <circleGeometry args={[0.08, 14]} />
        <meshStandardMaterial color="#7fd286" roughness={0.62} />
      </mesh>
    </group>
  );
}

function CoffeeStation() {
  return (
    <group position={[7.35, 1.08, -4.82]}>
      <mesh>
        <boxGeometry args={[2.82, 0.96, 1.04]} />
        <meshStandardMaterial color="#a56c48" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <boxGeometry args={[2.94, 0.12, 1.14]} />
        <meshStandardMaterial color="#f0d3ad" roughness={0.72} />
      </mesh>
      <mesh position={[-0.56, 0.72, 0]}>
        <boxGeometry args={[0.66, 0.5, 0.5]} />
        <meshStandardMaterial color="#3b556e" roughness={0.58} metalness={0.16} />
      </mesh>
      <mesh position={[0.36, 0.58, -0.08]}>
        <cylinderGeometry args={[0.13, 0.13, 0.22, 18]} />
        <meshStandardMaterial color="#f6f0e4" roughness={0.86} />
      </mesh>
      <mesh position={[0.68, 0.58, 0.08]}>
        <cylinderGeometry args={[0.13, 0.13, 0.22, 18]} />
        <meshStandardMaterial color="#f6f0e4" roughness={0.86} />
      </mesh>
      <mesh position={[-0.84, -0.16, 0.4]}>
        <boxGeometry args={[0.3, 0.28, 0.3]} />
        <meshStandardMaterial color="#7ec4d7" roughness={0.72} />
      </mesh>
    </group>
  );
}

function WallArc({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 1.95, z]}>
      <mesh>
        <capsuleGeometry args={[0.18, 1.12, 6, 12]} rotation={[0, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.68} />
      </mesh>
      <mesh position={[0, -0.52, 0]}>
        <boxGeometry args={[1.34, 0.14, 0.12]} />
        <meshStandardMaterial color="#f6dfba" roughness={0.66} />
      </mesh>
    </group>
  );
}

export function OfficeProps({ compactMode = true }: OfficePropsProps) {
  return (
    <group userData={{ sceneRole: "office-props", assetStrategy: "local-low-poly", structuralOpacity: STRUCTURAL_OPACITY_MODE }}>
      {sidePlanters.map((position) => (
        <Planter key={`planter-${position[0]}-${position[2]}`} position={position} />
      ))}
      {partitions.map((position) => (
        <Partition key={`partition-${position[0]}-${position[2]}`} position={position} />
      ))}
      {storageWall.map((x) => (
        <StorageBay key={`storage-${x}`} x={x} />
      ))}
      {pinboardPositions.map((x) => (
        <Pinboard key={`pinboard-${x}`} x={x} />
      ))}
      <CoffeeStation />
      {[-2.7, 0, 2.7].map((x) => (
        <LoungeTable key={`lounge-table-${x}`} x={x} />
      ))}
      {[-6.9, -3.3, 3.3, 6.9].map((x, index) => (
        <WallArc key={`wall-arc-${x}`} x={x} z={index % 2 === 0 ? 4.82 : -3.86} color={index % 2 === 0 ? "#7cc2d6" : "#efb06e"} />
      ))}
      {compactMode ? (
        <>
          <mesh position={[0, 0.18, 4.58]}>
            <boxGeometry args={[7.8, 0.22, 0.42]} />
            <meshStandardMaterial color="#9bb2c2" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.32, 4.82]}>
            <boxGeometry args={[6.4, 0.14, 0.18]} />
            <meshStandardMaterial color="#f8e2bb" roughness={0.7} />
          </mesh>
        </>
      ) : null}
    </group>
  );
}
