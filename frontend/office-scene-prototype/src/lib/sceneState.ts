import type { AgentVisualState } from "../agentVisualState";
import { FIXED_WORKSTATION_SLOTS, MAX_VISIBLE_TASK_BLOCKS } from "../config/workstationSlots";
import {
  type WorkAdventureMarker,
  WORKADVENTURE_REST_SAFE_RECT,
  WORKADVENTURE_FIXED_DESK_MARKERS,
  WORKADVENTURE_FIXED_LOUNGE_MARKERS,
  WORKADVENTURE_REST_ZONE_IDS,
  WORKADVENTURE_WORK_ZONE_IDS,
} from "../config/workAdventureLayout";
import { WORKADVENTURE_PREVIEW_OFFICE_ZONES } from "../data/workAdventurePreviewCatalog";

export type DeskAssignment = {
  slotId: string;
  agent: AgentVisualState | null;
};

export type WorkAdventureAgentPlacementKind = "work" | "rest";

export type WorkAdventureAgentPlacement = {
  slotId: string;
  agent: AgentVisualState;
  marker: WorkAdventureMarker;
  placementKind: WorkAdventureAgentPlacementKind;
  markerIndex: number;
  overflow: boolean;
};

export type WorkAdventurePlacement = {
  workAssignments: WorkAdventureAgentPlacement[];
  restAssignments: WorkAdventureAgentPlacement[];
  workOverflowCount: number;
  restOverflowCount: number;
};

export function capVisibleTaskBlocks(taskCount: number): number {
  if (!Number.isFinite(taskCount) || taskCount <= 0) {
    return 0;
  }
  return Math.min(Math.trunc(taskCount), MAX_VISIBLE_TASK_BLOCKS);
}

export function assignAgentsToFixedDesks(agents: AgentVisualState[]): DeskAssignment[] {
  return FIXED_WORKSTATION_SLOTS.map((slot, index) => ({
    slotId: slot.id,
    agent: agents[index] ?? null,
  }));
}

type WorkAdventureZoneRect = {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

const WORKADVENTURE_ZONE_RECT_BY_ID = new Map<string, WorkAdventureZoneRect>(
  WORKADVENTURE_PREVIEW_OFFICE_ZONES.map((zone) => [zone.id, zone]),
);

function getZoneRect(zoneId: string): WorkAdventureZoneRect {
  const zone = WORKADVENTURE_ZONE_RECT_BY_ID.get(zoneId);
  if (!zone) {
    throw new Error(`Unknown WorkAdventure zone: ${zoneId}`);
  }
  return zone;
}

function clampToZone(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createOverflowMarker(
  index: number,
  zoneId: string,
  columnCount: number,
  rowGap: number,
  leftPadding: number,
  rightPadding: number,
  topPadding: number,
  bottomPadding: number,
  labelDirection: 1 | -1,
  fixedTopDirection?: "down" | "up",
): WorkAdventureMarker {
  const zone = zoneId === "lounge-silent-zone" ? { id: zoneId, ...WORKADVENTURE_REST_SAFE_RECT } : getZoneRect(zoneId);
  const safeLeft = zone.left + leftPadding;
  const safeRight = zone.left + zone.width - rightPadding;
  const safeTop = zone.top + topPadding;
  const safeBottom = zone.top + zone.height - bottomPadding;
  const row = Math.floor(index / columnCount);
  const column = index % columnCount;
  const horizontalStep = columnCount > 1 ? (safeRight - safeLeft) / (columnCount - 1) : 0;
  const left = clampToZone(safeLeft + column * horizontalStep, safeLeft, safeRight);
  const top = clampToZone(safeTop + row * rowGap, safeTop, safeBottom);
  const labelPhase = row % 2 === 0 ? 1 : -1;

  return {
    left,
    top,
    zoneId,
    labelOffsetX: (column - (columnCount - 1) / 2) * 4 * labelDirection,
    hangerOffsetX: labelPhase * 6,
    markerKind: "overflow",
    nameplateSide: fixedTopDirection === "up" || top > zone.top + zone.height * 0.55 ? "above" : "below",
  };
}

function buildOverflowMarkers(
  count: number,
  zoneIds: readonly string[],
  options: {
    columnCount: number;
    rowGap: number;
    leftPadding: number;
    rightPadding: number;
    topPadding: number;
    bottomPadding: number;
    labelDirection: 1 | -1;
    fixedTopDirection?: "down" | "up";
  },
): WorkAdventureMarker[] {
  const overflowMarkers: WorkAdventureMarker[] = [];
  for (let index = 0; index < count; index += 1) {
    const zoneCount = zoneIds.length;
    const zoneId = zoneIds[index % zoneCount] ?? zoneIds[0];
    const perZoneIndex = Math.floor(index / zoneCount);
    overflowMarkers.push(
      createOverflowMarker(
        perZoneIndex,
        zoneId,
        options.columnCount,
        options.rowGap,
        options.leftPadding,
        options.rightPadding,
        options.topPadding,
        options.bottomPadding,
        options.labelDirection,
        options.fixedTopDirection,
      ),
    );
  }
  return overflowMarkers;
}

function buildWorkAdventurePlacements(
  agents: AgentVisualState[],
  fixedMarkers: readonly WorkAdventureMarker[],
  placementKind: WorkAdventureAgentPlacementKind,
  overflowZoneIds: readonly string[],
): WorkAdventureAgentPlacement[] {
  const overflowCount = Math.max(agents.length - fixedMarkers.length, 0);
  const restFixedRows = placementKind === "rest" ? Math.ceil(fixedMarkers.length / 4) : 0;
  const overflowMarkers =
    placementKind === "work"
      ? buildOverflowMarkers(overflowCount, overflowZoneIds, {
          columnCount: 1,
          rowGap: 0.09,
          leftPadding: 0.07,
          rightPadding: 0.07,
          topPadding: 0.07,
          bottomPadding: 0.05,
          labelDirection: 1,
        })
      : buildOverflowMarkers(overflowCount, overflowZoneIds, {
          columnCount: 3,
          rowGap: 0.088,
          leftPadding: 0.012,
          rightPadding: 0.012,
          topPadding: 0.014 + restFixedRows * 0.088,
          bottomPadding: 0.016,
          labelDirection: -1,
          fixedTopDirection: "down",
        });

  return agents.map((agent, index) => {
    const marker = fixedMarkers[index] ?? overflowMarkers[index - fixedMarkers.length];
    return {
      slotId: `${placementKind}-${index + 1}`,
      agent,
      marker,
      placementKind,
      markerIndex: index,
      overflow: index >= fixedMarkers.length,
    };
  });
}

export function assignAgentsToWorkAdventureZones(agents: AgentVisualState[]): WorkAdventurePlacement {
  const workAssignments = agents.filter((agent) => agent.status === "busy" || agent.status === "error");
  const restAssignments = agents.filter((agent) => agent.status !== "busy" && agent.status !== "error");

  return {
    workAssignments: buildWorkAdventurePlacements(
      workAssignments,
      WORKADVENTURE_FIXED_DESK_MARKERS,
      "work",
      WORKADVENTURE_WORK_ZONE_IDS,
    ),
    restAssignments: buildWorkAdventurePlacements(
      restAssignments,
      WORKADVENTURE_FIXED_LOUNGE_MARKERS,
      "rest",
      WORKADVENTURE_REST_ZONE_IDS,
    ),
    workOverflowCount: Math.max(workAssignments.length - WORKADVENTURE_FIXED_DESK_MARKERS.length, 0),
    restOverflowCount: Math.max(restAssignments.length - WORKADVENTURE_FIXED_LOUNGE_MARKERS.length, 0),
  };
}

export function findAgentById(agents: AgentVisualState[], agentId: string | null): AgentVisualState | null {
  if (!agentId) {
    return null;
  }
  return agents.find((agent) => agent.id === agentId) ?? null;
}
