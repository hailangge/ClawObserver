import { useEffect, useState } from "react";
import type { AgentVisualState, SceneSummary } from "./agentVisualState";
import { MOCK_AGENT_VISUAL_STATES } from "./data/mockAgents";
import { RealtimeOfficeSceneApp } from "./components/RealtimeOfficeSceneApp";
import {
  buildSceneSummaryFromLiveOverview,
  mapLiveOverviewToAgentVisualStates,
  type LiveOverviewPayload,
} from "./lib/liveOverviewSceneAdapter";
import "./styles.css";

type LoadSource = "live" | "demo";

async function loadAgentsFromLiveApi(): Promise<{ agents: AgentVisualState[]; summary: SceneSummary }> {
  const response = await fetch("/api/live/prototype", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Live API failed: ${response.status}`);
  }
  const payload = (await response.json()) as LiveOverviewPayload;
  const agents = mapLiveOverviewToAgentVisualStates(payload);
  return {
    agents,
    summary: buildSceneSummaryFromLiveOverview(payload, agents),
  };
}

export default function App() {
  const [loadSource, setLoadSource] = useState<LoadSource>("live");
  const [statusText, setStatusText] = useState("Loading live scene...");
  const [agents, setAgents] = useState<AgentVisualState[]>([]);
  const [summary, setSummary] = useState<SceneSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadAgentsFromLiveApi()
      .then(({ agents: nextAgents, summary: nextSummary }) => {
        if (cancelled) {
          return;
        }
        setAgents(nextAgents);
        setSummary(nextSummary);
        setStatusText("Live runtime scene");
        setLoadSource("live");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setAgents(MOCK_AGENT_VISUAL_STATES);
        setSummary({
          capturedAt: new Date().toISOString(),
          captureStatus: "waiting",
          runtimeStatusReason: "Prototype fallback to demo scene",
          activeSessions: 0,
          totalSessions: 0,
          idleSessions: 0,
          busyAgents: MOCK_AGENT_VISUAL_STATES.filter((agent) => agent.status === "busy").length,
          idleAgents: MOCK_AGENT_VISUAL_STATES.filter((agent) => agent.status === "idle").length,
          errorAgents: MOCK_AGENT_VISUAL_STATES.filter((agent) => agent.status === "error").length,
          offlineAgents: MOCK_AGENT_VISUAL_STATES.filter((agent) => agent.status === "offline").length,
          queueDepth: 0,
          failedQueueDepth: 0,
          gatewayTotal: 0,
          gatewayExitsToday: null,
          sourceVersion: "prototype-demo-fallback",
        });
        setStatusText("Demo scene fallback");
        setLoadSource("demo");
      });

    return () => {
      cancelled = true;
    };
  }, [setAgents]);

  return (
    <RealtimeOfficeSceneApp
      agents={agents}
      summary={summary}
      statusText={statusText}
      loadSource={loadSource}
      eyebrow="ClawObserver prototype"
      title="Agent Office Scene"
      subtitle="Production-bound React Three Fiber office scene with exactly 12 fixed desks and a reserved lounge zone inspired by static_scene.jpg."
      backLinkHref="/"
      backLinkLabel="Back to dashboard"
      footerNote="Prototype route uses the same desk/status contract as the production Realtime scene."
      summaryTitle="Selected agent"
    />
  );
}
