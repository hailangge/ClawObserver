import React from "react";
import ReactDOM from "react-dom/client";
import { EmbeddedRealtimeScenePanel } from "./components/EmbeddedRealtimeScenePanel";
import {
  buildSceneSummaryFromLiveOverview,
  mapLiveOverviewToAgentVisualStates,
  type LiveOverviewPayload,
} from "./lib/liveOverviewSceneAdapter";
import "./styles.css";

type RenderTarget = HTMLElement & {
  __clawObserverSceneRoot?: ReactDOM.Root;
};

function getRoot(element: RenderTarget): ReactDOM.Root {
  if (!element.__clawObserverSceneRoot) {
    element.__clawObserverSceneRoot = ReactDOM.createRoot(element);
  }
  return element.__clawObserverSceneRoot;
}

export function renderRealtimeSceneEmbed(target: HTMLElement, payload: LiveOverviewPayload) {
  const renderTarget = target as RenderTarget;
  const agents = mapLiveOverviewToAgentVisualStates(payload);
  const summary = buildSceneSummaryFromLiveOverview(payload, agents);

  getRoot(renderTarget).render(
    <React.StrictMode>
      <EmbeddedRealtimeScenePanel agents={agents} summary={summary} />
    </React.StrictMode>,
  );
}

export function unmountRealtimeSceneEmbed(target: HTMLElement | null) {
  if (!target) {
    return;
  }
  const renderTarget = target as RenderTarget;
  renderTarget.__clawObserverSceneRoot?.unmount();
  delete renderTarget.__clawObserverSceneRoot;
}

declare global {
  interface Window {
    ClawObserverRealtimeScene?: {
      render: typeof renderRealtimeSceneEmbed;
      unmount: typeof unmountRealtimeSceneEmbed;
    };
  }
}

window.ClawObserverRealtimeScene = {
  render: renderRealtimeSceneEmbed,
  unmount: unmountRealtimeSceneEmbed,
};
