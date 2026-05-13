import { useEffect } from "react";
import type { AgentVisualState, SceneSummary } from "../agentVisualState";
import { AgentDetailPanel } from "./AgentDetailPanel";
import { SceneStatusSummary } from "./SceneStatusSummary";
import { useSceneStore } from "../lib/store";
import { findAgentById } from "../lib/sceneState";
import { SceneRenderer } from "./SceneRenderer";

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
      <div className="scene-layout scene-layout--stacked">
        <div className="scene-top-stack">
          <SceneStatusSummary summary={summary} variant="wide" />
        </div>
        <section className="scene-panel">
          <div className="scene-canvas-panel">
            <SceneRenderer
              mode="workadventure"
              agents={effectiveAgents}
              summary={summary}
              hoveredAgentId={hoveredAgentId}
              selectedAgentId={selectedAgentId}
              onHover={setHoveredAgentId}
              onSelect={setSelectedAgentId}
            />
          </div>
          <div className="realtime-detail-strip realtime-detail-strip--below-map" data-detail-strip-layout="below-map-stable-horizontal">
            <AgentDetailPanel
              agent={selectedAgent}
              title="Selected desk"
              emptyMessage="Select a desk to inspect the current live task, session, and model details."
            />
          </div>
          <footer className="scene-footer">
            <span data-scene-hovered-agent>Hover: {findAgentById(effectiveAgents, hoveredAgentId)?.name ?? "none"}</span>
            <span data-scene-fixed-desks>Fixed desks: 12</span>
            <span data-scene-lounge-note>Lounge zone: quiet / waiting region</span>
            <span data-scene-runtime-note>
              {summary?.captureStatus === "degraded" || summary?.captureStatus === "waiting"
                ? summary.runtimeStatusReason ?? "Live runtime is waiting for a fuller payload."
                : "Tile-map desk and board state update from live OpenClaw payloads."}
            </span>
          </footer>
        </section>
        <div className="realtime-detail-mobile">
          <AgentDetailPanel
            agent={selectedAgent}
            title="Selected desk"
            emptyMessage="Select a desk to inspect the current live task, session, and model details."
          />
        </div>
      </div>
      <p className="scene-footnote">
        The primary embedded scene is the WorkAdventure-style office surface. The retained React Three Fiber room stays available on the `/prototype` route as the current legacy 3D path.
      </p>
    </div>
  );
}
