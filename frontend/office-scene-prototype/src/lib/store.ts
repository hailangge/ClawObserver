import { create } from "zustand";
import type { AgentVisualState, SceneSummary } from "../agentVisualState";
import { findAgentById } from "./sceneState";

type SceneStore = {
  agents: AgentVisualState[];
  summary: SceneSummary | null;
  hoveredAgentId: string | null;
  selectedAgentId: string | null;
  setAgents: (agents: AgentVisualState[], summary?: SceneSummary | null) => void;
  setHoveredAgentId: (agentId: string | null) => void;
  setSelectedAgentId: (agentId: string | null) => void;
};

export const useSceneStore = create<SceneStore>((set) => ({
  agents: [],
  summary: null,
  hoveredAgentId: null,
  selectedAgentId: null,
  setAgents: (agents, summary = null) =>
    set((state) => {
      const selected = findAgentById(agents, state.selectedAgentId);
      const hovered = findAgentById(agents, state.hoveredAgentId);
      return {
        agents,
        summary,
        selectedAgentId: selected?.id ?? null,
        hoveredAgentId: hovered?.id ?? null,
      };
    }),
  setHoveredAgentId: (hoveredAgentId) => set({ hoveredAgentId }),
  setSelectedAgentId: (selectedAgentId) => set({ selectedAgentId }),
}));
