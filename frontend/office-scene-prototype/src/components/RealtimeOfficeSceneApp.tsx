import { useEffect } from "react";
import type { AgentVisualState, SceneSummary } from "../agentVisualState";
import { AgentOfficeScene } from "./AgentOfficeScene";
import { AgentDetailPanel } from "./AgentDetailPanel";
import { SceneStatusSummary } from "./SceneStatusSummary";
import { findAgentById } from "../lib/sceneState";
import { useSceneStore } from "../lib/store";

type RealtimeOfficeSceneAppProps = {
  agents: AgentVisualState[];
  summary: SceneSummary | null;
  statusText: string;
  loadSource: "live" | "demo";
  title: string;
  eyebrow: string;
  subtitle: string;
  backLinkHref?: string;
  backLinkLabel?: string;
  footerNote?: string;
  summaryTitle?: string;
  emptyDetailMessage?: string;
};

export function RealtimeOfficeSceneApp({
  agents,
  summary,
  statusText,
  loadSource,
  title,
  eyebrow,
  subtitle,
  backLinkHref,
  backLinkLabel,
  footerNote,
  summaryTitle,
  emptyDetailMessage,
}: RealtimeOfficeSceneAppProps) {
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
    <main className="prototype-page realtime-scene-app" data-load-source={loadSource} data-runtime-status={summary?.captureStatus ?? "waiting"}>
      <header className="prototype-header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="prototype-status">
          <span>{statusText}</span>
          {backLinkHref && backLinkLabel ? <a href={backLinkHref}>{backLinkLabel}</a> : null}
        </div>
      </header>
      <section className="prototype-layout prototype-layout--stacked">
        <div className="scene-top-stack">
          <SceneStatusSummary summary={summary} variant="wide" />
          <div className="realtime-detail-strip">
            <AgentDetailPanel
              agent={selectedAgent}
              title={summaryTitle ?? "Selected agent"}
              emptyMessage={emptyDetailMessage ?? "Select a desk to inspect the current renderer-facing state."}
            />
          </div>
        </div>
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
            <span>Hover: {findAgentById(effectiveAgents, hoveredAgentId)?.name ?? "none"}</span>
            <span>Fixed desks: 12</span>
            <span>Lounge zone: reserved MVP region</span>
            {footerNote ? <span>{footerNote}</span> : null}
          </footer>
        </section>
        <div className="realtime-detail-mobile">
          <AgentDetailPanel
            agent={selectedAgent}
            title={summaryTitle ?? "Selected agent"}
            emptyMessage={emptyDetailMessage ?? "Select a desk to inspect the current renderer-facing state."}
          />
        </div>
      </section>
    </main>
  );
}
