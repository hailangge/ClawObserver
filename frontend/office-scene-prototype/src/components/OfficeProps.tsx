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
        scale={[3.36, 1.34, 3.36]}
        appearance={{ tint: "#75a76c", tintStrength: 0.12 }}
        userData={{ sceneRole: "planter-model", assetBacked: true }}
        fallback={
          <>
            <mesh>
              <boxGeometry args={[0.92, 0.5, 0.92]} />
              <meshStandardMaterial color="#8b6a4e" roughness={0.92} />
            </mesh>
            <mesh position={[0, 0.54, 0]}>
              <sphereGeometry args={[0.42, 16, 16]} />
              <meshStandardMaterial color="#6fa567" roughness={0.95} />
            </mesh>
            <mesh position={[0.18, 0.82, 0.08]} rotation={[0.1, 0, 0.25]}>
              <cylinderGeometry args={[0.06, 0.08, 0.42, 10]} />
              <meshStandardMaterial color="#84b777" roughness={0.9} />
            </mesh>
          </>
        }
      />
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
        <boxGeometry args={[0.14, 1.25, 2.3]} />
        <meshStandardMaterial color="#d8ddd9" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.18, 0.1, 2.42]} />
        <meshStandardMaterial color="#8fa0ad" roughness={0.8} />
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
        scale={[4.5, 1.92, 2.08]}
        appearance={{ tint: "#ad845f", tintStrength: 0.18 }}
        userData={{ sceneRole: "bookcase-model", assetBacked: true }}
        fallback={
          <>
            <mesh>
              <boxGeometry args={[1.8, 1.7, 0.42]} />
              <meshStandardMaterial color="#8b6547" roughness={0.92} />
            </mesh>
            <mesh position={[0, 0.48, 0.25]}>
              <boxGeometry args={[1.42, 0.76, 0.04]} />
              <meshStandardMaterial color="#f0e2cf" roughness={0.84} />
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
          scale={[1.26, 1.08, 1.22]}
          appearance={{ tint: index === 1 ? "#4f7ea3" : "#cb9b68", tintStrength: 0.18 }}
          userData={{ sceneRole: "bookcase-books-model", assetBacked: true }}
          fallback={
            <mesh position={[offset, -0.22 + index * 0.14, 0.22]}>
              <boxGeometry args={[0.26, 0.12, 0.26]} />
              <meshStandardMaterial color={index === 1 ? "#4f7ea3" : "#cb9b68"} roughness={0.82} />
            </mesh>
          }
        />
      ))}
    </group>
  );
}

function LoungeTable({ x }: { x: number }) {
  return (
    <group position={[x, 0.78, 6.1]}>
      <OfficeAssetModel
        assetKey="tableCoffee"
        rotation={[0, Math.PI / 2, 0]}
        scale={[3.18, 1.24, 2.5]}
        appearance={{ tint: "#768fa6", tintStrength: 0.18 }}
        userData={{ sceneRole: "lounge-table-model", assetBacked: true }}
        fallback={
          <>
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
          </>
        }
      />
    </group>
  );
}

function Pinboard({ x }: { x: number }) {
  return (
    <group position={[x, 1.5, -6.56]}>
      <mesh>
        <boxGeometry args={[2.24, 1.26, 0.08]} />
        <meshStandardMaterial color="#f2ede4" roughness={0.82} />
      </mesh>
      {[-0.52, 0, 0.52].map((offset, index) => (
        <mesh key={offset} position={[offset, 0.05 * index, 0.05]}>
          <planeGeometry args={[0.34, 0.22]} />
          <meshStandardMaterial color={index === 1 ? "#f4cd73" : "#89b4df"} roughness={0.72} />
        </mesh>
      ))}
    </group>
  );
}

function CoffeeStation() {
  return (
    <group position={[7.35, 1.08, -4.82]}>
      <mesh>
        <boxGeometry args={[2.6, 0.88, 0.92]} />
        <meshStandardMaterial color="#7b5d46" roughness={0.94} />
      </mesh>
      <mesh position={[0, 0.54, 0]}>
        <boxGeometry args={[2.74, 0.08, 1.02]} />
        <meshStandardMaterial color="#d5c1a6" roughness={0.78} />
      </mesh>
      <mesh position={[-0.52, 0.66, 0]}>
        <boxGeometry args={[0.58, 0.42, 0.42]} />
        <meshStandardMaterial color="#2d3f53" roughness={0.64} metalness={0.2} />
      </mesh>
      <mesh position={[0.34, 0.56, -0.04]}>
        <cylinderGeometry args={[0.11, 0.11, 0.18, 18]} />
        <meshStandardMaterial color="#f1ece4" roughness={0.9} />
      </mesh>
      <mesh position={[0.62, 0.56, 0.04]}>
        <cylinderGeometry args={[0.11, 0.11, 0.18, 18]} />
        <meshStandardMaterial color="#f1ece4" roughness={0.9} />
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
      {compactMode ? (
        <mesh position={[0, 0.18, 4.58]}>
          <boxGeometry args={[7.4, 0.18, 0.34]} />
          <meshStandardMaterial color="#8ba0b2" roughness={0.86} />
        </mesh>
      ) : null}
    </group>
  );
}
