import type { AgentVisualState, SceneSummary } from "../agentVisualState";
import { AgentOfficeScene } from "./AgentOfficeScene";
import { WorkAdventureScene } from "./WorkAdventureScene";

export type SceneRendererMode = "workadventure" | "legacy-3d";

type SceneRendererProps = {
  mode: SceneRendererMode;
  agents: AgentVisualState[];
  summary: SceneSummary | null;
  hoveredAgentId: string | null;
  selectedAgentId: string | null;
  onHover: (agentId: string | null) => void;
  onSelect: (agentId: string | null) => void;
};

export function SceneRenderer({
  mode,
  agents,
  summary,
  hoveredAgentId,
  selectedAgentId,
  onHover,
  onSelect,
}: SceneRendererProps) {
  if (mode === "legacy-3d") {
    return (
      <AgentOfficeScene
        agents={agents}
        summary={summary}
        hoveredAgentId={hoveredAgentId}
        selectedAgentId={selectedAgentId}
        onHover={onHover}
        onSelect={onSelect}
      />
    );
  }

  return (
    <WorkAdventureScene
      agents={agents}
      summary={summary}
      hoveredAgentId={hoveredAgentId}
      selectedAgentId={selectedAgentId}
      onHover={onHover}
      onSelect={onSelect}
    />
  );
}
