const state = {
  page: "realtime",
  range: "current_day",
  liveTimer: null,
  loadingKey: null,
  requestSequence: 0,
  sceneRoleStyles: null,
};

const palette = ["#64c0ff", "#5eb88d", "#d8aa5a", "#d16d73", "#7f9cf5", "#6fd0c4"];
const defaultSceneRoleStyles = {
  defaultRoleStyle: "general_operator",
  roles: {
    general_operator: {
      label: "General operator",
      badge: "OP",
      accent: "#64c0ff",
      accentSoft: "rgba(100, 192, 255, 0.18)",
      outfit: "#2c5f96",
      deskGlow: "rgba(100, 192, 255, 0.24)",
      hair: "#1f2b42",
      skin: "#f0c7a1",
    },
  },
  agents: {},
};

const referenceSceneLayout = {
  activeZoneLabel: { top: 2.8, left: 2.4, width: 13.4, height: 8.4 },
  idleZoneLabel: { top: 67.3, left: 1.2, width: 12.2, height: 8.2 },
  activeSlots: [
    { character: { top: 14.6, left: 4.5, width: 15.2, height: 27.8 }, tag: { top: 10.3, left: 4.3, width: 14.8, height: 5.2 } },
    { character: { top: 14.3, left: 22.4, width: 15.2, height: 28.0 }, tag: { top: 10.3, left: 22.2, width: 15.3, height: 5.2 } },
    { character: { top: 14.0, left: 40.8, width: 15.0, height: 28.0 }, tag: { top: 10.3, left: 40.2, width: 15.9, height: 5.2 } },
    { character: { top: 14.3, left: 59.0, width: 15.2, height: 28.0 }, tag: { top: 10.3, left: 58.4, width: 15.7, height: 5.2 } },
    { character: { top: 14.3, left: 77.0, width: 15.4, height: 28.0 }, tag: { top: 10.3, left: 76.8, width: 16.0, height: 5.2 } },
    { character: { top: 43.3, left: 4.8, width: 15.2, height: 28.2 }, tag: { top: 38.8, left: 3.4, width: 17.0, height: 5.4 } },
    { character: { top: 43.2, left: 22.4, width: 15.2, height: 28.0 }, tag: { top: 38.8, left: 22.0, width: 15.7, height: 5.4 } },
    { character: { top: 43.5, left: 40.9, width: 15.0, height: 27.8 }, tag: { top: 38.8, left: 40.5, width: 15.6, height: 5.4 } },
    { character: { top: 43.0, left: 59.2, width: 15.2, height: 28.2 }, tag: { top: 38.8, left: 58.8, width: 15.1, height: 5.4 } },
    { character: { top: 43.2, left: 77.0, width: 15.2, height: 28.0 }, tag: { top: 38.8, left: 76.8, width: 15.8, height: 5.4 } },
  ],
  idleSlots: [
    { character: { top: 57.6, left: 18.5, width: 16.4, height: 31.5 }, tag: { top: 77.2, left: 17.5, width: 18.1, height: 4.9 } },
  ],
};

document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  bindActions();
  syncRangeSelectorVisibility();
  refreshPage();
});

function bindNavigation() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.page === button.dataset.page) {
        return;
      }
      state.page = button.dataset.page;
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      syncRangeSelectorVisibility();
      refreshPage();
    });
  });

  document.querySelectorAll(".range-button").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.range === button.dataset.range) {
        return;
      }
      state.range = button.dataset.range;
      document.querySelectorAll(".range-button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      refreshPage();
    });
  });
}

function bindActions() {
  document.getElementById("capture-button").addEventListener("click", async () => {
    setStatus("Capturing");
    try {
      await fetchJson("/api/archive/capture", { method: "POST" });
      setStatus("Snapshot captured");
      refreshPage();
    } catch (error) {
      console.error(error);
      setStatus("Capture failed");
    }
  });
}

async function refreshPage({ showLoading = true } = {}) {
  syncRangeSelectorVisibility();
  clearLiveRefresh();
  const requestKey = currentRequestKey();
  if (state.loadingKey === requestKey) {
    return;
  }
  state.loadingKey = requestKey;
  const requestSequence = ++state.requestSequence;

  if (showLoading) {
    setStatus("Loading...");
    renderRequestState("Loading...", loadingMessageForRequest());
  }

  try {
    if (state.page === "realtime") {
      const [payload, sceneRoleStyles] = await Promise.all([
        fetchJson("/api/live/overview"),
        loadSceneRoleStyles(),
      ]);
      if (requestSequence !== state.requestSequence) {
        return;
      }
      renderRealtime(payload, sceneRoleStyles);
      state.liveTimer = window.setTimeout(
        () => refreshPage({ showLoading: false }),
        payload.refresh_seconds * 1000
      );
      return;
    }

    if (state.page === "historical") {
      const payload = await fetchJson(`/api/history/overview?range=${state.range}`);
      if (requestSequence !== state.requestSequence) {
        return;
      }
      renderHistorical(payload);
      return;
    }

    const payload = await fetchJson(`/api/history/tokens?range=${state.range}`);
    if (requestSequence !== state.requestSequence) {
      return;
    }
    renderTokens(payload);
  } catch (error) {
    if (requestSequence !== state.requestSequence) {
      return;
    }
    console.error(error);
    setStatus("Load failed");
    renderFailureState("The latest data request failed. Retry the same page or range to fetch a fresh payload.");
  } finally {
    if (state.loadingKey === requestKey) {
      state.loadingKey = null;
    }
  }
}

function syncRangeSelectorVisibility() {
  const rangeSelector = document.querySelector(".range-selector");
  if (!rangeSelector) {
    return;
  }
  const shouldShow = state.page === "historical" || state.page === "tokens";
  rangeSelector.hidden = !shouldShow;
  rangeSelector.setAttribute("aria-hidden", shouldShow ? "false" : "true");
}

function clearLiveRefresh() {
  if (state.liveTimer) {
    window.clearTimeout(state.liveTimer);
    state.liveTimer = null;
  }
}

function setStatus(label) {
  document.getElementById("status-pill").textContent = label;
}

function renderRequestState(title, message) {
  const root = document.getElementById("page-root");
  root.setAttribute("aria-busy", "true");
  root.innerHTML = `
    <section class="panel loading-state">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
    </section>
  `;
}

function renderFailureState(message) {
  const root = document.getElementById("page-root");
  root.setAttribute("aria-busy", "false");
  root.innerHTML = `
    <section class="panel loading-state">
      <h2>Load failed</h2>
      <p>${escapeHtml(message)}</p>
    </section>
  `;
}

function loadingMessageForRequest() {
  if (state.page === "realtime") {
    return "Fetching live runtime state.";
  }
  if (state.page === "historical") {
    return `Loading ${displayRange(state.range)} archive history.`;
  }
  return `Loading ${displayRange(state.range)} token statistics.`;
}

function currentRequestKey() {
  return `${state.page}:${state.page === "realtime" ? "live" : state.range}`;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function renderRealtime(payload, sceneRoleStyles) {
  document.getElementById("page-root").setAttribute("aria-busy", "false");
  setStatus(`Live · ${formatDateTime(payload.captured_at)}`);
  const root = document.getElementById("page-root");
  const totalGatewayCount = lookupGatewayCount(payload.gateways, "total");
  const gatewayExitCount = findGatewayCount(payload.gateways, "exits_today");
  const activeAgents = [...payload.agent_sessions]
    .filter((item) => item.active_sessions > 0)
    .sort((left, right) => right.active_sessions - left.active_sessions || String(left.agent_name).localeCompare(String(right.agent_name)));
  const idleAgents = [...payload.agent_sessions]
    .filter((item) => item.active_sessions === 0)
    .sort((left, right) => right.total_sessions - left.total_sessions || String(left.agent_name).localeCompare(String(right.agent_name)));
  const sceneModel = buildRealtimeSceneModel(payload, activeAgents, idleAgents, sceneRoleStyles);

  root.innerHTML = `
    <section class="metric-grid">
      ${metricCard("Active sessions", payload.session_overview.active_sessions, "Live runtime state")}
      ${metricCard("Total sessions", payload.session_overview.total_sessions, "Live runtime state")}
      ${metricCard("Idle sessions", payload.session_overview.idle_sessions, "Derived from total-active")}
      ${metricCard("Gateways", totalGatewayCount, "Current known total")}
      ${metricCard("Gateway exits today", gatewayExitCount ?? "Unavailable", "Structured runtime value when available, otherwise a systemd journal exit-event count")}
    </section>
    <section class="panel panel-scene-shell">
      <div class="panel-header">
        <div>
          <h2>Realtime Claw Scene</h2>
          <p class="panel-subtitle">Blue-primary control room scene with lounge-resting idle agents, active workstation desks, hanging nameplates, and config-driven role styling. Parallel task count currently uses the live active_sessions field until OpenClaw publishes first-class per-agent task totals.</p>
        </div>
        <p class="meta-line">Scene-first live view</p>
      </div>
      ${renderRealtimeScene(sceneModel)}
      <p class="scene-footnote">Hover cards currently expose the live agent name plus backend-hooked placeholders for ThinkingLevel and latest user input when that runtime detail is absent. Role styling is data-driven from <code>/assets/scene-role-styles.json</code>.</p>
    </section>
    <section class="panel-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Active Sessions by Agent</h2>
            <p class="panel-subtitle">Only agents with active sessions greater than zero, sorted descending.</p>
          </div>
          <p class="meta-line">Live runtime</p>
        </div>
        ${renderBarList(activeAgents, "agent_name", "active_sessions", "sessions")}
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Delivery Queue Depth</h2>
            <p class="panel-subtitle">The bundled OpenClaw adapter reads the real OpenClaw delivery queue on disk and reports pending versus failed queue-item counts. Runtime queue lanes are only used as a fallback when that delivery queue path is unavailable.</p>
          </div>
          <p class="meta-line">Live runtime</p>
        </div>
        ${renderBarList(payload.queue_lanes, "lane_name", "depth", "queued", formatQueueLabel)}
      </section>
    </section>
    <section class="panel-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Session States</h2>
            <p class="panel-subtitle">Current session-state breakdown.</p>
          </div>
        </div>
        ${renderKeyValueList(payload.session_states, "state_name", "session_count")}
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Gateway Counts</h2>
            <p class="panel-subtitle">Total count is always included. Today’s exit count prefers structured runtime data and otherwise uses a conservative systemd journal heuristic.</p>
          </div>
        </div>
        ${renderKeyValueList(payload.gateways, "gateway_group", "gateway_count", formatGatewayGroupLabel)}
      </section>
    </section>
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Agent Session Table</h2>
          <p class="panel-subtitle">Compact per-agent active and total session totals from the live source.</p>
        </div>
        <p class="meta-line">${payload.source_version}</p>
      </div>
      ${renderTable(payload.agent_sessions, [
        { key: "agent_name", label: "Agent" },
        { key: "role_style_key", label: "Role style" },
        { key: "active_sessions", label: "Active", mono: true },
        { key: "total_sessions", label: "Total", mono: true },
      ])}
    </section>
  `;
  bindSceneTooltips(root);
}

async function loadSceneRoleStyles() {
  if (state.sceneRoleStyles) {
    return state.sceneRoleStyles;
  }
  try {
    const payload = await fetchJson("/assets/scene-role-styles.json");
    state.sceneRoleStyles = normalizeSceneRoleStyles(payload);
  } catch (error) {
    console.warn("Failed to load scene role styles; using defaults.", error);
    state.sceneRoleStyles = normalizeSceneRoleStyles(defaultSceneRoleStyles);
  }
  return state.sceneRoleStyles;
}

function normalizeSceneRoleStyles(payload) {
  const source = payload && typeof payload === "object" ? payload : defaultSceneRoleStyles;
  const roles = {
    ...defaultSceneRoleStyles.roles,
    ...(source.roles || {}),
  };
  return {
    defaultRoleStyle: source.defaultRoleStyle || defaultSceneRoleStyles.defaultRoleStyle,
    roles,
    agents: source.agents || {},
  };
}

function buildRealtimeSceneModel(payload, activeAgents, idleAgents, sceneRoleStyles) {
  const rankedRoster = [...payload.agent_sessions].sort((left, right) =>
    right.active_sessions - left.active_sessions ||
    right.total_sessions - left.total_sessions ||
    String(left.agent_name).localeCompare(String(right.agent_name))
  );
  const loungeSource = idleAgents[0] || null;
  return {
    officeAgents: rankedRoster.slice(0, referenceSceneLayout.activeSlots.length).map((agent, index) => createSceneAgent(agent, index, "active", sceneRoleStyles)),
    loungeAgent: loungeSource ? createSceneAgent(loungeSource, 0, "idle", sceneRoleStyles) : null,
    activeWorkerCount: activeAgents.length,
    restingWorkerCount: idleAgents.length,
    rosterOverflow: Math.max(rankedRoster.length - referenceSceneLayout.activeSlots.length, 0),
    captureStatus: payload.capture_status,
  };
}

function createSceneAgent(agent, index, stateKey, sceneRoleStyles) {
  const roleStyle = resolveSceneRoleStyle(agent, sceneRoleStyles, index);
  return {
    id: slugify(agent.agent_name || `agent-${index}`),
    name: agent.agent_name,
    activeSessions: Number(agent.active_sessions || 0),
    totalSessions: Number(agent.total_sessions || 0),
    taskCount: Number(agent.active_sessions || 0),
    roleStyleKey: agent.role_style_key || roleStyle.key,
    roleStyle,
    sceneState: stateKey,
    thinkingLevel: agent.thinking_level || null,
    latestUserInput: agent.latest_user_input || null,
    deskLabel: stateKey === "active" ? `Desk ${index + 1}` : "Lounge",
  };
}

function resolveSceneRoleStyle(agent, sceneRoleStyles, index) {
  const styles = sceneRoleStyles || defaultSceneRoleStyles;
  const roleKey = agent.role_style_key || styles.agents?.[agent.agent_name] || styles.defaultRoleStyle;
  const role = styles.roles?.[roleKey] || styles.roles?.[styles.defaultRoleStyle] || defaultSceneRoleStyles.roles.general_operator;
  const badgeBase = role.badge || String(agent.agent_name || "AG").slice(0, 2).toUpperCase();
  return {
    key: roleKey,
    label: role.label || roleKey,
    badge: badgeBase,
    accent: role.accent || palette[index % palette.length],
    accentSoft: role.accentSoft || "rgba(100, 192, 255, 0.18)",
    outfit: role.outfit || "#2c5f96",
    deskGlow: role.deskGlow || "rgba(100, 192, 255, 0.24)",
    hair: role.hair || "#1f2b42",
    skin: role.skin || "#f0c7a1",
  };
}

function renderRealtimeScene(model) {
  return `
    <div class="scene-board">
      <div class="scene-header-strip">
        <span class="scene-header-chip">Capture ${escapeHtml(String(model.captureStatus))}</span>
        <span class="scene-header-chip">${formatNumber(model.activeWorkerCount)} active workers</span>
        <span class="scene-header-chip">${formatNumber(model.restingWorkerCount)} resting</span>
      </div>
      <div class="scene-room">
        <img class="scene-reference-base" src="/assets/assets/reference-scene-base.jpg" alt="" aria-hidden="true" />
        ${referenceSceneLayout.activeSlots
          .map((slot, index) => {
            const agent = model.officeAgents[index];
            return agent ? renderReferenceActiveSlot(agent, slot) : "";
          })
          .join("")}
        ${referenceSceneLayout.idleSlots
          .map((slot, index) => {
            const agent = index === 0 ? model.loungeAgent : null;
            return agent ? renderReferenceIdleSlot(agent, slot) : "";
          })
          .join("")}
        ${model.rosterOverflow ? `<div class="scene-overflow-pill scene-overflow-pill-active">+${formatNumber(model.rosterOverflow)} more tracked</div>` : ""}
      </div>
    </div>
  `;
}

function renderReferenceActiveSlot(agent, slot) {
  const tooltipPayload = escapeAttribute(JSON.stringify(buildSceneTooltipPayload(agent)));
  return `
    <article class="scene-reference-slot scene-reference-slot-active" style="--scene-accent:${escapeAttribute(agent.roleStyle.accent)}; --scene-accent-soft:${escapeAttribute(agent.roleStyle.accentSoft)}; --scene-desk-glow:${escapeAttribute(agent.roleStyle.deskGlow)};">
      <button
        type="button"
        class="scene-reference-hotspot scene-reference-hotspot-active"
        style="${styleFromRect(slot.character)}"
        data-scene-tooltip='${tooltipPayload}'
        aria-label="${escapeAttribute(buildSceneAriaLabel(agent, "active desk"))}"
      ></button>
      <div class="scene-reference-tag" style="${styleFromRect(slot.tag)}" data-scene-tooltip='${tooltipPayload}'>
        <span class="scene-reference-tag-text">${escapeHtml(formatSceneTagText(agent))}</span>
      </div>
    </article>
  `;
}

function renderReferenceIdleSlot(agent, slot) {
  const tooltipPayload = escapeAttribute(JSON.stringify(buildSceneTooltipPayload(agent)));
  return `
    <article class="scene-reference-slot scene-reference-slot-idle" style="--scene-accent:${escapeAttribute(agent.roleStyle.accent)}; --scene-accent-soft:${escapeAttribute(agent.roleStyle.accentSoft)}; --scene-desk-glow:${escapeAttribute(agent.roleStyle.deskGlow)};">
      <button
        type="button"
        class="scene-reference-hotspot scene-reference-hotspot-idle"
        style="${styleFromRect(slot.character)}"
        data-scene-tooltip='${tooltipPayload}'
        aria-label="${escapeAttribute(buildSceneAriaLabel(agent, "idle lounge seat"))}"
      ></button>
      <div class="scene-reference-tag scene-reference-tag-idle" style="${styleFromRect(slot.tag)}" data-scene-tooltip='${tooltipPayload}'>
        <span class="scene-reference-tag-text">${escapeHtml(formatSceneTagText(agent))}</span>
      </div>
    </article>
  `;
}

function styleFromRect(rect) {
  return `top:${rect.top}%;left:${rect.left}%;width:${rect.width}%;height:${rect.height}%;`;
}

function formatSceneTagText(agent) {
  return `${agent.name} (${formatNumber(agent.taskCount)})`;
}

function buildSceneAriaLabel(agent, areaLabel) {
  return `${agent.name}, ${formatTaskCount(agent.taskCount)}, ${areaLabel}`;
}

function buildSceneTooltipPayload(agent) {
  return {
    agentName: agent.name,
    roleStyle: agent.roleStyle.label,
    thinkingLevel: agent.thinkingLevel || "Deferred — backend field not yet exposed",
    latestUserInput: agent.latestUserInput || "Deferred — backend must expose latest user input content for this session/agent.",
  };
}

function bindSceneTooltips(scope) {
  const tooltip = ensureSceneTooltip(scope);
  scope.querySelectorAll("[data-scene-tooltip]").forEach((node) => {
    const showTooltip = (event) => {
      const payload = parseSceneTooltipPayload(node.dataset.sceneTooltip);
      tooltip.hidden = false;
      tooltip.innerHTML = `
        <span class="scene-tooltip-title">${escapeHtml(payload.agentName || "Unknown agent")}</span>
        <span class="scene-tooltip-row"><strong>Role</strong><span>${escapeHtml(payload.roleStyle || "Unknown")}</span></span>
        <span class="scene-tooltip-row"><strong>ThinkingLevel</strong><span>${escapeHtml(payload.thinkingLevel || "Unavailable")}</span></span>
        <span class="scene-tooltip-row scene-tooltip-row-multiline"><strong>Latest user input</strong><span>${escapeHtml(payload.latestUserInput || "Unavailable")}</span></span>
      `;
      positionSceneTooltip(tooltip, event);
    };
    node.addEventListener("mouseenter", showTooltip);
    node.addEventListener("mousemove", (event) => positionSceneTooltip(tooltip, event));
    node.addEventListener("mouseleave", () => {
      tooltip.hidden = true;
    });
  });
}

function ensureSceneTooltip(scope) {
  let tooltip = scope.querySelector(".scene-hover-tooltip");
  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.className = "scene-hover-tooltip";
    tooltip.hidden = true;
    scope.appendChild(tooltip);
  }
  return tooltip;
}

function positionSceneTooltip(tooltip, event) {
  const rect = document.getElementById("page-root").getBoundingClientRect();
  const left = Math.min(Math.max(event.clientX - rect.left + 12, 12), Math.max(rect.width - tooltip.offsetWidth - 16, 12));
  const top = Math.min(Math.max(event.clientY - rect.top + 12, 12), Math.max(rect.height - tooltip.offsetHeight - 16, 12));
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function parseSceneTooltipPayload(rawValue) {
  try {
    const parsed = JSON.parse(rawValue || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function formatTaskCount(value) {
  const count = Number(value || 0);
  return `${formatNumber(count)} task${count === 1 ? "" : "s"}`;
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "agent";
}

function renderHistorical(payload) {
  document.getElementById("page-root").setAttribute("aria-busy", "false");
  setStatus(`${payload.mode_label} · ${displayRange(state.range)}`);
  const root = document.getElementById("page-root");
  if (!payload.points.length) {
    root.innerHTML = document.getElementById("empty-state-template").innerHTML;
    return;
  }

  const activeSeries = payload.points.map((point) => ({
    x: labelForPoint(point, payload.mode),
    y: point.session_overview.active_sessions,
  }));
  const totalSeries = payload.points.map((point) => ({
    x: labelForPoint(point, payload.mode),
    y: point.session_overview.total_sessions,
  }));
  const idleSeries = payload.points.map((point) => ({
    x: labelForPoint(point, payload.mode),
    y: point.session_overview.idle_sessions,
  }));
  const agentActiveSeries = mapSeries(payload.points, "agent_sessions", "agent_name", "active_sessions", payload.mode);
  const agentTotalSeries = mapSeries(payload.points, "agent_sessions", "agent_name", "total_sessions", payload.mode);
  const sessionStateSeries = mapSeries(payload.points, "session_states", "state_name", "session_count", payload.mode);
  const sessionTypeSeries = mapSeries(payload.points, "session_types", "session_type", "session_count", payload.mode);
  const queueSeries = mapSeries(payload.points, "queue_lanes", "lane_name", "depth", payload.mode);
  const gatewaySeries = mapSeries(payload.points, "gateways", "gateway_group", "gateway_count", payload.mode);
  const tokenModelSeries = collapseTokenSeries(payload.points, "model", payload.mode);
  const tokenProviderSeries = collapseTokenSeries(payload.points, "provider", payload.mode);
  const tokenChannelSeries = collapseTokenSeries(payload.points, "channel", payload.mode, true);
  const latestPoint = payload.points[payload.points.length - 1];
  const latestPersistentSessions = findSessionTypeCount(latestPoint.session_types, "persistent");
  const latestOneShotSessions = findSessionTypeCount(latestPoint.session_types, "one_shot");

  root.innerHTML = `
    <section class="metric-grid">
      ${metricCard("Archive mode", payload.mode === "intra_day_sampled" ? "Sampled" : "Daily last", `${payload.cadence_minutes}-minute archive cadence`)}
      ${metricCard("Archived points", payload.points.length, displayRange(state.range))}
      ${metricCard("Latest active sessions", activeSeries[activeSeries.length - 1].y, "Selected archive record")}
      ${metricCard("Latest persistent sessions", latestPersistentSessions, "Conservative OpenClaw session-key classification")}
      ${metricCard("Latest one-shot sessions", latestOneShotSessions, "Conservative OpenClaw session-key classification")}
      ${metricCard("Latest gateways", latestSeriesValue(gatewaySeries.total), "Selected archive record")}
      ${metricCard("Gateway exits today", gatewaySeries.exits_today ? latestSeriesValue(gatewaySeries.exits_today) : "Unavailable", "Captured from the live source at each archive snapshot")}
    </section>
    <section class="chart-grid">
      ${panelChart("Session Statistics", "Archive-backed session totals aligned to sampled/current-day or daily-last summary semantics.", [
        { name: "Total", values: totalSeries },
        { name: "Active", values: activeSeries },
        { name: "Idle", values: idleSeries },
      ])}
      ${panelPieChart("Session Type Totals", "Latest archived Persistent vs One-Shot totals. OpenClaw's public session rows do not expose a first-class mode field, so the bundled adapter classifies types conservatively from stable session-key conventions.", latestPoint.session_types, "session_type", "session_count", formatSessionTypeLabel)}
      ${panelChart("Gateway Reliability", "Gateway exit counts are archived with each snapshot. Exit totals prefer structured runtime data and otherwise use a conservative systemd journal heuristic.", seriesObjectToList(gatewaySeries, formatGatewayGroupLabel))}
      ${panelChart("Active Sessions by Agent", "Separate series remain separate objects rather than flattened aggregates.", seriesObjectToList(agentActiveSeries))}
      ${panelChart("Session State", "Historical state counts from archived samples.", seriesObjectToList(sessionStateSeries))}
      ${panelChart("Delivery Queue Depth", "Archived queue depth reflects the real OpenClaw delivery queue on disk as pending versus failed items. Runtime lane data is only used as a fallback when that queue path is unavailable.", seriesObjectToList(queueSeries, formatQueueLabel))}
      ${panelChart("Agent Session Count", "Per-agent total session counts.", seriesObjectToList(agentTotalSeries))}
      ${panelChart("Token Throughput by Model", "Historical token counters within approved scope.", seriesObjectToList(tokenModelSeries), { valueFormat: "token" })}
    </section>
    <section class="table-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Agent Activity Statistics</h2>
            <p class="panel-subtitle">Latest archived agent totals for the selected range.</p>
          </div>
        </div>
        ${renderTable(latestEntries(latestPoint.agent_sessions, "agent_name"), [
          { key: "agent_name", label: "Agent" },
          { key: "active_sessions", label: "Active", mono: true },
          { key: "total_sessions", label: "Total", mono: true },
        ])}
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Gateway Counts</h2>
            <p class="panel-subtitle">Today’s exit count is retained in the archive so operators can compare gateway stability across sampled history.</p>
          </div>
        </div>
        ${renderTable(latestEntries(latestPoint.gateways, "gateway_group"), [
          { key: "gateway_group", label: "Group", format: formatGatewayGroupLabel },
          { key: "gateway_count", label: "Count", mono: true },
        ])}
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Token Series Summary</h2>
            <p class="panel-subtitle">Provider and channel views included only when present in the archive.</p>
          </div>
        </div>
        ${renderMiniSeriesSummary(tokenProviderSeries, tokenChannelSeries)}
      </section>
    </section>
  `;
  bindChartTooltips(root);
}

function renderTokens(payload) {
  document.getElementById("page-root").setAttribute("aria-busy", "false");
  setStatus(`${payload.selection_label} · ${displayRange(state.range)}`);
  const root = document.getElementById("page-root");
  if (!payload.daily_records.length) {
    root.innerHTML = document.getElementById("empty-state-template").innerHTML;
    return;
  }

  root.innerHTML = `
    <section class="metric-grid">
      ${metricCard("Input tokens", formatTokenCount(payload.total_input_tokens), payload.selection_description)}
      ${metricCard("Output tokens", formatTokenCount(payload.total_output_tokens), payload.selection_description)}
      ${metricCard("Cache hit ratio", payload.has_cache_data ? formatPercent(payload.cache_hit_ratio) : "Unavailable", "Derived from archived cacheRead/cacheWrite counters when the runtime exposes them")}
      ${metricCard("Cached input tokens", payload.has_cache_data ? formatTokenCount(payload.total_cache_read_tokens) : "Unavailable", payload.selection_description)}
      ${metricCard("Daily records", payload.daily_records.length, displayRange(state.range))}
      ${metricCard("Channel breakdown", payload.has_channel_data ? "Available" : "Hidden", "Rendered only when archive data includes channel")}
    </section>
    <section class="token-grid">
      ${distributionPanel("Provider distribution", payload.provider_distribution)}
      ${distributionPanel("Model distribution", payload.model_distribution)}
      ${distributionPanel("Channel distribution", payload.has_channel_data ? payload.channel_distribution : [])}
    </section>
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Daily Archived Token Totals</h2>
          <p class="panel-subtitle">${escapeHtml(payload.selection_description)}</p>
        </div>
      </div>
      ${renderTable(payload.daily_records, [
        { key: "day_key", label: "Day" },
        { key: "captured_at", label: "Captured At", format: formatDateTime },
        { key: "input_tokens", label: "Input", mono: true, format: formatTokenCount },
        { key: "output_tokens", label: "Output", mono: true, format: formatTokenCount },
        { key: "cache_read_tokens", label: "Cache Read", mono: true, format: formatTokenCount },
        { key: "cache_hit_ratio", label: "Hit Ratio", mono: true, format: formatPercentOrBlank },
      ])}
    </section>
  `;
}

function metricCard(label, value, footnote) {
  return `
    <section class="metric-card">
      <p class="subtle-label">${label}</p>
      <div class="metric-value">${value}</div>
      <div class="metric-footnote">${footnote}</div>
    </section>
  `;
}

function renderBarList(items, labelKey, valueKey, suffix, labelFormatter = null, valueFormatter = formatNumber) {
  if (!items.length) {
    return `<div class="chart-empty">No data</div>`;
  }
  const maxValue = Math.max(...items.map((item) => item[valueKey]), 1);
  return `
    <div class="bar-list">
      ${items
        .map((item) => {
          const width = (item[valueKey] / maxValue) * 100;
          return `
            <div class="bar-row">
              <div>${labelFormatter ? labelFormatter(item[labelKey]) : item[labelKey]}</div>
              <div class="bar-track"><div class="bar-fill" style="width: ${width}%"></div></div>
              <div class="mono">${valueFormatter(item[valueKey])} ${suffix}</div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderKeyValueList(items, keyField, valueField, labelFormatter = null) {
  if (!items.length) {
    return `<div class="chart-empty">No data</div>`;
  }
  return `
    <div class="key-value-list">
      ${items
        .map(
          (item) => `
            <div class="bar-row">
              <div>${labelFormatter ? labelFormatter(item[keyField]) : item[keyField]}</div>
              <div class="bar-track"><div class="bar-fill" style="width: 100%"></div></div>
              <div class="mono">${formatNumber(item[valueField])}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTable(rows, columns) {
  return `
    <table class="table">
      <thead>
        <tr>${columns.map((column) => `<th>${column.label}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${rows
          .map((row) => {
            const cells = columns.map((column) => {
              const rawValue = row[column.key];
              const value = column.format ? column.format(rawValue) : rawValue;
              const className = column.mono ? "mono" : "";
              return `<td class="${className}">${value ?? ""}</td>`;
            });
            return `<tr>${cells.join("")}</tr>`;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function panelChart(title, subtitle, seriesList, options = {}) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>${title}</h2>
          <p class="panel-subtitle">${subtitle}</p>
        </div>
      </div>
      ${renderLineChart(seriesList, options)}
    </section>
  `;
}

function panelPieChart(title, subtitle, rows, labelKey, valueKey, labelFormatter = null) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>${title}</h2>
          <p class="panel-subtitle">${subtitle}</p>
        </div>
      </div>
      ${renderPieChart(rows, labelKey, valueKey, labelFormatter)}
    </section>
  `;
}

function renderLineChart(seriesList, options = {}) {
  const filtered = seriesList.filter((item) => item.values && item.values.length);
  if (!filtered.length) {
    return `<div class="chart-empty">No data</div>`;
  }
  const valueFormat = options.valueFormat || "number";
  const width = 640;
  const height = 280;
  const inset = { top: 16, right: 18, bottom: 34, left: 56 };
  const allValues = filtered.flatMap((series) => series.values.map((value) => value.y));
  const step = niceStep(Math.max(...allValues, 1) / 4);
  const maxValue = Math.max(step * 4, Math.max(...allValues, 1));
  const xLabels = collectOrderedLabels(filtered);
  const xCount = Math.max(xLabels.length - 1, 1);
  const plotWidth = width - inset.left - inset.right;
  const plotHeight = height - inset.top - inset.bottom;
  const xPositions = Object.fromEntries(
    xLabels.map((label, index) => [
      label,
      inset.left + (index / xCount) * plotWidth,
    ])
  );
  const yScale = (value) => height - inset.bottom - (value / maxValue) * plotHeight;
  const xScale = (label) => xPositions[label] ?? inset.left;

  const yTicks = [];
  for (let value = 0; value <= maxValue; value += step) {
    yTicks.push(value);
  }

  const grid = yTicks
    .map((value) => {
      const y = yScale(value);
      return `
        <line class="chart-grid-line" x1="${inset.left}" y1="${y}" x2="${width - inset.right}" y2="${y}" />
        <text class="chart-grid-label" x="${inset.left - 8}" y="${y + 4}" text-anchor="end">${formatValueByType(value, valueFormat)}</text>
      `;
    })
    .join("");

  const polylines = filtered
    .map((series, index) => {
      const points = series.values
        .map((item) => `${xScale(item.x)},${yScale(item.y)}`)
        .join(" ");
      return `<polyline fill="none" stroke="${palette[index % palette.length]}" stroke-width="2.5" points="${points}" />`;
    })
    .join("");

  const pointMarkers = filtered
    .map((series, index) =>
      series.values
        .map((item) => {
          const cx = xScale(item.x);
          const cy = yScale(item.y);
          const color = palette[index % palette.length];
          return `<circle class="chart-point" cx="${cx}" cy="${cy}" r="4.5" stroke="${color}" stroke-width="2.5" />`;
        })
        .join("")
    )
    .join("");

  const seriesValueLookup = Object.fromEntries(
    filtered.map((series, index) => [
      series.name,
      {
        color: palette[index % palette.length],
        byLabel: Object.fromEntries(series.values.map((item) => [item.x, item.y])),
      },
    ])
  );
  const hoverBuckets = xLabels
    .map((label, index) => {
      const current = xScale(label);
      const left = index === 0 ? inset.left : (xScale(xLabels[index - 1]) + current) / 2;
      const right = index === xLabels.length - 1 ? width - inset.right : (current + xScale(xLabels[index + 1])) / 2;
      const bucketEntries = filtered
        .map((series) => {
          const value = seriesValueLookup[series.name].byLabel[label];
          if (value === undefined) {
            return null;
          }
          return {
            name: series.name,
            value,
            color: seriesValueLookup[series.name].color,
          };
        })
        .filter(Boolean);
      return `
        <rect
          class="chart-hover-target"
          x="${left}"
          y="${inset.top}"
          width="${Math.max(right - left, 1)}"
          height="${plotHeight}"
          fill="transparent"
          data-label="${escapeAttribute(label)}"
          data-points="${escapeAttribute(JSON.stringify(bucketEntries))}"
        />
      `;
    })
    .join("");

  const labels = xLabels
    .map((label, index) => {
      if (xLabels.length > 8 && index % 2 === 1) {
        return "";
      }
      return `<text class="chart-axis-label" x="${xScale(label)}" y="${height - 8}" text-anchor="middle">${escapeHtml(label)}</text>`;
    })
    .join("");

  return `
    <div class="chart-shell" data-value-format="${escapeAttribute(valueFormat)}">
      <svg class="chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        ${grid}
        <line class="chart-axis-line" x1="${inset.left}" y1="${height - inset.bottom}" x2="${width - inset.right}" y2="${height - inset.bottom}" />
        <line class="chart-axis-line" x1="${inset.left}" y1="${inset.top}" x2="${inset.left}" y2="${height - inset.bottom}" />
        ${polylines}
        ${pointMarkers}
        ${hoverBuckets}
        ${labels}
      </svg>
      <div class="chart-tooltip" hidden></div>
    </div>
    <div class="chart-legend">
      ${filtered
        .map(
          (series, index) => `
            <span class="legend-item">
              <span class="legend-swatch" style="background: ${palette[index % palette.length]}"></span>
              <span>${series.name}</span>
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPieChart(rows, labelKey, valueKey, labelFormatter = null) {
  if (!rows.length) {
    return `<div class="chart-empty">No data</div>`;
  }
  const total = rows.reduce((sum, row) => sum + Number(row[valueKey] || 0), 0);
  if (!total) {
    return `<div class="chart-empty">No data</div>`;
  }
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const segments = rows
    .map((row, index) => {
      const value = Number(row[valueKey] || 0);
      const segmentLength = (value / total) * circumference;
      const segment = `
        <circle
          class="pie-segment"
          cx="140"
          cy="130"
          r="${radius}"
          fill="none"
          stroke="${palette[index % palette.length]}"
          stroke-width="28"
          stroke-dasharray="${segmentLength} ${circumference - segmentLength}"
          stroke-dashoffset="${-offset}"
          transform="rotate(-90 140 130)"
        />
      `;
      offset += segmentLength;
      return segment;
    })
    .join("");

  return `
    <div class="pie-panel">
      <svg class="pie-chart" viewBox="0 0 280 260" preserveAspectRatio="xMidYMid meet">
        ${segments}
        <circle cx="140" cy="130" r="54" fill="rgba(9, 14, 22, 0.92)"></circle>
        <text class="pie-total-label" x="140" y="122" text-anchor="middle">Latest total</text>
        <text class="pie-total-value" x="140" y="146" text-anchor="middle">${formatNumber(total)}</text>
      </svg>
      <div class="chart-legend">
        ${rows
          .map((row, index) => `
            <span class="legend-item">
              <span class="legend-swatch" style="background: ${palette[index % palette.length]}"></span>
              <span>${labelFormatter ? labelFormatter(row[labelKey]) : row[labelKey]} · ${formatNumber(row[valueKey])} (${formatPercent(Number(row[valueKey]) / total)})</span>
            </span>
          `)
          .join("")}
      </div>
    </div>
  `;
}

function distributionPanel(title, rows) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>${title}</h2>
          <p class="panel-subtitle">Totals remain within approved token statistics scope.</p>
        </div>
      </div>
      ${rows.length ? renderBarList(rows, "name", "total_tokens", "tokens", null, formatTokenCount) : `<div class="chart-empty">No data</div>`}
    </section>
  `;
}

function mapSeries(points, collectionKey, nameKey, valueKey, mode) {
  const result = {};
  points.forEach((point) => {
    point[collectionKey].forEach((item) => {
      const label = item[nameKey];
      if (!result[label]) {
        result[label] = [];
      }
      result[label].push({ x: labelForPoint(point, mode), y: item[valueKey] });
    });
  });
  return result;
}

function collapseTokenSeries(points, field, mode, ignoreEmpty = false) {
  const result = {};
  points.forEach((point) => {
    const totals = {};
    point.token_counters.forEach((item) => {
      const key = item[field];
      if (!key && ignoreEmpty) {
        return;
      }
      const total = item.input_tokens + item.output_tokens;
      totals[key || "unspecified"] = (totals[key || "unspecified"] || 0) + total;
    });
    Object.entries(totals).forEach(([key, value]) => {
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push({ x: labelForPoint(point, mode), y: value });
    });
  });
  return result;
}

function seriesObjectToList(seriesObject, labelFormatter = null) {
  return Object.entries(seriesObject).map(([name, values]) => ({
    name: labelFormatter ? labelFormatter(name) : name,
    values,
  }));
}

function latestEntries(items, sortKey) {
  return [...items].sort((left, right) => String(left[sortKey]).localeCompare(String(right[sortKey])));
}

function latestSeriesValue(values = []) {
  if (!values || !values.length) {
    return 0;
  }
  return values[values.length - 1].y;
}

function renderMiniSeriesSummary(providerSeries, channelSeries) {
  const providerEntries = seriesObjectToList(providerSeries).map((item) => ({
    name: item.name,
    total_tokens: latestSeriesValue(item.values),
  }));
  const channelEntries = seriesObjectToList(channelSeries).map((item) => ({
    name: item.name,
    total_tokens: latestSeriesValue(item.values),
  }));
  return `
    <div class="list-table">
      <p class="subtle-label">Providers</p>
      ${providerEntries.length ? renderBarList(providerEntries, "name", "total_tokens", "tokens", null, formatTokenCount) : `<div class="chart-empty">No provider data</div>`}
      <p class="subtle-label">Channels</p>
      ${channelEntries.length ? renderBarList(channelEntries, "name", "total_tokens", "tokens", null, formatTokenCount) : `<div class="chart-empty">No channel data</div>`}
    </div>
  `;
}

function lookupGatewayCount(items, name) {
  const count = findGatewayCount(items, name);
  return count ?? 0;
}

function findGatewayCount(items, name) {
  const match = items.find((item) => item.gateway_group === name);
  return match ? match.gateway_count : null;
}

function formatGatewayGroupLabel(value) {
  return {
    total: "Total gateways",
    online: "Online gateways",
    offline: "Offline gateways",
    degraded: "Degraded gateways",
    exits_today: "Gateway exits today",
  }[value] || String(value).replaceAll("_", " ");
}

function formatQueueLabel(value) {
  return {
    delivery_queue_pending: "Pending delivery items",
    delivery_queue_failed: "Failed delivery items",
    queued_system_events: "Queued system events",
  }[value] || String(value).replaceAll("_", " ");
}

function formatSessionTypeLabel(value) {
  return {
    persistent: "Persistent",
    one_shot: "One-Shot",
  }[value] || String(value).replaceAll("_", " ");
}

function labelForPoint(point, mode) {
  if (mode === "intra_day_sampled") {
    return new Date(point.captured_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return point.capture_date.slice(5);
}

function displayRange(range) {
  return {
    current_day: "Current Day",
    last_7_days: "Last 7 Days",
    last_30_days: "Last 30 Days",
    last_90_days: "Last 90 Days",
  }[range];
}

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

function formatNumber(value) {
  return Number(value).toLocaleString();
}

function formatTokenCount(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "0";
  }
  if (Math.abs(numericValue) < 1000) {
    return formatNumber(numericValue);
  }
  const scaledValue = numericValue / 1000;
  const fractionDigits = Math.abs(scaledValue) >= 100 ? 0 : 1;
  return `${scaledValue.toLocaleString([], {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}K`;
}

function formatValueByType(value, type) {
  if (type === "token") {
    return formatTokenCount(value);
  }
  return formatNumber(value);
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "Unavailable";
  }
  return `${(value * 100).toFixed(value > 0 && value < 0.1 ? 1 : 0)}%`;
}

function formatPercentOrBlank(value) {
  return Number.isFinite(value) ? formatPercent(value) : "";
}

function collectOrderedLabels(seriesList) {
  const seen = new Set();
  const labels = [];
  seriesList.forEach((series) => {
    series.values.forEach((item) => {
      if (!seen.has(item.x)) {
        seen.add(item.x);
        labels.push(item.x);
      }
    });
  });
  return labels;
}

function niceStep(rawValue) {
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return 1;
  }
  const exponent = Math.floor(Math.log10(rawValue));
  const fraction = rawValue / 10 ** exponent;
  if (fraction <= 1) {
    return 10 ** exponent;
  }
  if (fraction <= 2) {
    return 2 * 10 ** exponent;
  }
  if (fraction <= 5) {
    return 5 * 10 ** exponent;
  }
  return 10 * 10 ** exponent;
}

function bindChartTooltips(scope) {
  scope.querySelectorAll(".chart-shell").forEach((shell) => {
    const tooltip = shell.querySelector(".chart-tooltip");
    const valueFormat = shell.dataset.valueFormat || "number";
    shell.querySelectorAll(".chart-hover-target").forEach((point) => {
      const showTooltip = (event) => {
        const entries = parseTooltipEntries(point.dataset.points);
        tooltip.hidden = false;
        tooltip.innerHTML = `
          <span class="chart-tooltip-label">${escapeHtml(point.dataset.label || "")}</span>
          <div class="chart-tooltip-list">
            ${entries
              .map(
                (entry) => `
                  <div class="chart-tooltip-row">
                    <span class="chart-tooltip-series">
                      <span class="legend-swatch" style="background: ${escapeAttribute(entry.color)}"></span>
                      ${escapeHtml(entry.name)}
                    </span>
                    <span class="chart-tooltip-value">${escapeHtml(formatValueByType(entry.value, valueFormat))}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        `;
        positionTooltip(shell, tooltip, event);
      };
      point.addEventListener("mouseenter", showTooltip);
      point.addEventListener("mousemove", (event) => positionTooltip(shell, tooltip, event));
      point.addEventListener("mouseleave", () => {
        tooltip.hidden = true;
      });
    });
  });
}

function positionTooltip(shell, tooltip, event) {
  const rect = shell.getBoundingClientRect();
  const offsetX = event.clientX - rect.left;
  const offsetY = event.clientY - rect.top;
  const maxLeft = Math.max(rect.width - tooltip.offsetWidth - 8, 8);
  const maxTop = Math.max(rect.height - tooltip.offsetHeight - 8, 8);
  tooltip.style.left = `${Math.min(Math.max(offsetX, 8), maxLeft)}px`;
  tooltip.style.top = `${Math.min(Math.max(offsetY, 8), maxTop)}px`;
}

function parseTooltipEntries(rawValue) {
  try {
    const parsed = JSON.parse(rawValue || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function findSessionTypeCount(items, sessionType) {
  const match = items.find((item) => item.session_type === sessionType);
  return match ? match.session_count : 0;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
