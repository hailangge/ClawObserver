import { describe, expect, it } from "vitest";
import { mapLiveOverviewToAgentVisualStates } from "./agentVisualAdapter";

describe("mapLiveOverviewToAgentVisualStates", () => {
  it("maps active agents to busy state and keeps current task", () => {
    const result = mapLiveOverviewToAgentVisualStates({
      captured_at: "2026-05-10T09:30:00Z",
      capture_status: "ok",
      agent_sessions: [
        {
          agent_name: "planner",
          active_sessions: 2,
          total_sessions: 3,
          task_details: ["Plan release validation"],
        },
      ],
    });

    expect(result).toEqual([
      {
        id: "planner",
        name: "planner",
        status: "busy",
        taskCount: 2,
        currentTask: "Plan release validation",
        errorMessage: null,
        updatedAt: "2026-05-10T09:30:00Z",
        totalSessions: 3,
        latestUserInput: null,
        latestUserInputTimestamp: null,
        sessionModel: null,
        thinkingLevel: null,
        taskDetails: ["Plan release validation"],
        deskLabel: "Desk 1",
        avatarState: undefined,
      },
    ]);
  });

  it("maps idle and offline agents conservatively", () => {
    const result = mapLiveOverviewToAgentVisualStates({
      captured_at: "2026-05-10T09:30:00Z",
      capture_status: "waiting",
      agent_sessions: [
        { agent_name: "reviewer", active_sessions: 0, total_sessions: 1 },
        { agent_name: "main", active_sessions: 0, total_sessions: 0 },
      ],
    });

    expect(result.map((agent) => ({ id: agent.id, status: agent.status }))).toEqual([
      { id: "reviewer", status: "idle" },
      { id: "main", status: "offline" },
    ]);
  });

  it("maps runtime failure reasons to error state", () => {
    const result = mapLiveOverviewToAgentVisualStates({
      captured_at: "2026-05-10T09:30:00Z",
      capture_status: "degraded",
      runtime_status_reason: "gateway timeout while collecting live state",
      agent_sessions: [{ agent_name: "operator", active_sessions: 0, total_sessions: 1 }],
    });

    expect(result[0]?.status).toBe("error");
    expect(result[0]?.errorMessage).toBe("gateway timeout while collecting live state");
  });
});
