import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentDetailPanel } from "./AgentDetailPanel";

describe("Agent detail behavior", () => {
  it("renders detail panel placeholder before selection", () => {
    render(<AgentDetailPanel agent={null} />);
    expect(screen.getByText("Agent detail")).toBeTruthy();
    expect(screen.getByText("Select a desk to inspect the current renderer-facing state.")).toBeTruthy();
  });

  it("renders selected agent detail values", () => {
    render(
      <AgentDetailPanel
        agent={{
          id: "planner",
          name: "planner",
          status: "busy",
          taskCount: 2,
          currentTask: "Plan release validation",
          errorMessage: null,
          updatedAt: "2026-05-10T09:30:00Z",
          totalSessions: 3,
          deskLabel: "Desk 1",
          sessionModel: "gpt-5.4",
          thinkingLevel: "High",
          latestUserInput: "Review rollout checklist",
          taskDetails: ["Plan release validation", "Track blocker triage"],
        }}
      />,
    );
    expect(screen.getByText("planner")).toBeTruthy();
    expect(screen.getByText("Plan release validation")).toBeTruthy();
    expect(screen.getByText("busy")).toBeTruthy();
    expect(screen.getByText("Desk 1")).toBeTruthy();
    expect(screen.getByText("gpt-5.4")).toBeTruthy();
  });
});
