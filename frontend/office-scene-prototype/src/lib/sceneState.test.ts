import { describe, expect, it } from "vitest";
import { DESK_LABEL_LAYER_MODE, DESK_LABEL_ORIENTATION_MODE, DESK_LABEL_PLATE_MODE, DESK_STRUCTURE_VISUAL_MODE } from "../components/AgentDesk";
import { SCENE_FRAMELOOP_MODE, SCENE_PERFORMANCE_MODE } from "../components/AgentOfficeScene";
import { STRUCTURAL_OPACITY_MODE } from "../components/OfficeProps";
import { OVERHEAD_SIGHTLINE_MODE } from "../components/OfficeShell";
import { FIXED_WORKSTATION_SLOT_COUNT, FIXED_WORKSTATION_SLOTS, MAX_VISIBLE_TASK_BLOCKS } from "../config/workstationSlots";
import {
  OFFICE_ASSET_LICENSE_PATH,
  OFFICE_ASSET_MODEL_COUNT,
  OFFICE_ASSET_PROVENANCE_PATH,
  OFFICE_ASSET_SOURCE,
  OFFICE_ASSET_STRATEGY,
} from "../data/officeAssetCatalog";
import { STATUS_VISUALS } from "../config/visualMapping";
import { assignAgentsToFixedDesks, capVisibleTaskBlocks } from "./sceneState";

describe("sceneState", () => {
  it("defines exactly 12 fixed workstation slots", () => {
    expect(FIXED_WORKSTATION_SLOT_COUNT).toBe(12);
    expect(FIXED_WORKSTATION_SLOTS).toHaveLength(12);
  });

  it("keeps desk labels camera-facing and structural props opaque", () => {
    expect(DESK_LABEL_ORIENTATION_MODE).toBe("camera-facing-yaw");
    expect(DESK_LABEL_LAYER_MODE).toBe("elevated-forward-billboard");
    expect(DESK_LABEL_PLATE_MODE).toBe("opaque-high-contrast");
    expect(DESK_STRUCTURE_VISUAL_MODE).toBe("opaque");
    expect(STRUCTURAL_OPACITY_MODE).toBe("opaque");
    expect(OVERHEAD_SIGHTLINE_MODE).toBe("clear-back-row");
    expect(SCENE_FRAMELOOP_MODE).toBe("demand");
    expect(SCENE_PERFORMANCE_MODE).toBe("idle-on-demand");
  });

  it("declares the repo-local Kenney asset strategy and metadata", () => {
    expect(OFFICE_ASSET_STRATEGY).toBe("kenney-obj-local-fallback");
    expect(OFFICE_ASSET_SOURCE).toBe("kenney-furniture-kit-cc0");
    expect(OFFICE_ASSET_MODEL_COUNT).toBe(9);
    expect(OFFICE_ASSET_LICENSE_PATH.endsWith("/office-assets/kenney/licenses/Kenney-Furniture-Kit-CC0.txt")).toBe(true);
    expect(OFFICE_ASSET_PROVENANCE_PATH.endsWith("/office-assets/kenney/provenance.json")).toBe(true);
  });

  it("caps visible task blocks", () => {
    expect(MAX_VISIBLE_TASK_BLOCKS).toBe(4);
    expect(capVisibleTaskBlocks(0)).toBe(0);
    expect(capVisibleTaskBlocks(2)).toBe(2);
    expect(capVisibleTaskBlocks(99)).toBe(4);
  });

  it("exposes the required status visual mapping", () => {
    expect(Object.keys(STATUS_VISUALS).sort()).toEqual(["busy", "error", "idle", "offline"]);
    expect(STATUS_VISUALS.idle.lampColor).toBe("#4fd17f");
    expect(STATUS_VISUALS.busy.monitorIntensity).toBeGreaterThan(STATUS_VISUALS.idle.monitorIntensity);
    expect(STATUS_VISUALS.offline.monitorIntensity).toBe(0);
    expect(STATUS_VISUALS.error.lampBlink).toBe(true);
  });

  it("assigns agents to fixed desks without expanding slot count", () => {
    const assignments = assignAgentsToFixedDesks(
      Array.from({ length: 14 }, (_, index) => ({
        id: `agent-${index}`,
        name: `agent-${index}`,
        status: "busy" as const,
        taskCount: 1,
        currentTask: null,
        errorMessage: null,
        updatedAt: "2026-05-10T09:30:00Z",
      })),
    );

    expect(assignments).toHaveLength(12);
    expect(assignments[0]?.agent?.id).toBe("agent-0");
    expect(assignments[11]?.agent?.id).toBe("agent-11");
  });
});
