export type AgentVisualStatus = "idle" | "busy" | "error" | "offline";

export type AgentAvatarState = {
  mood?: string;
  pose?: string;
} | null;

export type AgentRuntimeStatus = "ok" | "degraded" | "waiting" | "error";

export type AgentVisualState = {
  id: string;
  name: string;
  status: AgentVisualStatus;
  taskCount: number;
  currentTask: string | null;
  errorMessage: string | null;
  updatedAt: string;
  totalSessions?: number;
  latestUserInput?: string | null;
  latestUserInputTimestamp?: string | null;
  sessionModel?: string | null;
  thinkingLevel?: string | null;
  taskDetails?: string[];
  deskLabel?: string;
  avatarState?: AgentAvatarState;
};

export type SceneSummary = {
  capturedAt: string;
  captureStatus: AgentRuntimeStatus;
  runtimeStatusReason: string | null;
  activeSessions: number;
  totalSessions: number;
  idleSessions: number;
  busyAgents: number;
  idleAgents: number;
  errorAgents: number;
  offlineAgents: number;
  queueDepth: number;
  failedQueueDepth: number;
  gatewayTotal: number;
  gatewayExitsToday: number | null;
  sourceVersion: string;
};

export type AgentDeskSlot = {
  id: string;
  label: string;
  row: number;
  column: number;
  position: [number, number, number];
  facing?: number;
};

export type SceneSelectionState = {
  hoveredAgentId: string | null;
  selectedAgentId: string | null;
};
