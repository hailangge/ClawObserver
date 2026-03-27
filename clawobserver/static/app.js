const state = {
  page: "realtime",
  range: "current_day",
  liveTimer: null,
};

const palette = ["#64c0ff", "#5eb88d", "#d8aa5a", "#d16d73", "#7f9cf5", "#6fd0c4"];

document.addEventListener("DOMContentLoaded", () => {
  bindNavigation();
  bindActions();
  refreshPage();
});

function bindNavigation() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.page = button.dataset.page;
      document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      refreshPage();
    });
  });

  document.querySelectorAll(".range-button").forEach((button) => {
    button.addEventListener("click", () => {
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

async function refreshPage() {
  clearLiveRefresh();
  if (state.page === "realtime") {
    const payload = await fetchJson("/api/live/overview");
    renderRealtime(payload);
    state.liveTimer = window.setTimeout(refreshPage, payload.refresh_seconds * 1000);
    return;
  }

  if (state.page === "historical") {
    const payload = await fetchJson(`/api/history/overview?range=${state.range}`);
    renderHistorical(payload);
    return;
  }

  const payload = await fetchJson(`/api/history/tokens?range=${state.range}`);
  renderTokens(payload);
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

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function renderRealtime(payload) {
  setStatus(`Live · ${formatDateTime(payload.captured_at)}`);
  const root = document.getElementById("page-root");
  const totalGatewayCount = lookupGatewayCount(payload.gateways, "total");
  const gatewayExitCount = findGatewayCount(payload.gateways, "exits_today");
  const activeAgents = payload.agent_sessions.filter((item) => item.active_sessions > 0);

  root.innerHTML = `
    <section class="metric-grid">
      ${metricCard("Active sessions", payload.session_overview.active_sessions, "Live runtime state")}
      ${metricCard("Total sessions", payload.session_overview.total_sessions, "Live runtime state")}
      ${metricCard("Idle sessions", payload.session_overview.idle_sessions, "Derived from total-active")}
      ${metricCard("Gateways", totalGatewayCount, "Current known total")}
      ${metricCard("Gateway exits today", gatewayExitCount ?? "Unavailable", "Structured runtime value when available, otherwise a systemd journal exit-event count")}
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
        { key: "active_sessions", label: "Active", mono: true },
        { key: "total_sessions", label: "Total", mono: true },
      ])}
    </section>
  `;
}

function renderHistorical(payload) {
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
      ${panelChart("Token Throughput by Model", "Historical token counters within approved scope.", seriesObjectToList(tokenModelSeries))}
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
  setStatus(`${payload.selection_label} · ${displayRange(state.range)}`);
  const root = document.getElementById("page-root");
  if (!payload.daily_records.length) {
    root.innerHTML = document.getElementById("empty-state-template").innerHTML;
    return;
  }

  root.innerHTML = `
    <section class="metric-grid">
      ${metricCard("Input tokens", formatNumber(payload.total_input_tokens), "Summed from each day’s last archived record")}
      ${metricCard("Output tokens", formatNumber(payload.total_output_tokens), "Summed from each day’s last archived record")}
      ${metricCard("Cache hit ratio", payload.has_cache_data ? formatPercent(payload.cache_hit_ratio) : "Unavailable", "Derived from archived cacheRead/cacheWrite counters when the runtime exposes them")}
      ${metricCard("Cached input tokens", payload.has_cache_data ? formatNumber(payload.total_cache_read_tokens) : "Unavailable", "Read-side cache tokens across the selected daily end-state records")}
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
          <h2>Daily End-of-Day Token Records</h2>
          <p class="panel-subtitle">Current day uses the latest archived record. Cross-day totals sum daily end-state records.</p>
        </div>
      </div>
      ${renderTable(payload.daily_records, [
        { key: "day_key", label: "Day" },
        { key: "captured_at", label: "Captured At", format: formatDateTime },
        { key: "input_tokens", label: "Input", mono: true, format: formatNumber },
        { key: "output_tokens", label: "Output", mono: true, format: formatNumber },
        { key: "cache_read_tokens", label: "Cache Read", mono: true, format: formatNumber },
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

function renderBarList(items, labelKey, valueKey, suffix, labelFormatter = null) {
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
              <div class="mono">${formatNumber(item[valueKey])} ${suffix}</div>
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

function panelChart(title, subtitle, seriesList) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>${title}</h2>
          <p class="panel-subtitle">${subtitle}</p>
        </div>
      </div>
      ${renderLineChart(seriesList)}
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

function renderLineChart(seriesList) {
  const filtered = seriesList.filter((item) => item.values && item.values.length);
  if (!filtered.length) {
    return `<div class="chart-empty">No data</div>`;
  }
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
        <text class="chart-grid-label" x="${inset.left - 8}" y="${y + 4}" text-anchor="end">${formatNumber(value)}</text>
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
    <div class="chart-shell">
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
      ${rows.length ? renderBarList(rows, "name", "total_tokens", "tokens") : `<div class="chart-empty">No data</div>`}
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
      ${providerEntries.length ? renderBarList(providerEntries, "name", "total_tokens", "tokens") : `<div class="chart-empty">No provider data</div>`}
      <p class="subtle-label">Channels</p>
      ${channelEntries.length ? renderBarList(channelEntries, "name", "total_tokens", "tokens") : `<div class="chart-empty">No channel data</div>`}
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
                    <span class="chart-tooltip-value">${escapeHtml(formatNumber(entry.value))}</span>
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
