import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Box3, Color, LoadingManager, type Material, Mesh, Object3D } from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OFFICE_ASSET_MODELS, type OfficeAssetKey } from "../data/officeAssetCatalog";

type OfficeAssetAppearance = {
  tint?: string;
  tintStrength?: number;
  opacity?: number;
};

type OfficeAssetModelProps = {
  assetKey: OfficeAssetKey;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  appearance?: OfficeAssetAppearance;
  fallback?: ReactNode;
  userData?: Record<string, unknown>;
};

type OfficeAssetState =
  | { status: "loading"; object: null; error: null }
  | { status: "loaded"; object: Object3D; error: null }
  | { status: "failed"; object: null; error: Error };

const assetPromiseCache = new Map<OfficeAssetKey, Promise<Object3D>>();
const assetResultCache = new Map<OfficeAssetKey, Object3D>();
const assetErrorCache = new Map<OfficeAssetKey, Error>();
const normalizationBox = new Box3();

function cloneMaterial(material: Material, appearance?: OfficeAssetAppearance) {
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
      clonedMaterial.color.lerp(tintColor, appearance?.tintStrength ?? 0.16);
    }
  }

  return clonedMaterial;
}

function cloneWithAppearance(object: Object3D, appearance?: OfficeAssetAppearance) {
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

async function loadOfficeAsset(assetKey: OfficeAssetKey) {
  const cachedObject = assetResultCache.get(assetKey);
  if (cachedObject) {
    return cachedObject;
  }

  const cachedError = assetErrorCache.get(assetKey);
  if (cachedError) {
    throw cachedError;
  }

  const cachedPromise = assetPromiseCache.get(assetKey);
  if (cachedPromise) {
    return cachedPromise;
  }

  const asset = OFFICE_ASSET_MODELS[assetKey];
  const promise = (async () => {
    try {
      const manager = new LoadingManager();
      const mtlLoader = new MTLLoader(manager);
      const materials = await mtlLoader.loadAsync(asset.mtlPath);
      materials.preload();

      const objLoader = new OBJLoader(manager);
      objLoader.setMaterials(materials);
      const loadedObject = await objLoader.loadAsync(asset.objPath);

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

      loadedObject.userData.assetKey = assetKey;
      loadedObject.userData.assetSource = "kenney-furniture-kit";
      assetResultCache.set(assetKey, loadedObject);
      return loadedObject;
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      assetErrorCache.set(assetKey, normalizedError);
      throw normalizedError;
    } finally {
      assetPromiseCache.delete(assetKey);
    }
  })();

  assetPromiseCache.set(assetKey, promise);
  return promise;
}

function createInitialState(assetKey: OfficeAssetKey): OfficeAssetState {
  const cachedObject = assetResultCache.get(assetKey);
  if (cachedObject) {
    return { status: "loaded", object: cachedObject, error: null };
  }

  const cachedError = assetErrorCache.get(assetKey);
  if (cachedError) {
    return { status: "failed", object: null, error: cachedError };
  }

  return { status: "loading", object: null, error: null };
}

export function OfficeAssetModel({
  assetKey,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  appearance,
  fallback = null,
  userData,
}: OfficeAssetModelProps) {
  const [state, setState] = useState<OfficeAssetState>(() => createInitialState(assetKey));

  useEffect(() => {
    let cancelled = false;

    setState(createInitialState(assetKey));
    loadOfficeAsset(assetKey)
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
  }, [assetKey]);

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
