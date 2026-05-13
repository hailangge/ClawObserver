import type { AgentRuntimeStatus, AgentVisualState, SceneSummary } from "../agentVisualState";

type LiveOverviewAgent = {
  agent_name?: unknown;
  agentName?: unknown;
  visual_status?: unknown;
  visualStatus?: unknown;
  active_sessions?: unknown;
  activeSessions?: unknown;
  total_sessions?: unknown;
  totalSessions?: unknown;
  latest_user_input_timestamp?: unknown;
  latestUserInputTimestamp?: unknown;
  latest_user_input?: unknown;
  latestUserInput?: unknown;
  session_model?: unknown;
  sessionModel?: unknown;
  model?: unknown;
  thinking_level?: unknown;
  thinkingLevel?: unknown;
  task_details?: unknown;
  taskDetails?: unknown;
};

type LiveOverviewNamedCount = {
  lane_name?: unknown;
  laneName?: unknown;
  gateway_group?: unknown;
  gatewayGroup?: unknown;
  depth?: unknown;
  gateway_count?: unknown;
  gatewayCount?: unknown;
};

export type LiveOverviewPayload = {
  captured_at?: unknown;
  capturedAt?: unknown;
  source_version?: unknown;
  sourceVersion?: unknown;
  capture_status?: unknown;
  captureStatus?: unknown;
  runtime_status_reason?: unknown;
  runtimeStatusReason?: unknown;
  refresh_seconds?: unknown;
  refreshSeconds?: unknown;
  session_overview?: {
    total_sessions?: unknown;
    totalSessions?: unknown;
    active_sessions?: unknown;
    activeSessions?: unknown;
    idle_sessions?: unknown;
    idleSessions?: unknown;
  } | null;
  sessionOverview?: {
    total_sessions?: unknown;
    totalSessions?: unknown;
    active_sessions?: unknown;
    activeSessions?: unknown;
    idle_sessions?: unknown;
    idleSessions?: unknown;
  } | null;
  agent_sessions?: unknown;
  agentSessions?: unknown;
  queue_lanes?: unknown;
  queueLanes?: unknown;
  gateways?: unknown;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asCount(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }
  return Math.trunc(numeric);
}

function normalizeTaskDetails(raw: unknown): string[] {
  return asArray<string>(raw)
    .map((entry) => asOptionalString(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function normalizeCaptureStatus(payload: LiveOverviewPayload): AgentRuntimeStatus {
  const status = asString(payload.capture_status ?? payload.captureStatus, "waiting");
  if (status === "ok" || status === "degraded" || status === "waiting" || status === "error") {
    return status;
  }
  return "waiting";
}

function normalizeVisualStatus(value: unknown): AgentVisualState["status"] | null {
  const status = asString(value);
  if (status === "idle" || status === "busy" || status === "error" || status === "offline") {
    return status;
  }
  return null;
}

function deriveStatus(agent: LiveOverviewAgent, payload: LiveOverviewPayload): AgentVisualState["status"] {
  const explicitVisualStatus = normalizeVisualStatus(agent.visual_status ?? agent.visualStatus);
  if (explicitVisualStatus) {
    return explicitVisualStatus;
  }

  const activeSessions = asCount(agent.active_sessions ?? agent.activeSessions);
  const totalSessions = asCount(agent.total_sessions ?? agent.totalSessions);
  const captureStatus = normalizeCaptureStatus(payload);
  const runtimeReason = asString(payload.runtime_status_reason ?? payload.runtimeStatusReason, "");

  if ((captureStatus === "degraded" || captureStatus === "error") && /error|fail|timeout/i.test(runtimeReason)) {
    return "error";
  }
  if (captureStatus === "waiting" && totalSessions === 0 && activeSessions === 0) {
    return "offline";
  }
  if (activeSessions > 0) {
    return "busy";
  }
  if (totalSessions > 0 || captureStatus === "ok" || captureStatus === "degraded") {
    return "idle";
  }
  return "offline";
}

function findCount(items: LiveOverviewNamedCount[], keyName: "lane_name" | "gateway_group", target: string): number {
  const match = items.find((item) => asString(item[keyName] ?? item[keyName === "lane_name" ? "laneName" : "gatewayGroup"]) === target);
  if (!match) {
    return 0;
  }
  return asCount(match.depth ?? match.gateway_count ?? match.gatewayCount);
}

export function mapLiveOverviewToAgentVisualStates(payload: LiveOverviewPayload): AgentVisualState[] {
  const capturedAt = asString(payload.captured_at ?? payload.capturedAt, new Date().toISOString());
  const runtimeReason = asOptionalString(payload.runtime_status_reason ?? payload.runtimeStatusReason);
  const agents = asArray<LiveOverviewAgent>(payload.agent_sessions ?? payload.agentSessions);

  return agents.map((agent, index) => {
    const name = asString(agent.agent_name ?? agent.agentName, `agent-${index + 1}`);
    const taskDetails = normalizeTaskDetails(agent.task_details ?? agent.taskDetails);
    const status = deriveStatus(agent, payload);
    const activeSessions = asCount(agent.active_sessions ?? agent.activeSessions);
    const totalSessions = asCount(agent.total_sessions ?? agent.totalSessions);
    const taskCount = activeSessions > 0 ? activeSessions : taskDetails.length;

    return {
      id: name,
      name,
      status,
      taskCount,
      currentTask: taskDetails[0] ?? null,
      errorMessage: status === "error" ? runtimeReason : null,
      updatedAt: asString(agent.latest_user_input_timestamp ?? agent.latestUserInputTimestamp, capturedAt),
      totalSessions,
      latestUserInput: asOptionalString(agent.latest_user_input ?? agent.latestUserInput),
      latestUserInputTimestamp: asOptionalString(agent.latest_user_input_timestamp ?? agent.latestUserInputTimestamp),
      sessionModel: asOptionalString(agent.session_model ?? agent.sessionModel ?? agent.model),
      thinkingLevel: asOptionalString(agent.thinking_level ?? agent.thinkingLevel),
      taskDetails,
      deskLabel: `Desk ${index + 1}`,
      avatarState: undefined,
    };
  });
}

export function buildSceneSummaryFromLiveOverview(payload: LiveOverviewPayload, agents?: AgentVisualState[]): SceneSummary {
  const captureStatus = normalizeCaptureStatus(payload);
  const runtimeStatusReason = asOptionalString(payload.runtime_status_reason ?? payload.runtimeStatusReason);
  const sessionOverview = payload.session_overview ?? payload.sessionOverview ?? null;
  const totalSessions = asCount(sessionOverview?.total_sessions ?? sessionOverview?.totalSessions);
  const activeSessions = asCount(sessionOverview?.active_sessions ?? sessionOverview?.activeSessions);
  const idleSessions = asCount(sessionOverview?.idle_sessions ?? sessionOverview?.idleSessions);
  const visualAgents = agents ?? mapLiveOverviewToAgentVisualStates(payload);
  const queueLanes = asArray<LiveOverviewNamedCount>(payload.queue_lanes ?? payload.queueLanes);
  const gateways = asArray<LiveOverviewNamedCount>(payload.gateways);

  return {
    capturedAt: asString(payload.captured_at ?? payload.capturedAt, new Date().toISOString()),
    captureStatus,
    runtimeStatusReason,
    activeSessions,
    totalSessions,
    idleSessions,
    busyAgents: visualAgents.filter((agent) => agent.status === "busy").length,
    idleAgents: visualAgents.filter((agent) => agent.status === "idle").length,
    errorAgents: visualAgents.filter((agent) => agent.status === "error").length,
    offlineAgents: visualAgents.filter((agent) => agent.status === "offline").length,
    queueDepth: findCount(queueLanes, "lane_name", "delivery_queue_pending"),
    failedQueueDepth: findCount(queueLanes, "lane_name", "delivery_queue_failed"),
    gatewayTotal: findCount(gateways, "gateway_group", "total"),
    gatewayExitsToday: gateways.some((item) => asString(item.gateway_group ?? item.gatewayGroup) === "exits_today")
      ? findCount(gateways, "gateway_group", "exits_today")
      : null,
    sourceVersion: asString(payload.source_version ?? payload.sourceVersion, "unknown-runtime"),
  };
}
