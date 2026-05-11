import type { AgentVisualState } from "../agentVisualState";

type AgentDetailPanelProps = {
  agent: AgentVisualState | null;
  title?: string;
  emptyMessage?: string;
};

function renderTaskLines(agent: AgentVisualState) {
  if (!agent.taskDetails?.length) {
    return "No trustworthy live task details";
  }
  return agent.taskDetails.join(" | ");
}

export function AgentDetailPanel({
  agent,
  title = "Agent detail",
  emptyMessage = "Select a desk to inspect the current renderer-facing state.",
}: AgentDetailPanelProps) {
  if (!agent) {
    return (
      <aside className="detail-panel" data-detail-state="empty">
        <h2>{title}</h2>
        <p>{emptyMessage}</p>
      </aside>
    );
  }

  return (
    <aside className="detail-panel" data-detail-state="selected">
      <h2>{agent.name}</h2>
      <dl>
        <div>
          <dt>Desk</dt>
          <dd>{agent.deskLabel ?? "Assigned desk"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{agent.status}</dd>
        </div>
        <div>
          <dt>Task count</dt>
          <dd>{agent.taskCount}</dd>
        </div>
        <div>
          <dt>Current task</dt>
          <dd>{agent.currentTask ?? "No current task"}</dd>
        </div>
        <div>
          <dt>Error</dt>
          <dd>{agent.errorMessage ?? "None"}</dd>
        </div>
        <div>
          <dt>Total sessions</dt>
          <dd>{agent.totalSessions ?? 0}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{agent.sessionModel ?? "Unavailable"}</dd>
        </div>
        <div>
          <dt>Thinking level</dt>
          <dd>{agent.thinkingLevel ?? "Unavailable"}</dd>
        </div>
        <div>
          <dt>Latest input</dt>
          <dd>{agent.latestUserInput ?? "Unavailable"}</dd>
        </div>
        <div>
          <dt>Task details</dt>
          <dd>{renderTaskLines(agent)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{agent.updatedAt}</dd>
        </div>
      </dl>
    </aside>
  );
}
