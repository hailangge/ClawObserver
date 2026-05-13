import type { CSSProperties } from "react";
import type { AgentVisualState, SceneSummary } from "../agentVisualState";
import { assignAgentsToWorkAdventureZones, capVisibleTaskBlocks } from "../lib/sceneState";
import {
  WORKADVENTURE_FIXED_DESK_MARKERS,
  WORKADVENTURE_FIXED_LOUNGE_MARKERS,
  WORKADVENTURE_REST_SAFE_RECT,
  WORKADVENTURE_VISIBLE_LOUNGE_RECT,
} from "../config/workAdventureLayout";
import {
  WORKADVENTURE_PREVIEW_ASSET_LICENSE_PATH,
  WORKADVENTURE_PREVIEW_LICENSE_SCOPE,
  WORKADVENTURE_PREVIEW_MAP_LICENSE_PATH,
  WORKADVENTURE_PREVIEW_MAP_PATH,
  WORKADVENTURE_PREVIEW_MODE,
  WORKADVENTURE_PREVIEW_OFFICE_ZONES,
  WORKADVENTURE_PREVIEW_PROVENANCE_PATH,
  WORKADVENTURE_PREVIEW_SOURCE,
  WORKADVENTURE_PREVIEW_STATS,
  WORKADVENTURE_PREVIEW_THUMBNAIL_PATH,
  WORKADVENTURE_PREVIEW_TILESET_COUNT,
} from "../data/workAdventurePreviewCatalog";
import {
  WORKADVENTURE_WOKA_LICENSE_PATH,
  WORKADVENTURE_WOKA_LICENSE_SCOPE,
  WORKADVENTURE_WOKA_MODE,
  WORKADVENTURE_WOKA_MODELS,
  WORKADVENTURE_WOKA_PIPOYA_ATTRIBUTION_PATH,
  WORKADVENTURE_WOKA_PROVENANCE_PATH,
  WORKADVENTURE_WOKA_SOURCE,
  WORKADVENTURE_WOKA_SPRITE_HEIGHT,
  WORKADVENTURE_WOKA_SPRITE_WIDTH,
  WORKADVENTURE_WOKA_SUBSET_COUNT,
  type WorkAdventureWokaKey,
} from "../data/workAdventureWokaCatalog";
import {
  WORKADVENTURE_CUSTOM_BACKGROUND_DIMENSIONS,
  WORKADVENTURE_CUSTOM_BACKGROUND_IMAGE_PATH,
  WORKADVENTURE_CUSTOM_BACKGROUND_MODE,
  WORKADVENTURE_CUSTOM_BACKGROUND_PROVENANCE_PATH,
  WORKADVENTURE_CUSTOM_BACKGROUND_SOURCE,
} from "../data/workAdventureCustomBackgroundCatalog";

type WorkAdventureSceneProps = {
  agents: AgentVisualState[];
  summary: SceneSummary | null;
  hoveredAgentId: string | null;
  selectedAgentId: string | null;
  onHover: (agentId: string | null) => void;
  onSelect: (agentId: string | null) => void;
};

const WOKA_SEQUENCE: readonly WorkAdventureWokaKey[] = ["male1", "female1", "male11", "female6"] as const;

const STATUS_BADGES = {
  idle: { label: "Idle", short: "ID", color: "#7ce2b0", glow: "rgba(124, 226, 176, 0.28)" },
  busy: { label: "Busy", short: "BZ", color: "#79cfff", glow: "rgba(121, 207, 255, 0.3)" },
  error: { label: "Error", short: "ER", color: "#ff8f8f", glow: "rgba(255, 143, 143, 0.32)" },
  offline: { label: "Offline", short: "OF", color: "#96a5b8", glow: "rgba(150, 165, 184, 0.26)" },
} as const;

function resolveWoka(agentId: string, index: number) {
  const key = WOKA_SEQUENCE[(Math.abs(hashCode(agentId)) + index) % WOKA_SEQUENCE.length];
  return WORKADVENTURE_WOKA_MODELS[key];
}

function hashCode(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

function formatDeskLane(agent: AgentVisualState | null, index: number) {
  if (!agent) {
    return `Desk ${index + 1}`;
  }
  return agent.deskLabel ?? `Desk ${index + 1}`;
}

function buildAgentNameplateLabel(agent: AgentVisualState | null) {
  if (!agent) {
    return "Awaiting worker";
  }
  return `${agent.name}(${Math.max(0, Math.trunc(agent.taskCount))})`;
}

export function WorkAdventureScene({
  agents,
  summary,
  hoveredAgentId,
  selectedAgentId,
  onHover,
  onSelect,
}: WorkAdventureSceneProps) {
  const { workAssignments, restAssignments } = assignAgentsToWorkAdventureZones(agents);
  const activeOccupantCount = workAssignments.length;
  const busyOccupantCount = workAssignments.filter((assignment) => assignment.agent.status === "busy").length;
  const restOccupantCount = restAssignments.length;
  const renderedAgentCount = workAssignments.length + restAssignments.length;
  const renderedOverflowCount = workAssignments.filter((assignment) => assignment.overflow).length +
    restAssignments.filter((assignment) => assignment.overflow).length;

  return (
    <div
      className="wa-scene-root"
      data-scene-root
      data-scene-kind="workadventure-primary"
      data-scene-renderer-mode="workadventure"
      data-scene-primary-mode="workadventure"
      data-scene-legacy-mode="legacy-3d"
      data-scene-desk-count="12"
      data-scene-has-status-board="true"
      data-scene-has-lounge="true"
      data-scene-style-profile="workadventure-embedded-ops-office"
      data-scene-style-reference="official-workadventure-office-embed"
      data-scene-label-orientation="screen-space-card"
      data-scene-label-layer="desk-nameplate-hanging-card"
      data-scene-label-plate="opaque-high-contrast"
      data-scene-structural-opacity="opaque"
      data-scene-overhead-sightline="clear-2d-office-grid"
      data-scene-front-label-lane-clearance="stable-work-rest-nameplate-lane"
      data-scene-workstation-orientation="all-desks-face-camera"
      data-scene-monitor-style="tile-office-nameplate-status"
      data-scene-label-hierarchy="compact-count-nameplate"
      data-scene-label-scale-hierarchy="single-line-count-nameplate-readable"
      data-scene-monitor-detail="status-badge-and-task-stack"
      data-scene-workstation-proportion="single-person-desk-areas"
      data-scene-desk-aspect="3.100"
      data-scene-inner-workstation-orientation="map-aligned-desk-clusters"
      data-scene-peripheral-visibility="custom-background-broader-workzones-readable"
      data-scene-label-occlusion="custom-background-unobstructed"
      data-scene-nameplate-format="agent-name-taskcount-compact"
      data-scene-nameplate-min-font-px="13"
      data-scene-asset-strategy="workadventure-tilemap-runtime-subset"
      data-scene-asset-source={WORKADVENTURE_PREVIEW_SOURCE}
      data-scene-license-path={WORKADVENTURE_PREVIEW_ASSET_LICENSE_PATH}
      data-scene-provenance-path={WORKADVENTURE_PREVIEW_PROVENANCE_PATH}
      data-scene-woka-mode={WORKADVENTURE_WOKA_MODE}
      data-scene-woka-source={WORKADVENTURE_WOKA_SOURCE}
      data-scene-woka-license-scope={WORKADVENTURE_WOKA_LICENSE_SCOPE}
      data-scene-woka-license-path={WORKADVENTURE_WOKA_LICENSE_PATH}
      data-scene-woka-pipoya-attribution-path={WORKADVENTURE_WOKA_PIPOYA_ATTRIBUTION_PATH}
      data-scene-woka-provenance-path={WORKADVENTURE_WOKA_PROVENANCE_PATH}
      data-scene-woka-subset-count={String(WORKADVENTURE_WOKA_SUBSET_COUNT)}
      data-scene-map-mode={WORKADVENTURE_PREVIEW_MODE}
      data-scene-map-source={WORKADVENTURE_PREVIEW_SOURCE}
      data-scene-map-license-scope={WORKADVENTURE_PREVIEW_LICENSE_SCOPE}
      data-scene-map-license-path={WORKADVENTURE_PREVIEW_ASSET_LICENSE_PATH}
      data-scene-map-map-license-path={WORKADVENTURE_PREVIEW_MAP_LICENSE_PATH}
      data-scene-map-path={WORKADVENTURE_PREVIEW_MAP_PATH}
      data-scene-map-thumbnail-path={WORKADVENTURE_PREVIEW_THUMBNAIL_PATH}
      data-scene-map-width={String(WORKADVENTURE_PREVIEW_STATS.mapWidthTiles)}
      data-scene-map-height={String(WORKADVENTURE_PREVIEW_STATS.mapHeightTiles)}
      data-scene-map-tile-size={String(WORKADVENTURE_PREVIEW_STATS.tileSize)}
      data-scene-map-zone-count={String(WORKADVENTURE_PREVIEW_STATS.officeZoneCount)}
      data-scene-map-tileset-count={String(WORKADVENTURE_PREVIEW_TILESET_COUNT)}
      data-scene-active-occupants={String(activeOccupantCount)}
      data-scene-busy-work-count={String(busyOccupantCount)}
      data-scene-rest-occupant-count={String(restOccupantCount)}
      data-scene-rendered-agent-count={String(renderedAgentCount)}
      data-scene-input-agent-count={String(agents.length)}
      data-scene-overflow-agent-count={String(renderedOverflowCount)}
      data-scene-work-zone-count={String(WORKADVENTURE_FIXED_DESK_MARKERS.length)}
      data-scene-rest-zone-count={String(WORKADVENTURE_FIXED_LOUNGE_MARKERS.length)}
      data-scene-visible-lounge-left={String(WORKADVENTURE_VISIBLE_LOUNGE_RECT.left)}
      data-scene-visible-lounge-top={String(WORKADVENTURE_VISIBLE_LOUNGE_RECT.top)}
      data-scene-visible-lounge-width={String(WORKADVENTURE_VISIBLE_LOUNGE_RECT.width)}
      data-scene-visible-lounge-height={String(WORKADVENTURE_VISIBLE_LOUNGE_RECT.height)}
      data-scene-rest-safe-left={String(WORKADVENTURE_REST_SAFE_RECT.left)}
      data-scene-rest-safe-top={String(WORKADVENTURE_REST_SAFE_RECT.top)}
      data-scene-rest-safe-width={String(WORKADVENTURE_REST_SAFE_RECT.width)}
      data-scene-rest-safe-height={String(WORKADVENTURE_REST_SAFE_RECT.height)}
      data-scene-background-mode={WORKADVENTURE_CUSTOM_BACKGROUND_MODE}
      data-scene-background-source={WORKADVENTURE_CUSTOM_BACKGROUND_SOURCE}
      data-scene-background-image-path={WORKADVENTURE_CUSTOM_BACKGROUND_IMAGE_PATH}
      data-scene-background-provenance-path={WORKADVENTURE_CUSTOM_BACKGROUND_PROVENANCE_PATH}
      data-scene-background-width={String(WORKADVENTURE_CUSTOM_BACKGROUND_DIMENSIONS.width)}
      data-scene-background-height={String(WORKADVENTURE_CUSTOM_BACKGROUND_DIMENSIONS.height)}
      data-scene-background-aspect={String(WORKADVENTURE_CUSTOM_BACKGROUND_DIMENSIONS.aspectRatio)}
      data-scene-placement-contract="busy-work-idle-rest"
      data-scene-runtime-status={summary?.captureStatus ?? "waiting"}
    >
      <div className="wa-scene-headerband">
        <div className="wa-scene-headercopy">
          <p className="eyebrow">Primary renderer</p>
          <h3>Embedded WorkAdventure office</h3>
          <p>
            Live desk occupancy, status badges, readable single-person nameplates, and interaction lanes derived from
            the current `AgentVisualState[]` payload.
          </p>
        </div>
        <div className="wa-scene-runtimeboard" data-status-board data-runtime-status={summary?.captureStatus ?? "waiting"}>
          <strong>Global status</strong>
          <span>{summary?.captureStatus ?? "waiting"}</span>
          <span>{summary ? `${summary.activeSessions} active sessions` : "Awaiting runtime"}</span>
          <span>{summary ? `${summary.queueDepth} pending queue` : "Queue unavailable"}</span>
        </div>
      </div>
      <div className="wa-scene-map-shell">
        <div className="wa-scene-map">
          <img
            className="wa-scene-map-image"
            src={WORKADVENTURE_CUSTOM_BACKGROUND_IMAGE_PATH}
            alt="Custom office background for the WorkAdventure realtime scene"
          />
          <div className="wa-scene-map-tint" aria-hidden="true" />
          {WORKADVENTURE_PREVIEW_OFFICE_ZONES.map((zone) => (
            <div
              key={zone.id}
              className="wa-scene-zone"
              data-wa-scene-zone
              data-wa-scene-zone-id={zone.id}
              style={
                {
                  left: `${zone.left * 100}%`,
                  top: `${zone.top * 100}%`,
                  width: `${zone.width * 100}%`,
                  height: `${zone.height * 100}%`,
                  ["--wa-zone-accent" as "--wa-zone-accent"]: zone.accent,
                } as CSSProperties
              }
            >
              <span>{zone.label}</span>
            </div>
          ))}
          {workAssignments.map((assignment, index) => {
            const marker = assignment.marker;
            const agent = assignment.agent;
            const statusBadge = STATUS_BADGES[agent.status];
            const isHovered = hoveredAgentId === agent.id;
            const isSelected = selectedAgentId === agent.id;
            const woka = resolveWoka(agent.id, index);
            const visibleTaskBlocks = capVisibleTaskBlocks(agent.taskCount);

            return (
              <button
                key={assignment.slotId}
                type="button"
                className={`wa-scene-desk${assignment.overflow ? " is-overflow" : ""}${isHovered ? " is-hovered" : ""}${isSelected ? " is-selected" : ""}`}
                data-wa-scene-desk
                data-wa-scene-desk-id={assignment.slotId}
                data-wa-scene-desk-status={agent.status}
                data-wa-scene-desk-zone={marker.zoneId}
                data-wa-scene-agent-id={agent.id}
                data-wa-scene-placement="work"
                data-wa-scene-marker-kind={marker.markerKind}
                data-wa-scene-overflow={assignment.overflow ? "true" : "false"}
                data-wa-scene-desk-label={formatDeskLane(agent, index)}
                data-wa-scene-name={agent.name}
                data-wa-scene-nameplate-text={buildAgentNameplateLabel(agent)}
                onMouseEnter={() => onHover(agent.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(agent.id)}
                onBlur={() => onHover(null)}
                onClick={() => onSelect(agent.id)}
                style={
                  {
                    left: `${marker.left * 100}%`,
                    top: `${marker.top * 100}%`,
                    ["--wa-label-offset-x" as "--wa-label-offset-x"]: `${marker.labelOffsetX}px`,
                    ["--wa-hanger-offset-x" as "--wa-hanger-offset-x"]: `${marker.hangerOffsetX}px`,
                  } as CSSProperties
                }
              >
                <span className="wa-scene-desk-hanger">{formatDeskLane(agent, index)}</span>
                <span className="wa-scene-desk-nameplate">{buildAgentNameplateLabel(agent)}</span>
                <span
                  className="wa-scene-status-badge"
                  style={
                    {
                      ["--wa-status-color" as "--wa-status-color"]: statusBadge.color,
                      ["--wa-status-glow" as "--wa-status-glow"]: statusBadge.glow,
                    } as CSSProperties
                  }
                >
                  {statusBadge.short}
                </span>
                <span className="wa-scene-task-stack" aria-hidden="true">
                  {Array.from({ length: Math.max(visibleTaskBlocks, 1) }, (_, stackIndex) => (
                    <i key={stackIndex} data-active={stackIndex < visibleTaskBlocks ? "true" : "false"} />
                  ))}
                </span>
                <span
                  className="wa-scene-woka"
                  data-wa-scene-woka
                  data-wa-scene-woka-id={woka.key}
                  style={
                    {
                      ["--wa-woka-url" as "--wa-woka-url"]: `url("${woka.spritePath}")`,
                      ["--wa-woka-frame-width" as "--wa-woka-frame-width"]: `${WORKADVENTURE_WOKA_SPRITE_WIDTH}px`,
                      ["--wa-woka-frame-height" as "--wa-woka-frame-height"]: `${WORKADVENTURE_WOKA_SPRITE_HEIGHT}px`,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                />
              </button>
            );
          })}
          {restAssignments.map((assignment, index) => {
            const marker = assignment.marker;
            const agent = assignment.agent;
            const statusBadge = STATUS_BADGES[agent.status];
            const woka = resolveWoka(agent.id, index);
            const isHovered = hoveredAgentId === agent.id;
            const isSelected = selectedAgentId === agent.id;

            return (
              <button
                key={assignment.slotId}
                type="button"
                className={`wa-scene-lounge-badge${assignment.overflow ? " is-overflow" : ""}${isHovered ? " is-hovered" : ""}${isSelected ? " is-selected" : ""}`}
                data-wa-scene-lounge
                data-wa-scene-placement="rest"
                data-wa-scene-rest-zone={marker.zoneId}
                data-wa-scene-agent-id={agent.id}
                data-wa-scene-desk-status={agent.status}
                data-wa-scene-marker-kind={marker.markerKind}
                data-wa-scene-overflow={assignment.overflow ? "true" : "false"}
                data-wa-scene-nameplate-side={marker.nameplateSide ?? "below"}
                data-wa-scene-name={agent.name}
                data-wa-scene-nameplate-text={buildAgentNameplateLabel(agent)}
                onMouseEnter={() => onHover(agent.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(agent.id)}
                onBlur={() => onHover(null)}
                onClick={() => onSelect(agent.id)}
                style={
                  {
                    left: `${marker.left * 100}%`,
                    top: `${marker.top * 100}%`,
                    ["--wa-label-offset-x" as "--wa-label-offset-x"]: `${marker.labelOffsetX}px`,
                    ["--wa-rest-nameplate-side" as "--wa-rest-nameplate-side"]: marker.nameplateSide ?? "below",
                    ["--wa-status-color" as "--wa-status-color"]: statusBadge.color,
                    ["--wa-status-glow" as "--wa-status-glow"]: statusBadge.glow,
                  } as CSSProperties
                }
              >
                <span className="wa-scene-lounge-halo" aria-hidden="true" />
                <span
                  className="wa-scene-woka wa-scene-woka--lounge"
                  data-wa-scene-woka
                  data-wa-scene-woka-id={woka.key}
                  style={
                    {
                      ["--wa-woka-url" as "--wa-woka-url"]: `url("${woka.spritePath}")`,
                      ["--wa-woka-frame-width" as "--wa-woka-frame-width"]: `${WORKADVENTURE_WOKA_SPRITE_WIDTH}px`,
                      ["--wa-woka-frame-height" as "--wa-woka-frame-height"]: `${WORKADVENTURE_WOKA_SPRITE_HEIGHT}px`,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                />
                <span className="wa-scene-lounge-nameplate">{buildAgentNameplateLabel(agent)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="wa-scene-legend">
        <span><i className="wa-scene-chip wa-scene-chip--desk" /> Live desk marker</span>
        <span><i className="wa-scene-chip wa-scene-chip--busy" /> Status badge</span>
        <span><i className="wa-scene-chip wa-scene-chip--zone" /> Interaction lane</span>
        <span><i className="wa-scene-chip wa-scene-chip--woka" /> Official Woka subset</span>
      </div>
    </div>
  );
}
