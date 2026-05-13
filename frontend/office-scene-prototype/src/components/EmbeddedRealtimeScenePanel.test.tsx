import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmbeddedRealtimeScenePanel } from "./EmbeddedRealtimeScenePanel";
import { useSceneStore } from "../lib/store";

vi.mock("./AgentOfficeScene", () => ({
  AgentOfficeScene: () => <div data-testid="scene-canvas-mock">scene</div>,
}));
vi.mock("./WorkAdventureScene", () => ({
  WorkAdventureScene: () => <div data-testid="scene-canvas-mock">scene</div>,
}));

const summary = {
  capturedAt: "2026-05-11T09:30:00Z",
  captureStatus: "ok" as const,
  runtimeStatusReason: "Healthy runtime",
  activeSessions: 3,
  totalSessions: 8,
  idleSessions: 5,
  busyAgents: 2,
  idleAgents: 5,
  errorAgents: 0,
  offlineAgents: 5,
  queueDepth: 2,
  failedQueueDepth: 1,
  gatewayTotal: 4,
  gatewayExitsToday: 0,
  sourceVersion: "test-runtime",
};

const agents = [
  {
    id: "planner",
    name: "planner",
    status: "busy" as const,
    taskCount: 2,
    currentTask: "Plan release validation",
    errorMessage: null,
    updatedAt: "2026-05-11T09:30:00Z",
    deskLabel: "Desk 1",
  },
];

describe("EmbeddedRealtimeScenePanel", () => {
  beforeEach(() => {
    useSceneStore.setState({
      agents: [],
      summary: null,
      hoveredAgentId: null,
      selectedAgentId: null,
    });
  });

  it("renders scene summary above the canvas in wide production layout", () => {
    const { container } = render(<EmbeddedRealtimeScenePanel agents={agents} summary={summary} />);

    const summaryPanel = container.querySelector("[data-summary-panel]");
    const canvasPanel = container.querySelector(".scene-canvas-panel");
    const detailStrip = container.querySelector("[data-detail-strip-layout]");
    expect(summaryPanel?.getAttribute("data-summary-variant")).toBe("wide");
    expect(summaryPanel?.compareDocumentPosition(canvasPanel as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelectorAll("[data-detail-state]")).toHaveLength(2);
    expect(detailStrip?.getAttribute("data-detail-strip-layout")).toBe("below-map-stable-horizontal");
    expect(canvasPanel?.compareDocumentPosition(detailStrip as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("scene")).toBeTruthy();
  });
});
