import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Box3, Color, LoadingManager, Material, Mesh, Object3D } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OFFICE_AVATAR_MODELS, type OfficeAvatarKey } from "../data/officeAvatarCatalog";

type OfficeAvatarAppearance = {
  tint?: string;
  tintStrength?: number;
  opacity?: number;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  colorBoost?: number;
};

type OfficeAvatarModelProps = {
  avatarKey: OfficeAvatarKey;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  appearance?: OfficeAvatarAppearance;
  fallback?: ReactNode;
  userData?: Record<string, unknown>;
};

type OfficeAvatarState =
  | { status: "loading"; object: null; error: null }
  | { status: "loaded"; object: Object3D; error: null }
  | { status: "failed"; object: null; error: Error };

const avatarPromiseCache = new Map<OfficeAvatarKey, Promise<Object3D>>();
const avatarResultCache = new Map<OfficeAvatarKey, Object3D>();
const avatarErrorCache = new Map<OfficeAvatarKey, Error>();
const normalizationBox = new Box3();

function cloneMaterial(material: Material, appearance?: OfficeAvatarAppearance) {
  const clonedMaterial = material.clone();

  if ("transparent" in clonedMaterial) {
    clonedMaterial.transparent = Boolean(appearance?.opacity !== undefined && appearance.opacity < 1);
  }
  if ("opacity" in clonedMaterial) {
    clonedMaterial.opacity = appearance?.opacity ?? 1;
  }
  if ("color" in clonedMaterial && clonedMaterial.color) {
    const tintColor = appearance?.tint ? new Color(appearance.tint) : null;
    if (tintColor) {
      clonedMaterial.color.lerp(tintColor, appearance?.tintStrength ?? 0.1);
    }
    if (appearance?.colorBoost && appearance.colorBoost !== 1) {
      clonedMaterial.color.multiplyScalar(appearance.colorBoost);
    }
  }
  if ("emissive" in clonedMaterial && clonedMaterial.emissive && appearance?.emissive) {
    clonedMaterial.emissive = new Color(appearance.emissive);
  }
  if ("emissiveIntensity" in clonedMaterial && appearance?.emissiveIntensity !== undefined) {
    clonedMaterial.emissiveIntensity = appearance.emissiveIntensity;
  }
  if ("roughness" in clonedMaterial && appearance?.roughness !== undefined) {
    clonedMaterial.roughness = appearance.roughness;
  }
  if ("metalness" in clonedMaterial && appearance?.metalness !== undefined) {
    clonedMaterial.metalness = appearance.metalness;
  }

  return clonedMaterial;
}

function cloneWithAppearance(object: Object3D, appearance?: OfficeAvatarAppearance) {
  const clonedObject = object.clone(true);

  clonedObject.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => cloneMaterial(material, appearance));
    } else if (child.material) {
      child.material = cloneMaterial(child.material, appearance);
    }
  });

  return clonedObject;
}

async function loadOfficeAvatar(avatarKey: OfficeAvatarKey) {
  const cachedObject = avatarResultCache.get(avatarKey);
  if (cachedObject) {
    return cachedObject;
  }

  const cachedError = avatarErrorCache.get(avatarKey);
  if (cachedError) {
    throw cachedError;
  }

  const cachedPromise = avatarPromiseCache.get(avatarKey);
  if (cachedPromise) {
    return cachedPromise;
  }

  const asset = OFFICE_AVATAR_MODELS[avatarKey];
  const promise = (async () => {
    try {
      const manager = new LoadingManager();
      const loader = new GLTFLoader(manager);
      const gltf = await loader.loadAsync(asset.glbPath);
      const loadedObject = gltf.scene;

      normalizationBox.setFromObject(loadedObject);
      const center = normalizationBox.getCenter(loadedObject.position.clone());
      loadedObject.position.x -= center.x;
      loadedObject.position.z -= center.z;
      loadedObject.position.y -= normalizationBox.min.y;

      loadedObject.traverse((child) => {
        if (!(child instanceof Mesh)) {
          return;
        }
        child.castShadow = false;
        child.receiveShadow = false;
      });

      loadedObject.userData.avatarKey = avatarKey;
      loadedObject.userData.assetSource = "poly-pizza-hyper-casual-preview";
      avatarResultCache.set(avatarKey, loadedObject);
      return loadedObject;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      avatarErrorCache.set(avatarKey, normalizedError);
      throw normalizedError;
    } finally {
      avatarPromiseCache.delete(avatarKey);
    }
  })();

  avatarPromiseCache.set(avatarKey, promise);
  return promise;
}

function createInitialState(avatarKey: OfficeAvatarKey): OfficeAvatarState {
  const cachedObject = avatarResultCache.get(avatarKey);
  if (cachedObject) {
    return { status: "loaded", object: cachedObject, error: null };
  }

  const cachedError = avatarErrorCache.get(avatarKey);
  if (cachedError) {
    return { status: "failed", object: null, error: cachedError };
  }

  return { status: "loading", object: null, error: null };
}

export function OfficeAvatarModel({
  avatarKey,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  appearance,
  fallback = null,
  userData,
}: OfficeAvatarModelProps) {
  const [state, setState] = useState<OfficeAvatarState>(() => createInitialState(avatarKey));

  useEffect(() => {
    let cancelled = false;

    setState(createInitialState(avatarKey));
    loadOfficeAvatar(avatarKey)
      .then((object) => {
        if (!cancelled) {
          setState({ status: "loaded", object, error: null });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({ status: "failed", object: null, error: error instanceof Error ? error : new Error(String(error)) });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [avatarKey]);

  const clonedObject = useMemo(() => {
    if (state.status !== "loaded") {
      return null;
    }
    return cloneWithAppearance(state.object, appearance);
  }, [appearance?.opacity, appearance?.tint, appearance?.tintStrength, state]);

  if (!clonedObject) {
    return <>{fallback}</>;
  }

  return <primitive object={clonedObject} position={position} rotation={rotation} scale={scale} userData={userData} />;
}
