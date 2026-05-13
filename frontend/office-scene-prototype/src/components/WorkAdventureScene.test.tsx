import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WorkAdventureScene } from "./WorkAdventureScene";

vi.mock("../data/workAdventurePreviewCatalog", () => ({
  WORKADVENTURE_PREVIEW_ASSET_LICENSE_PATH: "/office-assets/workadventure-preview/licenses/LICENSE.assets",
  WORKADVENTURE_PREVIEW_LICENSE_SCOPE: "workadventure-map-only",
  WORKADVENTURE_PREVIEW_MAP_LICENSE_PATH: "/office-assets/workadventure-preview/licenses/LICENSE.map",
  WORKADVENTURE_PREVIEW_MAP_PATH: "/office-assets/workadventure-preview/map/office.tmj",
  WORKADVENTURE_PREVIEW_MODE: "workadventure-office-map-preview",
  WORKADVENTURE_PREVIEW_OFFICE_ZONES: [
    { id: "desk-bay-west", label: "Desk bay west", left: 0.09, top: 0.16, width: 0.38, height: 0.33, accent: "#4fd1ff" },
    { id: "desk-bay-east", label: "Desk bay east", left: 0.49, top: 0.15, width: 0.27, height: 0.33, accent: "#4fd1ff" },
    { id: "central-hotline", label: "Central hotline", left: 0.17, top: 0.43, width: 0.6, height: 0.24, accent: "#ffbd72" },
    { id: "lounge-silent-zone", label: "Lounge / silent zone", left: 0.67, top: 0.59, width: 0.28, height: 0.27, accent: "#8ae4b8" },
  ],
  WORKADVENTURE_PREVIEW_PROVENANCE_PATH: "/office-assets/workadventure-preview/provenance.json",
  WORKADVENTURE_PREVIEW_SOURCE: "official-workadventure-map-starter-kit",
  WORKADVENTURE_PREVIEW_STATS: {
    mapWidthTiles: 31,
    mapHeightTiles: 21,
    tileSize: 32,
    officeZoneCount: 4,
  },
  WORKADVENTURE_PREVIEW_THUMBNAIL_PATH: "/office-assets/workadventure-preview/map/office.png",
  WORKADVENTURE_PREVIEW_TILESET_COUNT: 10,
}));
vi.mock("../data/workAdventureCustomBackgroundCatalog", () => ({
  WORKADVENTURE_CUSTOM_BACKGROUND_DIMENSIONS: {
    width: 1264,
    height: 848,
    aspectRatio: 1264 / 848,
  },
  WORKADVENTURE_CUSTOM_BACKGROUND_IMAGE_PATH: "/office-assets/workadventure-custom-background/generated-office-2026-05-12-1420.jpg",
  WORKADVENTURE_CUSTOM_BACKGROUND_MODE: "custom-generated-office-background",
  WORKADVENTURE_CUSTOM_BACKGROUND_PROVENANCE_PATH: "/office-assets/workadventure-custom-background/provenance.json",
  WORKADVENTURE_CUSTOM_BACKGROUND_SOURCE: "approved-user-generated-office-2026-05-12",
}));

vi.mock("../data/workAdventureWokaCatalog", () => ({
  WORKADVENTURE_WOKA_LICENSE_PATH: "/office-assets/workadventure-woka-subset/licenses/WORKADVENTURE-play-LICENSE.txt",
  WORKADVENTURE_WOKA_LICENSE_SCOPE: "workadventure-runtime-demo-only",
  WORKADVENTURE_WOKA_MODE: "workadventure-runtime-woka-subset",
  WORKADVENTURE_WOKA_MODELS: {
    male1: { key: "male1", spritePath: "/male1.png" },
    female1: { key: "female1", spritePath: "/female1.png" },
    male11: { key: "male11", spritePath: "/male11.png" },
    female6: { key: "female6", spritePath: "/female6.png" },
  },
  WORKADVENTURE_WOKA_PIPOYA_ATTRIBUTION_PATH: "/office-assets/workadventure-woka-subset/licenses/pipoya-about.txt",
  WORKADVENTURE_WOKA_PROVENANCE_PATH: "/office-assets/workadventure-woka-subset/provenance.json",
  WORKADVENTURE_WOKA_SOURCE: "official-workadventure-runtime",
  WORKADVENTURE_WOKA_SPRITE_HEIGHT: 32,
  WORKADVENTURE_WOKA_SPRITE_WIDTH: 32,
  WORKADVENTURE_WOKA_SUBSET_COUNT: 4,
}));

describe("WorkAdventureScene", () => {
  it("publishes the custom background and renders every input agent in the correct zone", () => {
    const agents = [
      ...Array.from({ length: 13 }, (_, index) => ({
        id: `busy-${index + 1}`,
        name: `busy-${index + 1}`,
        status: (index === 12 ? "error" : "busy") as const,
        taskCount: (index % 4) + 1,
        currentTask: `Work item ${index + 1}`,
        errorMessage: index === 12 ? "Timed out" : null,
        updatedAt: "2026-05-11T09:30:00Z",
        deskLabel: `Desk ${index + 1}`,
      })),
      {
        id: "idle-1",
        name: "idle-1",
        status: "idle" as const,
        taskCount: 0,
        currentTask: null,
        errorMessage: null,
        updatedAt: "2026-05-11T09:31:00Z",
        deskLabel: "Lounge 1",
      },
      {
        id: "offline-1",
        name: "offline-1",
        status: "offline" as const,
        taskCount: 0,
        currentTask: null,
        errorMessage: null,
        updatedAt: "2026-05-11T09:31:00Z",
        deskLabel: "Lounge 2",
      },
      {
        id: "idle-2",
        name: "idle-2",
        status: "idle" as const,
        taskCount: 1,
        currentTask: "Watch queue",
        errorMessage: null,
        updatedAt: "2026-05-11T09:31:00Z",
        deskLabel: "Lounge 3",
      },
      {
        id: "offline-2",
        name: "offline-2",
        status: "offline" as const,
        taskCount: 0,
        currentTask: null,
        errorMessage: null,
        updatedAt: "2026-05-11T09:31:00Z",
        deskLabel: "Lounge 4",
      },
      {
        id: "idle-overflow",
        name: "idle-overflow",
        status: "idle" as const,
        taskCount: 0,
        currentTask: null,
        errorMessage: null,
        updatedAt: "2026-05-11T09:31:00Z",
        deskLabel: "Lounge 5",
      },
    ];

    const { container } = render(
      <WorkAdventureScene
        agents={agents}
        summary={null}
        hoveredAgentId={null}
        selectedAgentId={null}
        onHover={() => {}}
        onSelect={() => {}}
      />,
    );

    const root = container.querySelector("[data-scene-root]");
    const desks = Array.from(container.querySelectorAll("[data-wa-scene-desk]"));
    const lounges = Array.from(container.querySelectorAll("[data-wa-scene-lounge]"));

    expect(root?.getAttribute("data-scene-front-label-lane-clearance")).toBe("stable-work-rest-nameplate-lane");
    expect(root?.getAttribute("data-scene-background-width")).toBe("1264");
    expect(root?.getAttribute("data-scene-background-height")).toBe("848");
    expect(root?.getAttribute("data-scene-placement-contract")).toBe("busy-work-idle-rest");
    expect(root?.getAttribute("data-scene-input-agent-count")).toBe(String(agents.length));
    expect(root?.getAttribute("data-scene-rendered-agent-count")).toBe(String(agents.length));
    expect(root?.getAttribute("data-scene-overflow-agent-count")).toBe("2");
    expect(root?.getAttribute("data-scene-nameplate-format")).toBe("agent-name-taskcount-compact");
    expect(root?.getAttribute("data-scene-nameplate-min-font-px")).toBe("13");
    expect(desks).toHaveLength(13);
    expect(lounges).toHaveLength(5);
    expect(desks.filter((desk) => desk.getAttribute("data-wa-scene-placement") === "work")).toHaveLength(13);
    expect(lounges.filter((lounge) => lounge.getAttribute("data-wa-scene-placement") === "rest")).toHaveLength(5);
    expect(desks.every((desk) => ["busy", "error"].includes(desk.getAttribute("data-wa-scene-desk-status") ?? ""))).toBe(true);
    expect(lounges.every((lounge) => ["idle", "offline"].includes(lounge.getAttribute("data-wa-scene-desk-status") ?? ""))).toBe(true);
    expect(desks.filter((desk) => desk.getAttribute("data-wa-scene-overflow") === "true")).toHaveLength(1);
    expect(lounges.filter((lounge) => lounge.getAttribute("data-wa-scene-overflow") === "true")).toHaveLength(1);
    expect(root?.getAttribute("data-scene-label-scale-hierarchy")).toBe("single-line-count-nameplate-readable");
    expect(root?.getAttribute("data-scene-peripheral-visibility")).toBe("custom-background-broader-workzones-readable");
    expect(root?.getAttribute("data-scene-label-hierarchy")).toBe("compact-count-nameplate");
    expect(desks[0]?.getAttribute("style")).toContain("--wa-label-offset-x:");
    expect(desks[0]?.getAttribute("data-wa-scene-name")).toBe("busy-1");
    expect(desks[0]?.getAttribute("data-wa-scene-nameplate-text")).toBe("busy-1(1)");
    expect(lounges[0]?.getAttribute("data-wa-scene-name")).toBe("idle-1");
    expect(lounges[0]?.getAttribute("data-wa-scene-nameplate-text")).toBe("idle-1(0)");
    expect(desks.at(-1)?.getAttribute("data-wa-scene-marker-kind")).toBe("overflow");
    expect(lounges.at(-1)?.getAttribute("data-wa-scene-marker-kind")).toBe("overflow");
    expect(root?.getAttribute("data-scene-visible-lounge-left")).toBeTruthy();
    expect(root?.getAttribute("data-scene-rest-safe-width")).toBeTruthy();
    expect(lounges.some((lounge) => lounge.getAttribute("data-wa-scene-nameplate-side") === "above")).toBe(true);
    expect(lounges.some((lounge) => lounge.getAttribute("data-wa-scene-nameplate-side") === "below")).toBe(true);
    expect(container.querySelector(".wa-scene-desk-nameplate")?.textContent).toBe("busy-1(1)");
    expect(container.querySelector(".wa-scene-lounge-nameplate")?.textContent).toBe("idle-1(0)");
  });
});
