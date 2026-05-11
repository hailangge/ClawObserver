import { useEffect } from "react";
import type { AgentVisualState, SceneSummary } from "../agentVisualState";
import { AgentOfficeScene } from "./AgentOfficeScene";
import { AgentDetailPanel } from "./AgentDetailPanel";
import { SceneStatusSummary } from "./SceneStatusSummary";
import { useSceneStore } from "../lib/store";
import { findAgentById } from "../lib/sceneState";

type EmbeddedRealtimeScenePanelProps = {
  agents: AgentVisualState[];
  summary: SceneSummary | null;
};

export function EmbeddedRealtimeScenePanel({ agents, summary }: EmbeddedRealtimeScenePanelProps) {
  const {
    agents: storedAgents,
    hoveredAgentId,
    selectedAgentId,
    setAgents,
    setHoveredAgentId,
    setSelectedAgentId,
  } = useSceneStore();

  useEffect(() => {
    setAgents(agents, summary);
  }, [agents, summary, setAgents]);

  const effectiveAgents = storedAgents.length > 0 || agents.length === 0 ? storedAgents : agents;
  const selectedAgent = findAgentById(effectiveAgents, selectedAgentId);

  return (
    <div className="scene-board" data-embedded-realtime-scene>
      <div className="scene-layout">
        <section className="scene-panel">
          <div className="scene-canvas-panel">
            <AgentOfficeScene
              agents={effectiveAgents}
              summary={summary}
              hoveredAgentId={hoveredAgentId}
              selectedAgentId={selectedAgentId}
              onHover={setHoveredAgentId}
              onSelect={setSelectedAgentId}
            />
          </div>
          <footer className="scene-footer">
            <span data-scene-hovered-agent>Hover: {findAgentById(effectiveAgents, hoveredAgentId)?.name ?? "none"}</span>
            <span data-scene-fixed-desks>Fixed desks: 12</span>
            <span data-scene-lounge-note>Lounge zone: reserved MVP region</span>
            <span data-scene-runtime-note>
              {summary?.captureStatus === "degraded" || summary?.captureStatus === "waiting"
                ? summary.runtimeStatusReason ?? "Live runtime is waiting for a fuller payload."
                : "Desk and board state update from live OpenClaw payloads."}
            </span>
          </footer>
        </section>
        <div className="realtime-side-stack">
          <SceneStatusSummary summary={summary} />
          <AgentDetailPanel
            agent={selectedAgent}
            title="Selected desk"
            emptyMessage="Select a desk to inspect the current live task, session, and model details."
          />
        </div>
      </div>
      <p className="scene-footnote">
        Hover cards and selection panels use only current renderer-facing live data. Empty desks stay visibly distinct, while the lounge remains reserved for non-active or waiting office state.
      </p>
    </div>
  );
}
