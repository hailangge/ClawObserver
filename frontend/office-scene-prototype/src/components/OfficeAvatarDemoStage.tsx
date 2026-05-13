import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import { MathUtils, Vector3 } from "three";
import { OfficeAssetModel } from "./OfficeAssetModel";
import { OfficeAvatarModel } from "./OfficeAvatarModel";

export const AVATAR_DEMO_STAGE_MARKER = "office-avatar-visibility-demo-v1";
export const AVATAR_DEMO_STAGE_MODE = "hero-plus-desk-cluster";
export const AVATAR_DEMO_STAGE_COUNT = 5;

const HERO_POSITION: [number, number, number] = [-2.48, 0.08, 0.82];
const HERO_ROTATION: [number, number, number] = [0, MathUtils.degToRad(24), 0];
const HERO_SCALE: [number, number, number] = [2.94, 2.94, 2.94];
const CAMERA_TARGET = new Vector3(0.9, 1.42, 0.92);

const DESK_CLUSTER = [
  {
    label: "Desk 5",
    avatarKey: "hyper-casual-amber" as const,
    deskPosition: [-0.58, 0, -0.42] as [number, number, number],
    avatarPosition: [-0.52, 0.06, 1.08] as [number, number, number],
    avatarRotation: [0, MathUtils.degToRad(8), 0] as [number, number, number],
    avatarScale: [1.56, 1.56, 1.56] as [number, number, number],
    accent: "#ffd7bf",
  },
  {
    label: "Desk 6",
    avatarKey: "hyper-casual-cyan" as const,
    deskPosition: [0.88, 0, -0.38] as [number, number, number],
    avatarPosition: [-0.26, 0.06, 1.04] as [number, number, number],
    avatarRotation: [0, MathUtils.degToRad(4), 0] as [number, number, number],
    avatarScale: [1.5, 1.5, 1.5] as [number, number, number],
    accent: "#bceeff",
  },
  {
    label: "Desk 7",
    avatarKey: "hyper-casual-green" as const,
    deskPosition: [2.32, 0, -0.34] as [number, number, number],
    avatarPosition: [0.02, 0.06, 1.02] as [number, number, number],
    avatarRotation: [0, MathUtils.degToRad(-3), 0] as [number, number, number],
    avatarScale: [1.46, 1.46, 1.46] as [number, number, number],
    accent: "#c5ffe8",
  },
  {
    label: "Desk 8",
    avatarKey: "hyper-casual-orange" as const,
    deskPosition: [3.74, 0, -0.3] as [number, number, number],
    avatarPosition: [0.28, 0.06, 1] as [number, number, number],
    avatarRotation: [0, MathUtils.degToRad(-8), 0] as [number, number, number],
    avatarScale: [1.42, 1.42, 1.42] as [number, number, number],
    accent: "#ffe0bf",
  },
] as const;

function DemoCameraRig() {
  useEffect(() => {
    return;
  }, []);

  return null;
}

function DemoDesk({
  deskPosition,
  avatarKey,
  avatarPosition,
  avatarRotation,
  avatarScale,
  accent,
  label,
}: (typeof DESK_CLUSTER)[number]) {
  return (
    <group position={deskPosition}>
      <mesh position={[0, 0.7, 0.2]}>
        <boxGeometry args={[1.84, 0.12, 0.74]} />
        <meshStandardMaterial color="#163149" roughness={0.62} metalness={0.12} />
      </mesh>
      <mesh position={[0.02, 0.03, 1.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 24]} />
        <meshBasicMaterial color={accent} transparent opacity={0.18} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.78, 0.18]}>
        <boxGeometry args={[1.7, 0.04, 0.58]} />
        <meshStandardMaterial color="#4379aa" roughness={0.42} metalness={0.18} />
      </mesh>
      <OfficeAssetModel
        assetKey="desk"
        position={[-0.42, 0.18, -0.08]}
        rotation={[0, Math.PI / 2, 0]}
        scale={[0.72, 0.78, 0.52]}
        appearance={{ tint: "#23415b", tintStrength: 0.96 }}
        userData={{ sceneRole: "avatar-demo-desk-model", avatarDemoStage: AVATAR_DEMO_STAGE_MARKER }}
      />
      <OfficeAssetModel
        assetKey="computerScreen"
        position={[0.46, 1.04, -0.02]}
        rotation={[0, MathUtils.degToRad(188), 0]}
        scale={[0.72, 0.8, 0.46]}
        appearance={{ tint: "#23394e", tintStrength: 0.58 }}
        userData={{ sceneRole: "avatar-demo-monitor-model", avatarDemoStage: AVATAR_DEMO_STAGE_MARKER }}
      />
      <mesh position={[0.44, 1.05, 0.06]}>
        <planeGeometry args={[0.48, 0.28]} />
        <meshStandardMaterial
          color="#96f3ff"
          emissive="#60daff"
          emissiveIntensity={0.52}
          transparent
          opacity={0.88}
        />
      </mesh>
      <OfficeAssetModel
        assetKey="computerKeyboard"
        position={[0.28, 0.78, 0.2]}
        rotation={[0, Math.PI, 0]}
        scale={[0.78, 0.54, 0.62]}
        appearance={{ tint: "#9eb7ca", tintStrength: 0.26 }}
        userData={{ sceneRole: "avatar-demo-keyboard-model", avatarDemoStage: AVATAR_DEMO_STAGE_MARKER }}
      />
      <OfficeAssetModel
        assetKey="chairDesk"
        position={[-0.48, 0.24, -0.42]}
        rotation={[0, Math.PI * 0.94, 0]}
        scale={[0.7, 0.6, 0.64]}
        appearance={{ tint: "#365a7a", tintStrength: 0.96 }}
        userData={{ sceneRole: "avatar-demo-chair-model", avatarDemoStage: AVATAR_DEMO_STAGE_MARKER }}
      />
      <pointLight position={[0.08, 1.95, 1.9]} color={accent} intensity={0.66} distance={4.8} decay={1.8} />
      <OfficeAvatarModel
        avatarKey={avatarKey}
        position={avatarPosition}
        rotation={avatarRotation}
        scale={avatarScale}
        appearance={{
          tint: "#f7f3ed",
          tintStrength: 0.08,
          emissive: accent,
          emissiveIntensity: 0.12,
          roughness: 0.82,
          metalness: 0.02,
          colorBoost: 1.22,
        }}
        userData={{
          sceneRole: "avatar-demo-character",
          avatarDemoStage: AVATAR_DEMO_STAGE_MARKER,
          avatarDemoRole: "desk",
          avatarDemoDesk: label,
        }}
      />
    </group>
  );
}

function DemoScene() {
  return (
    <>
      <color attach="background" args={["#09131d"]} />
      <fog attach="fog" args={["#09131d", 8.5, 13.5]} />
      <ambientLight intensity={1.18} />
      <hemisphereLight args={["#a6efff", "#0f2233", 1.46]} />
      <directionalLight position={[2.6, 5.8, 6.4]} intensity={1.18} color="#dff5ff" />
      <directionalLight position={[-4.4, 4.8, 2.8]} intensity={0.72} color="#69d8ff" />
      <pointLight position={[-2.2, 2.2, 3.2]} color="#ffe3c0" intensity={1.26} distance={9.5} decay={1.7} />
      <pointLight position={[2.4, 2.8, 0.8]} color="#84ecff" intensity={0.92} distance={7.5} decay={1.8} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.72, -0.02, 0.28]}>
        <planeGeometry args={[10.4, 4.8]} />
        <meshStandardMaterial color="#0d2133" roughness={0.96} />
      </mesh>
      <mesh position={[1.48, 1.74, -1.48]}>
        <boxGeometry args={[9.2, 3.5, 0.18]} />
        <meshStandardMaterial color="#132b41" roughness={0.88} />
      </mesh>
      <mesh position={[1.48, 2.86, -1.34]}>
        <boxGeometry args={[6.1, 0.1, 0.2]} />
        <meshStandardMaterial color="#66dcff" emissive="#289cca" emissiveIntensity={0.24} roughness={0.66} />
      </mesh>
      <mesh position={[1.88, 0.02, 1.04]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 1.2, 32]} />
        <meshStandardMaterial color="#244666" roughness={0.82} />
      </mesh>
      <mesh position={[1.88, 0.021, 1.04]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.28, 1.42, 32]} />
        <meshStandardMaterial color="#66dcff" emissive="#2a9ecb" emissiveIntensity={0.18} roughness={0.72} />
      </mesh>

      {DESK_CLUSTER.map((desk) => (
        <DemoDesk key={desk.label} {...desk} />
      ))}

      <mesh position={[HERO_POSITION[0] - 0.08, 0.03, HERO_POSITION[2] + 0.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.72, 32]} />
        <meshBasicMaterial color="#89ebff" transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </mesh>
      <OfficeAvatarModel
        avatarKey="hyper-casual-cyan"
        position={HERO_POSITION}
        rotation={HERO_ROTATION}
        scale={HERO_SCALE}
        appearance={{
          tint: "#ffffff",
          tintStrength: 0.04,
          emissive: "#9ef2ff",
          emissiveIntensity: 0.22,
          roughness: 0.78,
          metalness: 0.02,
          colorBoost: 1.28,
        }}
        userData={{
          sceneRole: "avatar-demo-character",
          avatarDemoStage: AVATAR_DEMO_STAGE_MARKER,
          avatarDemoRole: "hero",
          avatarDemoDesk: "Hero",
        }}
      />
      <OfficeAssetModel
        assetKey="computerScreen"
        position={[-1.18, 1.04, 0.92]}
        rotation={[0, MathUtils.degToRad(198), 0]}
        scale={[0.92, 1.02, 0.58]}
        appearance={{ tint: "#22384e", tintStrength: 0.56 }}
        userData={{ sceneRole: "avatar-demo-hero-monitor-model", avatarDemoStage: AVATAR_DEMO_STAGE_MARKER }}
      />
      <mesh position={[-1.08, 1.06, 0.82]} rotation={[0, MathUtils.degToRad(18), 0]}>
        <planeGeometry args={[0.68, 0.4]} />
        <meshStandardMaterial
          color="#95f1ff"
          emissive="#66ddff"
          emissiveIntensity={0.64}
          transparent
          opacity={0.9}
        />
      </mesh>
    </>
  );
}

export function OfficeAvatarDemoStage() {
  return (
    <aside
      className="scene-avatar-demo-panel"
      data-avatar-demo-stage={AVATAR_DEMO_STAGE_MARKER}
      data-avatar-demo-stage-mode={AVATAR_DEMO_STAGE_MODE}
      data-avatar-demo-stage-count={String(AVATAR_DEMO_STAGE_COUNT)}
      data-avatar-demo-stage-license="CC BY 3.0"
      data-avatar-demo-stage-author="J-Toastie"
      data-avatar-demo-stage-asset="Hyper Casual Character"
      data-avatar-demo-stage-provenance="poly-pizza-hyper-casual-character-cc-by-3.0"
    >
      <div className="scene-avatar-demo-copy">
        <p className="scene-avatar-demo-eyebrow">Preview only</p>
        <h2>Avatar visibility demo</h2>
        <p>One large hero avatar plus four desk-scale characters staged above desks and monitors so people read immediately.</p>
        <p className="scene-avatar-demo-attribution">Hyper Casual Character by J-Toastie, CC BY 3.0.</p>
      </div>
      <div className="scene-avatar-demo-marker-strip" aria-hidden="true">
        <span data-avatar-demo-node={AVATAR_DEMO_STAGE_MARKER} data-avatar-demo-role="hero" data-avatar-demo-desk="Hero" />
        {DESK_CLUSTER.map((desk) => (
          <span
            key={desk.label}
            data-avatar-demo-node={AVATAR_DEMO_STAGE_MARKER}
            data-avatar-demo-role="desk"
            data-avatar-demo-desk={desk.label}
          />
        ))}
      </div>
      <div className="scene-avatar-demo-canvas-shell">
        <Canvas
          className="scene-avatar-demo-canvas"
          dpr={[1, 1.5]}
          frameloop="demand"
          shadows={false}
          camera={{ position: [1.1, 2.36, 10.8], fov: 25, near: 0.1, far: 30 }}
          onCreated={({ camera }) => {
            camera.lookAt(CAMERA_TARGET);
            camera.updateProjectionMatrix();
            camera.updateMatrixWorld();
          }}
        >
          <DemoCameraRig />
          <DemoScene />
        </Canvas>
      </div>
    </aside>
  );
}
