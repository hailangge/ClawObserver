import { describe, expect, it } from "vitest";
import { FIXED_WORKSTATION_SLOT_COUNT, FIXED_WORKSTATION_SLOTS, MAX_VISIBLE_TASK_BLOCKS } from "../config/workstationSlots";
import { STATUS_VISUALS } from "../config/visualMapping";
import { assignAgentsToFixedDesks, capVisibleTaskBlocks } from "./sceneState";

describe("sceneState", () => {
  it("defines exactly 12 fixed workstation slots", () => {
    expect(FIXED_WORKSTATION_SLOT_COUNT).toBe(12);
    expect(FIXED_WORKSTATION_SLOTS).toHaveLength(12);
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
