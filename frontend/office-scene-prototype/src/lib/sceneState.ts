import type { AgentVisualState } from "../agentVisualState";
import { FIXED_WORKSTATION_SLOTS, MAX_VISIBLE_TASK_BLOCKS } from "../config/workstationSlots";

export type DeskAssignment = {
  slotId: string;
  agent: AgentVisualState | null;
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

export function findAgentById(agents: AgentVisualState[], agentId: string | null): AgentVisualState | null {
  if (!agentId) {
    return null;
  }
  return agents.find((agent) => agent.id === agentId) ?? null;
}
