import { beforeEach, describe, expect, it } from "vitest";
import type { AgentVisualState, SceneSummary } from "../agentVisualState";
import { useSceneStore } from "./store";

const AGENTS: AgentVisualState[] = [
  {
    id: "planner",
    name: "planner",
    status: "busy",
    taskCount: 2,
    currentTask: "Plan release validation",
    errorMessage: null,
    updatedAt: "2026-05-10T09:30:00Z",
  },
  {
    id: "reviewer",
    name: "reviewer",
    status: "idle",
    taskCount: 0,
    currentTask: null,
    errorMessage: null,
    updatedAt: "2026-05-10T09:29:00Z",
  },
];

const SUMMARY: SceneSummary = {
  capturedAt: "2026-05-10T09:30:00Z",
  captureStatus: "ok",
  runtimeStatusReason: null,
  activeSessions: 2,
  totalSessions: 3,
  idleSessions: 1,
  busyAgents: 1,
  idleAgents: 1,
  errorAgents: 0,
  offlineAgents: 0,
  queueDepth: 2,
  failedQueueDepth: 0,
  gatewayTotal: 3,
  gatewayExitsToday: 1,
  sourceVersion: "demo-runtime",
};

describe("useSceneStore", () => {
  beforeEach(() => {
    useSceneStore.setState({
      agents: [],
      summary: null,
      hoveredAgentId: null,
      selectedAgentId: null,
    });
  });

  it("stores hover and selection ids", () => {
    useSceneStore.getState().setAgents(AGENTS, SUMMARY);
    useSceneStore.getState().setHoveredAgentId("planner");
    useSceneStore.getState().setSelectedAgentId("reviewer");

    expect(useSceneStore.getState().summary?.gatewayTotal).toBe(3);
    expect(useSceneStore.getState().hoveredAgentId).toBe("planner");
    expect(useSceneStore.getState().selectedAgentId).toBe("reviewer");
  });

  it("drops selection and hover when incoming agents no longer include them", () => {
    useSceneStore.getState().setAgents(AGENTS, SUMMARY);
    useSceneStore.getState().setHoveredAgentId("planner");
    useSceneStore.getState().setSelectedAgentId("reviewer");

    useSceneStore.getState().setAgents([AGENTS[0]!], SUMMARY);

    expect(useSceneStore.getState().hoveredAgentId).toBe("planner");
    expect(useSceneStore.getState().selectedAgentId).toBeNull();
  });
});
