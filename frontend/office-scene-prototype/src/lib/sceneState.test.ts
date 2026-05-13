import { describe, expect, it } from "vitest";
import {
  DESK_LABEL_HIERARCHY_MODE,
  DESK_LABEL_LAYER_MODE,
  DESK_LABEL_OCCLUSION_MODE,
  DESK_LABEL_ORIENTATION_MODE,
  DESK_LABEL_PLATE_MODE,
  DESK_LABEL_SCALE_HIERARCHY_MODE,
  DESK_INNER_WORKSTATION_ORIENTATION_MODE,
  DESK_MONITOR_DETAIL_MODE,
  DESK_PERIPHERAL_VISIBILITY_MODE,
  DESK_SURFACE_ASPECT_RATIO,
  DESK_STRUCTURE_VISUAL_MODE,
  DESK_WORKSTATION_PROPORTION_MODE,
} from "../components/AgentDesk";
import {
  AVATAR_DEMO_STAGE_COUNT,
  AVATAR_DEMO_STAGE_MARKER,
  AVATAR_DEMO_STAGE_MODE,
} from "../components/OfficeAvatarDemoStage";
import {
  SCENE_AVATAR_PREVIEW_SOURCE,
  SCENE_AVATAR_PLACEMENT_CONTRACT,
  SCENE_AVATAR_PREVIEW_CONTRACT,
  SCENE_FRAMELOOP_MODE,
  SCENE_INNER_WORKSTATION_ORIENTATION_CONTRACT,
  SCENE_LABEL_OCCLUSION_CONTRACT,
  SCENE_LABEL_HIERARCHY_MODE,
  SCENE_LABEL_SCALE_HIERARCHY_CONTRACT,
  SCENE_MONITOR_DETAIL_CONTRACT,
  SCENE_MONITOR_STYLE_MODE,
  SCENE_PERIPHERAL_VISIBILITY_CONTRACT,
  SCENE_PERFORMANCE_MODE,
  SCENE_STYLE_PROFILE,
  SCENE_STYLE_REFERENCE_MODE,
  SCENE_WORKSTATION_DESK_ASPECT_CONTRACT,
  SCENE_WORKSTATION_PROPORTION_CONTRACT,
  SCENE_WORKSTATION_ORIENTATION_MODE,
} from "../components/AgentOfficeScene";
import { STRUCTURAL_OPACITY_MODE } from "../components/OfficeProps";
import { FRONT_LABEL_LANE_CLEARANCE_MODE, OVERHEAD_SIGHTLINE_MODE } from "../components/OfficeShell";
import { WORKADVENTURE_REST_SAFE_RECT, WORKADVENTURE_VISIBLE_LOUNGE_RECT } from "../config/workAdventureLayout";
import { FIXED_WORKSTATION_SLOT_COUNT, FIXED_WORKSTATION_SLOTS, MAX_VISIBLE_TASK_BLOCKS } from "../config/workstationSlots";
import {
  OFFICE_ASSET_LICENSE_PATH,
  OFFICE_ASSET_MODEL_COUNT,
  OFFICE_ASSET_PROVENANCE_PATH,
  OFFICE_ASSET_SOURCE,
  OFFICE_ASSET_STRATEGY,
} from "../data/officeAssetCatalog";
import {
  OFFICE_AVATAR_PREVIEW_LICENSE_PATH,
  OFFICE_AVATAR_PREVIEW_MODEL_COUNT,
  OFFICE_AVATAR_PREVIEW_MODE,
  OFFICE_AVATAR_PREVIEW_PROVENANCE_PATH,
  OFFICE_AVATAR_PREVIEW_SOURCE,
} from "../data/officeAvatarCatalog";
import {
  WORKADVENTURE_PREVIEW_ASSET_LICENSE_PATH,
  WORKADVENTURE_PREVIEW_LICENSE_SCOPE,
  WORKADVENTURE_PREVIEW_MAP_LICENSE_PATH,
  WORKADVENTURE_PREVIEW_MAP_PATH,
  WORKADVENTURE_PREVIEW_MODE,
  WORKADVENTURE_PREVIEW_PROVENANCE_PATH,
  WORKADVENTURE_PREVIEW_SOURCE,
  WORKADVENTURE_PREVIEW_STATS,
  WORKADVENTURE_PREVIEW_TILESET_COUNT,
  WORKADVENTURE_PREVIEW_ZONE_NAMES,
} from "../data/workAdventurePreviewCatalog";
import {
  WORKADVENTURE_WOKA_LICENSE_PATH,
  WORKADVENTURE_WOKA_LICENSE_SCOPE,
  WORKADVENTURE_WOKA_MODE,
  WORKADVENTURE_WOKA_PIPOYA_ATTRIBUTION_PATH,
  WORKADVENTURE_WOKA_PROVENANCE_PATH,
  WORKADVENTURE_WOKA_SOURCE,
  WORKADVENTURE_WOKA_SHEET_HEIGHT,
  WORKADVENTURE_WOKA_SHEET_WIDTH,
  WORKADVENTURE_WOKA_SPRITE_HEIGHT,
  WORKADVENTURE_WOKA_SPRITE_WIDTH,
  WORKADVENTURE_WOKA_SUBSET_COUNT,
} from "../data/workAdventureWokaCatalog";
import {
  WORKADVENTURE_CUSTOM_BACKGROUND_DIMENSIONS,
  WORKADVENTURE_CUSTOM_BACKGROUND_IMAGE_PATH,
  WORKADVENTURE_CUSTOM_BACKGROUND_MODE,
  WORKADVENTURE_CUSTOM_BACKGROUND_PROVENANCE_PATH,
  WORKADVENTURE_CUSTOM_BACKGROUND_SOURCE,
} from "../data/workAdventureCustomBackgroundCatalog";
import { STATUS_VISUALS } from "../config/visualMapping";
import { assignAgentsToFixedDesks, assignAgentsToWorkAdventureZones, capVisibleTaskBlocks } from "./sceneState";

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
    expect(FRONT_LABEL_LANE_CLEARANCE_MODE).toBe("open-center");
    expect(SCENE_FRAMELOOP_MODE).toBe("demand");
    expect(SCENE_PERFORMANCE_MODE).toBe("idle-on-demand");
    expect(SCENE_STYLE_PROFILE).toBe("toy-office-command-center");
    expect(SCENE_STYLE_REFERENCE_MODE).toBe("quaternius-inspired-command-center-safe-emulation");
    expect(SCENE_WORKSTATION_ORIENTATION_MODE).toBe("all-desks-face-camera");
    expect(SCENE_MONITOR_STYLE_MODE).toBe("screen-plane-cyan-edge");
    expect(DESK_LABEL_HIERARCHY_MODE).toBe("small-monitor-top-metadata-tag");
    expect(SCENE_LABEL_HIERARCHY_MODE).toBe(DESK_LABEL_HIERARCHY_MODE);
    expect(DESK_LABEL_SCALE_HIERARCHY_MODE).toBe("small-secondary-corner-badge");
    expect(SCENE_LABEL_SCALE_HIERARCHY_CONTRACT).toBe(DESK_LABEL_SCALE_HIERARCHY_MODE);
    expect(DESK_MONITOR_DETAIL_MODE).toBe("integrated-screen-keyboard-mouse");
    expect(SCENE_MONITOR_DETAIL_CONTRACT).toBe(DESK_MONITOR_DETAIL_MODE);
    expect(DESK_WORKSTATION_PROPORTION_MODE).toBe("wide-front-facing-workstation");
    expect(SCENE_WORKSTATION_PROPORTION_CONTRACT).toBe(DESK_WORKSTATION_PROPORTION_MODE);
    expect(DESK_INNER_WORKSTATION_ORIENTATION_MODE).toBe("camera-facing-inner-workstation-group");
    expect(SCENE_INNER_WORKSTATION_ORIENTATION_CONTRACT).toBe(DESK_INNER_WORKSTATION_ORIENTATION_MODE);
    expect(DESK_PERIPHERAL_VISIBILITY_MODE).toBe("keyboard-mouse-readable");
    expect(SCENE_PERIPHERAL_VISIBILITY_CONTRACT).toBe(DESK_PERIPHERAL_VISIBILITY_MODE);
    expect(DESK_LABEL_OCCLUSION_MODE).toBe("monitor-corner-badge-clear");
    expect(SCENE_LABEL_OCCLUSION_CONTRACT).toBe(DESK_LABEL_OCCLUSION_MODE);
    expect(DESK_SURFACE_ASPECT_RATIO).toBeGreaterThan(2.6);
    expect(SCENE_WORKSTATION_DESK_ASPECT_CONTRACT).toBe(DESK_SURFACE_ASPECT_RATIO);
  });

  it("declares the repo-local Kenney asset strategy and metadata", () => {
    expect(OFFICE_ASSET_STRATEGY).toBe("kenney-obj-local-fallback");
    expect(OFFICE_ASSET_SOURCE).toBe("kenney-furniture-kit-cc0");
    expect(OFFICE_ASSET_MODEL_COUNT).toBe(9);
    expect(OFFICE_ASSET_LICENSE_PATH.endsWith("/office-assets/kenney/licenses/Kenney-Furniture-Kit-CC0.txt")).toBe(true);
    expect(OFFICE_ASSET_PROVENANCE_PATH.endsWith("/office-assets/kenney/provenance.json")).toBe(true);
    expect(OFFICE_AVATAR_PREVIEW_MODE).toBe("poly-pizza-hyper-casual-preview");
    expect(OFFICE_AVATAR_PREVIEW_SOURCE).toBe("poly-pizza-hyper-casual-character-cc-by-3.0");
    expect(OFFICE_AVATAR_PREVIEW_MODEL_COUNT).toBe(4);
    expect(
      OFFICE_AVATAR_PREVIEW_LICENSE_PATH.endsWith(
        "/office-assets/poly-pizza-hyper-casual-preview/licenses/Creative-Commons-Attribution-3.0.txt",
      ),
    ).toBe(true);
    expect(OFFICE_AVATAR_PREVIEW_PROVENANCE_PATH.endsWith("/office-assets/poly-pizza-hyper-casual-preview/provenance.json")).toBe(true);
    expect(SCENE_AVATAR_PREVIEW_CONTRACT).toBe("preview-hyper-casual-cc-by-avatar");
    expect(SCENE_AVATAR_PREVIEW_SOURCE).toBe("poly-pizza-hyper-casual-local-preview");
    expect(SCENE_AVATAR_PLACEMENT_CONTRACT).toBe("seated-behind-desk-facing-monitor");
    expect(AVATAR_DEMO_STAGE_MARKER).toBe("office-avatar-visibility-demo-v1");
    expect(AVATAR_DEMO_STAGE_MODE).toBe("hero-plus-desk-cluster");
    expect(AVATAR_DEMO_STAGE_COUNT).toBe(5);
  });

  it("pins the WorkAdventure preview asset contract and map stats", () => {
    expect(WORKADVENTURE_PREVIEW_MODE).toBe("workadventure-office-map-preview");
    expect(WORKADVENTURE_PREVIEW_SOURCE).toBe("official-workadventure-map-starter-kit");
    expect(WORKADVENTURE_PREVIEW_LICENSE_SCOPE).toBe("workadventure-map-only");
    expect(WORKADVENTURE_PREVIEW_TILESET_COUNT).toBe(10);
    expect(WORKADVENTURE_PREVIEW_ZONE_NAMES).toContain("jitsiMeetingRoom");
    expect(WORKADVENTURE_PREVIEW_ZONE_NAMES).toContain("silentZone");
    expect(WORKADVENTURE_PREVIEW_STATS.mapWidthTiles).toBe(31);
    expect(WORKADVENTURE_PREVIEW_STATS.mapHeightTiles).toBe(21);
    expect(WORKADVENTURE_PREVIEW_STATS.visibleTileLayerCount).toBe(11);
    expect(WORKADVENTURE_PREVIEW_STATS.walkableTileCount).toBe(366);
    expect(WORKADVENTURE_PREVIEW_STATS.collisionTileCount).toBe(285);
    expect(WORKADVENTURE_PREVIEW_STATS.interactionZoneCount).toBe(7);
    expect(WORKADVENTURE_PREVIEW_STATS.reusableAvatarCount).toBe(4);
    expect(WORKADVENTURE_PREVIEW_ASSET_LICENSE_PATH.endsWith("/office-assets/workadventure-preview/licenses/LICENSE.assets")).toBe(true);
    expect(WORKADVENTURE_PREVIEW_MAP_LICENSE_PATH.endsWith("/office-assets/workadventure-preview/licenses/LICENSE.map")).toBe(true);
    expect(WORKADVENTURE_PREVIEW_MAP_PATH.endsWith("/office-assets/workadventure-preview/map/office.tmj")).toBe(true);
    expect(WORKADVENTURE_PREVIEW_PROVENANCE_PATH.endsWith("/office-assets/workadventure-preview/provenance.json")).toBe(true);
  });

  it("pins the official WorkAdventure Woka runtime subset contract", () => {
    expect(WORKADVENTURE_WOKA_MODE).toBe("workadventure-runtime-woka-subset");
    expect(WORKADVENTURE_WOKA_SOURCE).toBe("official-workadventure-runtime");
    expect(WORKADVENTURE_WOKA_LICENSE_SCOPE).toBe("workadventure-runtime-demo-only");
    expect(WORKADVENTURE_WOKA_SUBSET_COUNT).toBe(4);
    expect(WORKADVENTURE_WOKA_SPRITE_WIDTH).toBe(32);
    expect(WORKADVENTURE_WOKA_SPRITE_HEIGHT).toBe(32);
    expect(WORKADVENTURE_WOKA_SHEET_WIDTH).toBe(96);
    expect(WORKADVENTURE_WOKA_SHEET_HEIGHT).toBe(128);
    expect(WORKADVENTURE_WOKA_LICENSE_PATH.endsWith("/office-assets/workadventure-woka-subset/licenses/WORKADVENTURE-play-LICENSE.txt")).toBe(true);
    expect(WORKADVENTURE_WOKA_PIPOYA_ATTRIBUTION_PATH.endsWith("/office-assets/workadventure-woka-subset/licenses/pipoya-about.txt")).toBe(true);
    expect(WORKADVENTURE_WOKA_PROVENANCE_PATH.endsWith("/office-assets/workadventure-woka-subset/provenance.json")).toBe(true);
  });

  it("pins the approved custom WorkAdventure background contract", () => {
    expect(WORKADVENTURE_CUSTOM_BACKGROUND_MODE).toBe("custom-generated-office-background");
    expect(WORKADVENTURE_CUSTOM_BACKGROUND_SOURCE).toBe("approved-user-generated-office-2026-05-12");
    expect(WORKADVENTURE_CUSTOM_BACKGROUND_DIMENSIONS.width).toBe(1264);
    expect(WORKADVENTURE_CUSTOM_BACKGROUND_DIMENSIONS.height).toBe(848);
    expect(WORKADVENTURE_CUSTOM_BACKGROUND_IMAGE_PATH.endsWith("/office-assets/workadventure-custom-background/generated-office-2026-05-12-1420.jpg")).toBe(true);
    expect(WORKADVENTURE_CUSTOM_BACKGROUND_PROVENANCE_PATH.endsWith("/office-assets/workadventure-custom-background/provenance.json")).toBe(true);
    expect(WORKADVENTURE_VISIBLE_LOUNGE_RECT.left).toBeGreaterThan(0.66);
    expect(WORKADVENTURE_VISIBLE_LOUNGE_RECT.top).toBeGreaterThan(0.58);
    expect(WORKADVENTURE_REST_SAFE_RECT.left).toBeGreaterThan(WORKADVENTURE_VISIBLE_LOUNGE_RECT.left);
    expect(WORKADVENTURE_REST_SAFE_RECT.top).toBeGreaterThan(WORKADVENTURE_VISIBLE_LOUNGE_RECT.top);
  });

  it("caps visible task blocks", () => {
    expect(MAX_VISIBLE_TASK_BLOCKS).toBe(4);
    expect(capVisibleTaskBlocks(0)).toBe(0);
    expect(capVisibleTaskBlocks(2)).toBe(2);
    expect(capVisibleTaskBlocks(99)).toBe(4);
  });

  it("exposes the required status visual mapping", () => {
    expect(Object.keys(STATUS_VISUALS).sort()).toEqual(["busy", "error", "idle", "offline"]);
    expect(STATUS_VISUALS.idle.lampColor).toBe("#72dcff");
    expect(STATUS_VISUALS.busy.monitorIntensity).toBeGreaterThan(STATUS_VISUALS.idle.monitorIntensity);
    expect(STATUS_VISUALS.offline.monitorIntensity).toBe(0);
    expect(STATUS_VISUALS.error.lampBlink).toBe(true);
  });

  it("keeps all desks facing the camera-side monitor front", () => {
    expect(new Set(FIXED_WORKSTATION_SLOTS.map((slot) => slot.facing))).toEqual(new Set([0]));
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

  it("routes busy/error agents to work and idle/offline agents to rest for WorkAdventure mode", () => {
    const placement = assignAgentsToWorkAdventureZones([
      {
        id: "busy-1",
        name: "busy-1",
        status: "busy",
        taskCount: 2,
        currentTask: "Work",
        errorMessage: null,
        updatedAt: "2026-05-12T10:00:00Z",
      },
      {
        id: "idle-1",
        name: "idle-1",
        status: "idle",
        taskCount: 0,
        currentTask: null,
        errorMessage: null,
        updatedAt: "2026-05-12T10:00:00Z",
      },
      {
        id: "error-1",
        name: "error-1",
        status: "error",
        taskCount: 1,
        currentTask: "Recover",
        errorMessage: "Timeout",
        updatedAt: "2026-05-12T10:00:00Z",
      },
      {
        id: "offline-1",
        name: "offline-1",
        status: "offline",
        taskCount: 0,
        currentTask: null,
        errorMessage: null,
        updatedAt: "2026-05-12T10:00:00Z",
      },
    ]);

    expect(placement.workAssignments).toHaveLength(2);
    expect(placement.workAssignments[0]?.agent.id).toBe("busy-1");
    expect(placement.workAssignments[1]?.agent.id).toBe("error-1");
    expect(placement.workAssignments.every((assignment) => assignment.placementKind === "work")).toBe(true);
    expect(placement.workAssignments.every((assignment) => assignment.agent.status === "busy" || assignment.agent.status === "error")).toBe(true);
    expect(placement.restAssignments.map((assignment) => assignment.agent.id)).toEqual(["idle-1", "offline-1"]);
    expect(placement.restAssignments.every((assignment) => assignment.placementKind === "rest")).toBe(true);
    expect(placement.restAssignments.every((assignment) => assignment.agent.status === "idle" || assignment.agent.status === "offline")).toBe(true);
    expect(placement.workOverflowCount).toBe(0);
    expect(placement.restOverflowCount).toBe(0);
  });

  it("generates overflow markers instead of dropping extra work and rest agents", () => {
    const agents = Array.from({ length: 22 }, (_, index) => ({
      id: `agent-${index + 1}`,
      name: `agent-${index + 1}`,
      status: index < 15 ? ("busy" as const) : index < 17 ? ("error" as const) : index % 2 === 0 ? ("idle" as const) : ("offline" as const),
      taskCount: index % 4,
      currentTask: index < 17 ? `Task ${index + 1}` : null,
      errorMessage: index >= 15 && index < 17 ? "Recover" : null,
      updatedAt: "2026-05-12T10:00:00Z",
    }));

    const placement = assignAgentsToWorkAdventureZones(agents);

    expect(placement.workAssignments).toHaveLength(17);
    expect(placement.restAssignments).toHaveLength(5);
    expect(placement.workOverflowCount).toBe(5);
    expect(placement.restOverflowCount).toBe(1);
    expect(placement.workAssignments.filter((assignment) => assignment.overflow)).toHaveLength(5);
    expect(placement.restAssignments.filter((assignment) => assignment.overflow)).toHaveLength(1);
    expect(placement.workAssignments.every((assignment) => assignment.marker.zoneId !== "lounge-silent-zone")).toBe(true);
    expect(placement.restAssignments.every((assignment) => assignment.marker.zoneId === "lounge-silent-zone")).toBe(true);
    expect(placement.workAssignments.at(-1)?.marker.markerKind).toBe("overflow");
    expect(placement.restAssignments.at(-1)?.marker.markerKind).toBe("overflow");
  });

  it("keeps every rest marker inside the stricter visible lounge rect with compact row-aware labels", () => {
    const agents = Array.from({ length: 7 }, (_, index) => ({
      id: `rest-${index + 1}`,
      name: `rest-${index + 1}`,
      status: index < 5 ? ("idle" as const) : ("offline" as const),
      taskCount: 0,
      currentTask: null,
      errorMessage: null,
      updatedAt: "2026-05-12T10:00:00Z",
    }));

    const placement = assignAgentsToWorkAdventureZones(agents);

    expect(placement.restAssignments).toHaveLength(7);
    expect(placement.restOverflowCount).toBe(3);
    expect(placement.restAssignments.every((assignment) => assignment.marker.zoneId === "lounge-silent-zone")).toBe(true);
    expect(placement.restAssignments.every((assignment) => assignment.marker.left >= WORKADVENTURE_VISIBLE_LOUNGE_RECT.left)).toBe(true);
    expect(
      placement.restAssignments.every(
        (assignment) => assignment.marker.left <= WORKADVENTURE_VISIBLE_LOUNGE_RECT.left + WORKADVENTURE_VISIBLE_LOUNGE_RECT.width,
      ),
    ).toBe(true);
    expect(placement.restAssignments.every((assignment) => assignment.marker.top >= WORKADVENTURE_VISIBLE_LOUNGE_RECT.top)).toBe(true);
    expect(
      placement.restAssignments.every(
        (assignment) => assignment.marker.top <= WORKADVENTURE_VISIBLE_LOUNGE_RECT.top + WORKADVENTURE_VISIBLE_LOUNGE_RECT.height,
      ),
    ).toBe(true);
    expect(placement.restAssignments.filter((assignment) => assignment.overflow).every((assignment) => assignment.marker.left >= WORKADVENTURE_REST_SAFE_RECT.left)).toBe(true);
    expect(placement.restAssignments.some((assignment) => assignment.marker.nameplateSide === "above")).toBe(true);
    expect(placement.restAssignments.some((assignment) => assignment.marker.nameplateSide === "below")).toBe(true);
  });
});
