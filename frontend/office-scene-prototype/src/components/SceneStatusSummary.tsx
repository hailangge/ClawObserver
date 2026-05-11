import type { SceneSummary } from "../agentVisualState";

type SceneStatusSummaryProps = {
  summary: SceneSummary | null;
};

function formatRuntimeLabel(summary: SceneSummary | null): string {
  if (!summary) {
    return "Waiting for live runtime";
  }
  if (summary.captureStatus === "error") {
    return "Runtime error";
  }
  if (summary.captureStatus === "degraded") {
    return "Runtime degraded";
  }
  if (summary.captureStatus === "waiting") {
    return "Runtime waiting";
  }
  return "Live runtime";
}

export function SceneStatusSummary({ summary }: SceneStatusSummaryProps) {
  return (
    <section className="detail-panel realtime-summary" data-summary-panel data-runtime-status={summary?.captureStatus ?? "waiting"}>
      <h2>Scene summary</h2>
      <p>{formatRuntimeLabel(summary)}</p>
      <dl>
        <div>
          <dt>Captured</dt>
          <dd data-summary-captured-at>{summary?.capturedAt ?? "Unavailable"}</dd>
        </div>
        <div>
          <dt>Sessions</dt>
          <dd data-summary-session-overview>
            {summary ? `${summary.activeSessions} active / ${summary.totalSessions} total` : "Unavailable"}
          </dd>
        </div>
        <div>
          <dt>Queue</dt>
          <dd data-summary-queue>{summary ? `${summary.queueDepth} pending / ${summary.failedQueueDepth} failed` : "Unavailable"}</dd>
        </div>
        <div>
          <dt>Gateways</dt>
          <dd data-summary-gateways>
            {summary ? `${summary.gatewayTotal} total${summary.gatewayExitsToday !== null ? ` / ${summary.gatewayExitsToday} exits today` : ""}` : "Unavailable"}
          </dd>
        </div>
        <div>
          <dt>Runtime</dt>
          <dd data-summary-runtime-reason>{summary?.runtimeStatusReason ?? "Healthy or unspecified"}</dd>
        </div>
      </dl>
    </section>
  );
}
