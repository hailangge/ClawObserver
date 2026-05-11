from __future__ import annotations

import json
import subprocess
import textwrap
import unittest
from pathlib import Path

APP_JS_PATH = Path(__file__).resolve().parents[1] / "clawobserver" / "static" / "app.js"
LAYOUT_JSON_PATH = (
    Path(__file__).resolve().parents[1]
    / "clawobserver"
    / "static"
    / "reference-scene-layout.json"
)


class RealtimeSceneLogicTests(unittest.TestCase):
    def test_idle_lounge_order_follows_canonical_desk_assignments(self) -> None:
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(APP_JS_PATH))}, "utf8");
            const context = {{
              console,
              setTimeout: () => 0,
              clearTimeout: () => {{}},
              fetch: async () => ({{ ok: true, json: async () => ({{}}) }}),
              window: {{}},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: () => ({{ setAttribute: () => {{}}, innerHTML: "", getBoundingClientRect: () => ({{ left: 0, top: 0, width: 0, height: 0 }}) }}),
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            const referenceSceneLayout = vm.runInContext("referenceSceneLayout", context);

            const payload = {{
              capture_status: "ok",
              queue_lanes: [],
              gateways: [],
              agent_sessions: [
                {{ agent_name: "operator", active_sessions: 1, total_sessions: 2, role_style_key: "operator" }},
                {{ agent_name: "reviewer", active_sessions: 0, total_sessions: 9, role_style_key: "reviewer" }},
                {{ agent_name: "planner", active_sessions: 2, total_sessions: 3, role_style_key: "planner" }},
                {{ agent_name: "researcher", active_sessions: 0, total_sessions: 1, role_style_key: "researcher" }},
              ],
            }};
            const sceneRoleStyles = context.normalizeSceneRoleStyles(context.defaultSceneRoleStyles);
            const model = context.buildRealtimeSceneModel(payload, sceneRoleStyles);

            console.log(JSON.stringify({{
              officeStates: model.officeAgents.slice(0, 4).map((agent) => ({{
                name: agent.name,
                sceneState: agent.sceneState,
                taskCount: agent.taskCount,
                statusLabel: context.formatSceneStateLabel(agent.sceneState),
              }})),
              idleLoungeAgents: model.idleLoungeAgents.map((agent) => agent.name),
              activeWorkerCount: model.activeWorkerCount,
              restingWorkerCount: model.restingWorkerCount,
            }}));
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertEqual(
            payload["officeStates"],
            [
                {"name": "planner", "sceneState": "active", "taskCount": 2, "statusLabel": "Working"},
                {"name": None, "sceneState": "unassigned", "taskCount": 0, "statusLabel": "Unassigned desk"},
                {"name": "operator", "sceneState": "active", "taskCount": 1, "statusLabel": "Working"},
                {"name": None, "sceneState": "unassigned", "taskCount": 0, "statusLabel": "Unassigned desk"},
            ],
        )
        self.assertEqual(payload["idleLoungeAgents"], ["researcher", "reviewer"])
        self.assertEqual(payload["activeWorkerCount"], 2)
        self.assertEqual(payload["restingWorkerCount"], 2)

    def test_scene_layout_config_matches_asset_analysis_boxes(self) -> None:
        expected_tags = [
            {"left": 6.25, "top": 13.1696, "width": 14.5, "height": 5.692},
            {"left": 24.5833, "top": 13.1696, "width": 14.5833, "height": 5.692},
            {"left": 42.9167, "top": 12.9464, "width": 14.6667, "height": 5.9152},
            {"left": 61.25, "top": 12.9464, "width": 14.75, "height": 5.9152},
            {"left": 79.5833, "top": 13.1696, "width": 14.5833, "height": 5.692},
            {"left": 4.0, "top": 44.1964, "width": 13.1667, "height": 4.9107},
            {"left": 23.6667, "top": 44.1964, "width": 13.1667, "height": 4.9107},
            {"left": 43.4167, "top": 44.1964, "width": 13.1667, "height": 4.9107},
            {"left": 63.1667, "top": 44.1964, "width": 13.1667, "height": 4.9107},
            {"left": 82.8333, "top": 44.1964, "width": 13.1667, "height": 4.9107},
        ]
        expected_desks = [
            {"left": 8.6667, "top": 20.3125, "width": 9.0, "height": 16.7411},
            {"left": 27.0, "top": 20.5357, "width": 8.8333, "height": 16.5179},
            {"left": 45.3333, "top": 20.3125, "width": 8.6667, "height": 16.7411},
            {"left": 63.8333, "top": 20.3125, "width": 8.6667, "height": 16.7411},
            {"left": 82.25, "top": 20.5357, "width": 8.5, "height": 16.5179},
            {"left": 7.25, "top": 48.8839, "width": 11.5, "height": 22.8795},
            {"left": 25.5833, "top": 48.8839, "width": 11.5, "height": 22.8795},
            {"left": 43.9167, "top": 48.8839, "width": 11.5, "height": 22.8795},
            {"left": 62.4167, "top": 48.8839, "width": 11.5, "height": 22.8795},
            {"left": 80.8333, "top": 48.8839, "width": 11.5, "height": 22.8795},
        ]
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(APP_JS_PATH))}, "utf8");
            const layoutPayload = JSON.parse(fs.readFileSync({json.dumps(str(LAYOUT_JSON_PATH))}, "utf8"));
            const context = {{
              console,
              setTimeout: () => 0,
              clearTimeout: () => {{}},
              fetch: async () => ({{ ok: true, json: async () => ({{}}) }}),
              window: {{}},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: () => ({{ setAttribute: () => {{}}, innerHTML: "", getBoundingClientRect: () => ({{ left: 0, top: 0, width: 0, height: 0 }}) }}),
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            const normalized = context.normalizeReferenceSceneLayout(layoutPayload);
            console.log(JSON.stringify({{
              tags: normalized.activeSlots.map((slot) => slot.tag),
              desks: normalized.activeSlots.map((slot) => slot.character),
              loungeArea: normalized.loungeArea,
              loungeSlots: normalized.idleSlots.map((slot) => slot.character),
            }}));
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertEqual(payload["tags"], expected_tags)
        self.assertEqual(payload["desks"], expected_desks)
        self.assertEqual(
            payload["loungeArea"],
            {"left": 18.3333, "top": 77.0089, "width": 72.5, "height": 22.9911},
        )
        self.assertEqual(
            payload["loungeSlots"],
            [
                {"left": 18.1667, "top": 78.5714, "width": 12.5, "height": 21.4286},
                {"left": 30.6667, "top": 78.125, "width": 14.0, "height": 21.875},
                {"left": 44.6667, "top": 78.0134, "width": 14.25, "height": 21.9866},
                {"left": 58.9167, "top": 78.125, "width": 14.5, "height": 21.875},
                {"left": 73.4167, "top": 78.3482, "width": 15.8333, "height": 21.6518},
            ],
        )

    def test_rendered_desk_slots_use_configured_plate_boxes_and_idle_desks_stay_empty(self) -> None:
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(APP_JS_PATH))}, "utf8");
            const context = {{
              console,
              setTimeout: () => 0,
              clearTimeout: () => {{}},
              fetch: async () => ({{ ok: true, json: async () => ({{}}) }}),
              window: {{}},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: () => ({{ setAttribute: () => {{}}, innerHTML: "", getBoundingClientRect: () => ({{ left: 0, top: 0, width: 0, height: 0 }}) }}),
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            const referenceSceneLayout = vm.runInContext("referenceSceneLayout", context);

            const payload = {{
              capture_status: "ok",
              queue_lanes: [],
              gateways: [],
              agent_sessions: [
                {{ agent_name: "beta", active_sessions: 1, total_sessions: 1, role_style_key: "operator", task_details: ["Check logs"] }},
                {{ agent_name: "reviewer", active_sessions: 0, total_sessions: 9, role_style_key: "reviewer", task_details: ["Confirm tag alignment"] }},
                {{ agent_name: "alpha", active_sessions: 1, total_sessions: 1, role_style_key: "operator", task_details: ["Triage queue"] }},
                {{ agent_name: "planner", active_sessions: 2, total_sessions: 3, role_style_key: "planner", task_details: ["Plan release validation"] }},
                {{ agent_name: "delta", active_sessions: 1, total_sessions: 1, role_style_key: "operator", task_details: ["Inspect gateway"] }},
                {{ agent_name: "researcher", active_sessions: 0, total_sessions: 1, role_style_key: "researcher", task_details: ["Summarize hover mismatch evidence"] }},
                {{ agent_name: "operator", active_sessions: 1, total_sessions: 2, role_style_key: "operator", task_details: ["Monitor gateway path"] }},
              ],
            }};
            const sceneRoleStyles = context.normalizeSceneRoleStyles(context.defaultSceneRoleStyles);
            const model = context.buildRealtimeSceneModel(payload, sceneRoleStyles);
            const officeSlots = model.officeAgents.slice(0, 7).map((agent, index) => {{
              const html = context.renderReferenceDeskSlot(
                agent,
                referenceSceneLayout.activeSlots[index],
                index
              );
              const baselineMatch = html.match(/data-scene-baseline-top="([^"]+)"/);
              const tagTextMatch = html.match(/<span class="scene-reference-tag-text">([^<]+)<\\/span>/);
              const sceneStateMatch = html.match(/data-scene-state="([^"]+)"/);
              const sceneStatusLabelMatch = html.match(/data-scene-status-label="([^"]+)"/);
              const sceneAgentNameMatch = html.match(/data-scene-agent-name="([^"]*)"/);
              const sceneTaskCountMatch = html.match(/data-scene-task-count="([^"]+)"/);
              const tagStyleMatch = html.match(/class="scene-reference-tag[^"]*"\\s+style="([^"]+)"/);
              return {{
                name: agent.name,
                sceneState: agent.sceneState,
                renderedState: sceneStateMatch ? sceneStateMatch[1] : null,
                statusLabel: sceneStatusLabelMatch ? sceneStatusLabelMatch[1] : null,
                agentNameAttr: sceneAgentNameMatch ? sceneAgentNameMatch[1] : null,
                taskCountAttr: sceneTaskCountMatch ? sceneTaskCountMatch[1] : null,
                row: referenceSceneLayout.activeSlots[index].row + 1,
                baselineTop: baselineMatch ? baselineMatch[1] : null,
                tagStyle: tagStyleMatch ? tagStyleMatch[1] : null,
                tagText: tagTextMatch ? tagTextMatch[1] : null,
                hasActiveResource: html.includes("scene-workstation-resource-active"),
                hasVacancy: html.includes("scene-reference-vacancy"),
                taskDetails: context.buildSceneTooltipPayload(agent).taskDetails,
                tooltipStatus: context.buildSceneTooltipPayload(agent).sceneState,
              }};
            }});

            console.log(JSON.stringify({{ officeSlots }}));
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertEqual(
            payload["officeSlots"],
            [
                {
                    "name": "planner",
                    "sceneState": "active",
                    "renderedState": "active",
                    "statusLabel": "Working",
                    "agentNameAttr": "planner",
                    "taskCountAttr": "2",
                    "row": 1,
                    "baselineTop": "13.1696",
                    "tagStyle": "top:13.1696%;left:6.25%;width:14.5%;height:5.692%;",
                    "tagText": "planner (2)",
                    "hasActiveResource": True,
                    "hasVacancy": False,
                    "taskDetails": "Plan release validation",
                    "tooltipStatus": "Working",
                },
                {
                    "name": None,
                    "sceneState": "unassigned",
                    "renderedState": "unassigned",
                    "statusLabel": "Unassigned desk",
                    "agentNameAttr": "",
                    "taskCountAttr": "0",
                    "row": 1,
                    "baselineTop": "13.1696",
                    "tagStyle": "top:13.1696%;left:24.5833%;width:14.5833%;height:5.692%;",
                    "tagText": "Unassigned (0)",
                    "hasActiveResource": False,
                    "hasVacancy": True,
                    "taskDetails": "No tracked agent is currently assigned to this workstation anchor.",
                    "tooltipStatus": "Unassigned desk",
                },
                {
                    "name": "operator",
                    "sceneState": "active",
                    "renderedState": "active",
                    "statusLabel": "Working",
                    "agentNameAttr": "operator",
                    "taskCountAttr": "1",
                    "row": 1,
                    "baselineTop": "12.9464",
                    "tagStyle": "top:12.9464%;left:42.9167%;width:14.6667%;height:5.9152%;",
                    "tagText": "operator (1)",
                    "hasActiveResource": True,
                    "hasVacancy": False,
                    "taskDetails": "Monitor gateway path",
                    "tooltipStatus": "Working",
                },
                {
                    "name": None,
                    "sceneState": "unassigned",
                    "renderedState": "unassigned",
                    "statusLabel": "Unassigned desk",
                    "agentNameAttr": "",
                    "taskCountAttr": "0",
                    "row": 1,
                    "baselineTop": "12.9464",
                    "tagStyle": "top:12.9464%;left:61.25%;width:14.75%;height:5.9152%;",
                    "tagText": "Unassigned (0)",
                    "hasActiveResource": False,
                    "hasVacancy": True,
                    "taskDetails": "No tracked agent is currently assigned to this workstation anchor.",
                    "tooltipStatus": "Unassigned desk",
                },
                {
                    "name": "alpha",
                    "sceneState": "active",
                    "renderedState": "active",
                    "statusLabel": "Working",
                    "agentNameAttr": "alpha",
                    "taskCountAttr": "1",
                    "row": 1,
                    "baselineTop": "13.1696",
                    "tagStyle": "top:13.1696%;left:79.5833%;width:14.5833%;height:5.692%;",
                    "tagText": "alpha (1)",
                    "hasActiveResource": True,
                    "hasVacancy": False,
                    "taskDetails": "Triage queue",
                    "tooltipStatus": "Working",
                },
                {
                    "name": "beta",
                    "sceneState": "active",
                    "renderedState": "active",
                    "statusLabel": "Working",
                    "agentNameAttr": "beta",
                    "taskCountAttr": "1",
                    "row": 2,
                    "baselineTop": "44.1964",
                    "tagStyle": "top:44.1964%;left:4%;width:13.1667%;height:4.9107%;",
                    "tagText": "beta (1)",
                    "hasActiveResource": True,
                    "hasVacancy": False,
                    "taskDetails": "Check logs",
                    "tooltipStatus": "Working",
                },
                {
                    "name": "delta",
                    "sceneState": "active",
                    "renderedState": "active",
                    "statusLabel": "Working",
                    "agentNameAttr": "delta",
                    "taskCountAttr": "1",
                    "row": 2,
                    "baselineTop": "44.1964",
                    "tagStyle": "top:44.1964%;left:23.6667%;width:13.1667%;height:4.9107%;",
                    "tagText": "delta (1)",
                    "hasActiveResource": True,
                    "hasVacancy": False,
                    "taskDetails": "Inspect gateway",
                    "tooltipStatus": "Working",
                },
            ],
        )

    def test_unassigned_desk_slots_expose_unassigned_status_metadata(self) -> None:
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(APP_JS_PATH))}, "utf8");
            const context = {{
              console,
              setTimeout: () => 0,
              clearTimeout: () => {{}},
              fetch: async () => ({{ ok: true, json: async () => ({{}}) }}),
              window: {{}},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: () => ({{ setAttribute: () => {{}}, innerHTML: "", getBoundingClientRect: () => ({{ left: 0, top: 0, width: 0, height: 0 }}) }}),
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            const referenceSceneLayout = vm.runInContext("referenceSceneLayout", context);

            const payload = {{
              capture_status: "ok",
              queue_lanes: [],
              gateways: [],
              agent_sessions: [
                {{ agent_name: "reviewer", active_sessions: 0, total_sessions: 2, role_style_key: "reviewer" }},
                {{ agent_name: "planner", active_sessions: 1, total_sessions: 1, role_style_key: "planner" }},
              ],
            }};
            const sceneRoleStyles = context.normalizeSceneRoleStyles(context.defaultSceneRoleStyles);
            const model = context.buildRealtimeSceneModel(payload, sceneRoleStyles);
            const unassignedAgent = model.officeAgents[2];
            const html = context.renderReferenceDeskSlot(
              unassignedAgent,
              referenceSceneLayout.activeSlots[2],
              2
            );
            const sceneStateMatch = html.match(/data-scene-state="([^"]+)"/);
            const sceneStatusLabelMatch = html.match(/data-scene-status-label="([^"]+)"/);
            const sceneAgentNameMatch = html.match(/data-scene-agent-name="([^"]*)"/);
            const sceneTaskCountMatch = html.match(/data-scene-task-count="([^"]+)"/);
            const baselineMatch = html.match(/data-scene-baseline-top="([^"]+)"/);
            const tagTextMatch = html.match(/<span class="scene-reference-tag-text">([^<]+)<\\/span>/);

            console.log(JSON.stringify({{
              officeStates: model.officeAgents.slice(0, 4).map((agent) => ({{
                name: agent.name,
                sceneState: agent.sceneState,
              }})),
              idleLoungeAgents: model.idleLoungeAgents.map((agent) => agent.name),
              restingWorkerCount: model.restingWorkerCount,
              activeWorkerCount: model.activeWorkerCount,
              renderedState: sceneStateMatch ? sceneStateMatch[1] : null,
              statusLabel: sceneStatusLabelMatch ? sceneStatusLabelMatch[1] : null,
              agentNameAttr: sceneAgentNameMatch ? sceneAgentNameMatch[1] : null,
              taskCountAttr: sceneTaskCountMatch ? sceneTaskCountMatch[1] : null,
              baselineTop: baselineMatch ? baselineMatch[1] : null,
              tagText: tagTextMatch ? tagTextMatch[1] : null,
              tooltipStatus: context.buildSceneTooltipPayload(unassignedAgent).sceneState,
              tooltipTaskDetails: context.buildSceneTooltipPayload(unassignedAgent).taskDetails,
            }}));
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertEqual(
            payload["officeStates"],
            [
                {"name": "planner", "sceneState": "active"},
                {"name": None, "sceneState": "unassigned"},
                {"name": None, "sceneState": "unassigned"},
                {"name": None, "sceneState": "unassigned"},
            ],
        )
        self.assertEqual(payload["idleLoungeAgents"], ["reviewer"])
        self.assertEqual(payload["restingWorkerCount"], 1)
        self.assertEqual(payload["activeWorkerCount"], 1)
        self.assertEqual(payload["renderedState"], "unassigned")
        self.assertEqual(payload["statusLabel"], "Unassigned desk")
        self.assertEqual(payload["agentNameAttr"], "")
        self.assertEqual(payload["taskCountAttr"], "0")
        self.assertEqual(payload["baselineTop"], "12.9464")
        self.assertEqual(payload["tagText"], "Unassigned (0)")
        self.assertEqual(payload["tooltipStatus"], "Unassigned desk")
        self.assertEqual(
            payload["tooltipTaskDetails"],
            "No tracked agent is currently assigned to this workstation anchor.",
        )

    def test_waiting_scene_unassigned_desks_render_placeholder_hanging_tags(self) -> None:
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(APP_JS_PATH))}, "utf8");
            const context = {{
              console,
              setTimeout: () => 0,
              clearTimeout: () => {{}},
              fetch: async () => ({{ ok: true, json: async () => ({{}}) }}),
              window: {{}},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: () => ({{ setAttribute: () => {{}}, innerHTML: "", getBoundingClientRect: () => ({{ left: 0, top: 0, width: 0, height: 0 }}) }}),
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            const referenceSceneLayout = vm.runInContext("referenceSceneLayout", context);

            const payload = {{
              capture_status: "waiting",
              queue_lanes: [],
              gateways: [],
              agent_sessions: [],
            }};
            const sceneRoleStyles = context.normalizeSceneRoleStyles(context.defaultSceneRoleStyles);
            const model = context.buildRealtimeSceneModel(payload, sceneRoleStyles);
            const html = context.renderReferenceDeskSlot(
              model.officeAgents[0],
              referenceSceneLayout.activeSlots[0],
              0
            );
            const tagTextMatch = html.match(/<span class="scene-reference-tag-text">([^<]+)<\\/span>/);
            const sceneAgentNameMatch = html.match(/data-scene-agent-name="([^"]*)"/);
            const sceneTaskCountMatch = html.match(/data-scene-task-count="([^"]+)"/);
            const tooltipPayloadMatch = html.match(/data-scene-tooltip='([^']+)'/);

            console.log(JSON.stringify({{
              visibleOfficeAgents: model.officeAgents.slice(0, 3).map((agent) => ({{
                name: agent.name,
                sceneState: agent.sceneState,
                taskCount: agent.taskCount,
              }})),
              tagText: tagTextMatch ? tagTextMatch[1] : null,
              agentNameAttr: sceneAgentNameMatch ? sceneAgentNameMatch[1] : null,
              taskCountAttr: sceneTaskCountMatch ? sceneTaskCountMatch[1] : null,
              hasTagClass: html.includes("scene-reference-tag"),
              hasTooltip: Boolean(tooltipPayloadMatch),
            }}));
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertEqual(
            payload["visibleOfficeAgents"],
            [
                {"name": None, "sceneState": "unassigned", "taskCount": 0},
                {"name": None, "sceneState": "unassigned", "taskCount": 0},
                {"name": None, "sceneState": "unassigned", "taskCount": 0},
            ],
        )
        self.assertEqual(payload["tagText"], "Unassigned (0)")
        self.assertEqual(payload["agentNameAttr"], "")
        self.assertEqual(payload["taskCountAttr"], "0")
        self.assertTrue(payload["hasTagClass"])
        self.assertTrue(payload["hasTooltip"])

    def test_idle_agents_render_only_in_lounge_not_at_workstations(self) -> None:
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(APP_JS_PATH))}, "utf8");
            const layoutPayload = JSON.parse(fs.readFileSync({json.dumps(str(LAYOUT_JSON_PATH))}, "utf8"));
            const context = {{
              console,
              setTimeout: () => 0,
              clearTimeout: () => {{}},
              fetch: async () => ({{ ok: true, json: async () => ({{}}) }}),
              window: {{}},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: () => ({{ setAttribute: () => {{}}, innerHTML: "", getBoundingClientRect: () => ({{ left: 0, top: 0, width: 0, height: 0 }}) }}),
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            vm.runInContext("referenceSceneLayout = normalizeReferenceSceneLayout(" + JSON.stringify(layoutPayload) + ")", context);

            const payload = {{
              capture_status: "ok",
              queue_lanes: [],
              gateways: [],
              agent_sessions: [
                {{ agent_name: "planner", active_sessions: 2, total_sessions: 3, role_style_key: "planner", task_details: ["Plan release validation"] }},
                {{ agent_name: "researcher", active_sessions: 0, total_sessions: 1, role_style_key: "researcher", task_details: ["Summarize hover mismatch evidence"] }},
                {{ agent_name: "operator", active_sessions: 1, total_sessions: 2, role_style_key: "operator", task_details: ["Monitor gateway path"] }},
                {{ agent_name: "reviewer", active_sessions: 0, total_sessions: 9, role_style_key: "reviewer", task_details: ["Confirm tag alignment"] }},
              ],
            }};
            const sceneRoleStyles = context.normalizeSceneRoleStyles(context.defaultSceneRoleStyles);
            const model = context.buildRealtimeSceneModel(payload, sceneRoleStyles);
            const html = context.renderRealtimeScene(model);
            console.log(JSON.stringify({{
              officeAgents: model.officeAgents.slice(0, 4).map((agent) => ({{
                name: agent.name,
                sceneState: agent.sceneState,
              }})),
              idleLoungeAgents: model.idleLoungeAgents.map((agent) => agent.name),
              loungeAgentNames: Array.from(html.matchAll(/data-scene-zone="lounge"[^>]*data-scene-agent-name="([^"]+)"/g)).map((match) => match[1]),
              workstationAgentNames: Array.from(html.matchAll(/data-scene-zone="workstation"[^>]*aria-label="([^"]+)"/g)).map((match) => match[1]),
              htmlContainsIdleLoungeLabels: html.includes("idle lounge seat 1") && html.includes("idle lounge seat 2"),
            }}));
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertEqual(
            payload["officeAgents"],
            [
                {"name": "planner", "sceneState": "active"},
                {"name": None, "sceneState": "unassigned"},
                {"name": "operator", "sceneState": "active"},
                {"name": None, "sceneState": "unassigned"},
            ],
        )
        self.assertEqual(payload["idleLoungeAgents"], ["researcher", "reviewer"])
        self.assertEqual(payload["loungeAgentNames"], ["researcher", "reviewer"])
        self.assertEqual(
            payload["workstationAgentNames"],
            ["planner, Working, 2 tasks, workstation 1", "operator, Working, 1 task, workstation 3"],
        )
        self.assertTrue(all("Idle / resting" not in label for label in payload["workstationAgentNames"]))
        self.assertTrue(payload["htmlContainsIdleLoungeLabels"])


    def test_realtime_initial_refresh_retries_then_renders_success(self) -> None:
        app_js_path = (
            Path(__file__).resolve().parents[1] / "clawobserver" / "static" / "app.js"
        )
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(app_js_path))}, "utf8");
            const elements = {{
              "status-pill": {{ textContent: "" }},
              "page-root": {{
                innerHTML: "",
                attrs: {{}},
                setAttribute(name, value) {{ this.attrs[name] = value; }},
                querySelector: () => null,
                getBoundingClientRect: () => ({{ left: 0, top: 0, width: 100, height: 100 }}),
              }},
              "capture-button": {{ addEventListener: () => {{}} }},
            }};
            let liveCalls = 0;
            const context = {{
              console,
              setTimeout: () => 1,
              clearTimeout: () => {{}},
              AbortController,
              window: {{
                setTimeout: () => 1,
                clearTimeout: () => {{}},
              }},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: (id) => elements[id] || {{ addEventListener: () => {{}}, setAttribute: () => {{}}, querySelector: () => null }},
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
              fetch: async (url) => {{
                if (url === "/assets/scene-role-styles.json") {{
                  return {{ ok: true, json: async () => context.defaultSceneRoleStyles }};
                }}
                if (url === "/api/live/overview") {{
                  liveCalls += 1;
                  if (liveCalls === 1) {{
                    return {{ ok: false, status: 503, json: async () => ({{}}) }};
                  }}
                  return {{
                    ok: true,
                    json: async () => ({{
                      captured_at: "2026-05-08T03:00:00Z",
                      refresh_seconds: 99,
                      session_overview: {{ active_sessions: 1, total_sessions: 2, idle_sessions: 1 }},
                      agent_sessions: [{{ agent_name: "planner", active_sessions: 1, total_sessions: 1 }}],
                      queue_lanes: [],
                      gateways: [{{ gateway_group: "total", gateway_count: 1 }}],
                    }}),
                  }};
                }}
                throw new Error(`unexpected fetch ${{url}}`);
              }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            vm.runInContext("LIVE_RETRY_DELAYS_MS.splice(0, LIVE_RETRY_DELAYS_MS.length, 0)", context);
            vm.runInContext("state.page = 'realtime'; refreshPage()", context).then(() => {{
              console.log(JSON.stringify({{
                status: elements["status-pill"].textContent,
                htmlHasScene: elements["page-root"].innerHTML.includes("Realtime Claw Scene"),
                ariaBusy: elements["page-root"].attrs["aria-busy"],
                liveCalls,
              }}));
            }}).catch((error) => {{
              console.error(error);
              process.exit(1);
            }});
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertEqual(payload["liveCalls"], 2)
        self.assertTrue(payload["status"].startswith("Live ·"))
        self.assertTrue(payload["htmlHasScene"])
        self.assertEqual(payload["ariaBusy"], "false")

    def test_realtime_post_success_failure_preserves_last_scene_and_schedules_recovery(self) -> None:
        app_js_path = (
            Path(__file__).resolve().parents[1] / "clawobserver" / "static" / "app.js"
        )
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(app_js_path))}, "utf8");
            const elements = {{
              "status-pill": {{ textContent: "" }},
              "page-root": {{
                innerHTML: "",
                attrs: {{}},
                setAttribute(name, value) {{ this.attrs[name] = value; }},
                querySelector: () => null,
                getBoundingClientRect: () => ({{ left: 0, top: 0, width: 100, height: 100 }}),
              }},
              "capture-button": {{ addEventListener: () => {{}} }},
            }};
            let liveCalls = 0;
            const timerDelays = [];
            const context = {{
              console,
              setTimeout: (fn, delay) => {{ timerDelays.push(delay || 0); return timerDelays.length; }},
              clearTimeout: () => {{}},
              AbortController,
              window: {{
                setTimeout: (fn, delay) => {{ timerDelays.push(delay || 0); return timerDelays.length; }},
                clearTimeout: () => {{}},
              }},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: (id) => elements[id] || {{ addEventListener: () => {{}}, setAttribute: () => {{}}, querySelector: () => null }},
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
              fetch: async (url) => {{
                if (url === "/assets/scene-role-styles.json") {{
                  return {{ ok: true, json: async () => context.defaultSceneRoleStyles }};
                }}
                if (url === "/api/live/overview") {{
                  liveCalls += 1;
                  if (liveCalls > 1) {{
                    return {{ ok: false, status: 503, json: async () => ({{}}) }};
                  }}
                  return {{
                    ok: true,
                    json: async () => ({{
                      captured_at: "2026-05-08T03:00:00Z",
                      refresh_seconds: 99,
                      session_overview: {{ active_sessions: 1, total_sessions: 2, idle_sessions: 1 }},
                      agent_sessions: [{{ agent_name: "planner", active_sessions: 1, total_sessions: 1 }}],
                      queue_lanes: [],
                      gateways: [{{ gateway_group: "total", gateway_count: 1 }}],
                    }}),
                  }};
                }}
                throw new Error(`unexpected fetch ${{url}}`);
              }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            vm.runInContext("LIVE_RETRY_DELAYS_MS.splice(0, LIVE_RETRY_DELAYS_MS.length)", context);
            vm.runInContext("state.page = 'realtime'; refreshPage()", context).then(() => {{
              const goodHtml = elements["page-root"].innerHTML;
              return vm.runInContext("refreshPage({{ showLoading: false }})", context).then(() => {{
                console.log(JSON.stringify({{
                  status: elements["status-pill"].textContent,
                  htmlUnchanged: elements["page-root"].innerHTML === goodHtml,
                  htmlHasFailure: elements["page-root"].innerHTML.includes("Load failed"),
                  recoveryDelay: timerDelays[timerDelays.length - 1],
                  liveCalls,
                }}));
              }});
            }}).catch((error) => {{
              console.error(error);
              process.exit(1);
            }});
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertEqual(payload["liveCalls"], 2)
        self.assertIn("Live degraded", payload["status"])
        self.assertTrue(payload["htmlUnchanged"])
        self.assertFalse(payload["htmlHasFailure"])
        self.assertEqual(payload["recoveryDelay"], 3000)

    def test_stale_aborted_realtime_failure_does_not_replace_current_page(self) -> None:
        app_js_path = (
            Path(__file__).resolve().parents[1] / "clawobserver" / "static" / "app.js"
        )
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(app_js_path))}, "utf8");
            const elements = {{
              "status-pill": {{ textContent: "" }},
              "page-root": {{
                innerHTML: "HISTORICAL_OK",
                attrs: {{}},
                setAttribute(name, value) {{ this.attrs[name] = value; }},
                querySelector: () => null,
                getBoundingClientRect: () => ({{ left: 0, top: 0, width: 100, height: 100 }}),
              }},
              "capture-button": {{ addEventListener: () => {{}} }},
            }};
            const context = {{
              console,
              setTimeout: () => 1,
              clearTimeout: () => {{}},
              AbortController,
              window: {{ setTimeout: () => 1, clearTimeout: () => {{}} }},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: (id) => elements[id] || {{ addEventListener: () => {{}}, setAttribute: () => {{}}, querySelector: () => null }},
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
              fetch: async () => {{ throw Object.assign(new Error("Request aborted"), {{ name: "AbortError" }}); }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            vm.runInContext("state.page = 'realtime'; const oldReq = beginPageRequest('realtime:live'); state.page = 'historical'; beginPageRequest('historical:current_day'); handleRealtimeFailure(new Error('late failure'));", context);
            console.log(JSON.stringify({{
              html: elements["page-root"].innerHTML,
              status: elements["status-pill"].textContent,
            }}));
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertEqual(payload["html"], "HISTORICAL_OK")
        self.assertEqual(payload["status"], "")

    def test_realtime_unrecoverable_first_load_shows_retryable_failure(self) -> None:
        app_js_path = (
            Path(__file__).resolve().parents[1] / "clawobserver" / "static" / "app.js"
        )
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(app_js_path))}, "utf8");
            const elements = {{
              "status-pill": {{ textContent: "" }},
              "page-root": {{
                innerHTML: "",
                attrs: {{}},
                setAttribute(name, value) {{ this.attrs[name] = value; }},
                querySelector: () => ({{ addEventListener: () => {{}} }}),
                getBoundingClientRect: () => ({{ left: 0, top: 0, width: 100, height: 100 }}),
              }},
              "capture-button": {{ addEventListener: () => {{}} }},
            }};
            const timerDelays = [];
            let liveCalls = 0;
            const context = {{
              console,
              setTimeout: (fn, delay) => {{ timerDelays.push(delay || 0); return timerDelays.length; }},
              clearTimeout: () => {{}},
              AbortController,
              window: {{
                setTimeout: (fn, delay) => {{ timerDelays.push(delay || 0); return timerDelays.length; }},
                clearTimeout: () => {{}},
              }},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: (id) => elements[id] || {{ addEventListener: () => {{}}, setAttribute: () => {{}}, querySelector: () => null }},
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
              fetch: async (url) => {{
                if (url === "/assets/scene-role-styles.json") {{
                  return {{ ok: true, json: async () => context.defaultSceneRoleStyles }};
                }}
                if (url === "/api/live/overview") {{
                  liveCalls += 1;
                  return {{ ok: false, status: 503, json: async () => ({{}}) }};
                }}
                throw new Error(`unexpected fetch ${{url}}`);
              }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            vm.runInContext("LIVE_RETRY_DELAYS_MS.splice(0, LIVE_RETRY_DELAYS_MS.length, 0, 0)", context);
            vm.runInContext("state.page = 'realtime'; refreshPage()", context).then(() => {{
              console.log(JSON.stringify({{
                status: elements["status-pill"].textContent,
                htmlHasFailure: elements["page-root"].innerHTML.includes("Load failed"),
                htmlHasRetryButton: elements["page-root"].innerHTML.includes("Retry now"),
                htmlHasLastError: elements["page-root"].innerHTML.includes("Request failed: 503"),
                recoveryDelay: timerDelays[timerDelays.length - 1],
                liveCalls,
              }}));
            }}).catch((error) => {{
              console.error(error);
              process.exit(1);
            }});
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertEqual(payload["liveCalls"], 3)
        self.assertEqual(payload["status"], "Load failed")
        self.assertTrue(payload["htmlHasFailure"])
        self.assertTrue(payload["htmlHasRetryButton"])
        self.assertTrue(payload["htmlHasLastError"])
        self.assertEqual(payload["recoveryDelay"], 3000)

    def test_realtime_fetch_timeout_aborts_hanging_live_request_quickly(self) -> None:
        app_js_path = (
            Path(__file__).resolve().parents[1] / "clawobserver" / "static" / "app.js"
        )
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(app_js_path))}, "utf8");
            const scheduledTimeouts = [];
            const clearedTimeouts = [];
            const context = {{
              console,
              AbortController,
              window: {{
                setTimeout: (fn, delay) => {{
                  const record = {{ fn, delay }};
                  scheduledTimeouts.push(record);
                  return record;
                }},
                clearTimeout: (record) => {{
                  clearedTimeouts.push(record ? record.delay : null);
                }},
              }},
              setTimeout: (fn, delay) => {{
                const record = {{ fn, delay }};
                scheduledTimeouts.push(record);
                return record;
              }},
              clearTimeout: (record) => {{
                clearedTimeouts.push(record ? record.delay : null);
              }},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: () => ({{ addEventListener: () => {{}}, setAttribute: () => {{}}, querySelector: () => null }}),
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
              fetch: (url, options) => new Promise((resolve, reject) => {{
                options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), {{ name: "AbortError" }})), {{ once: true }});
              }}),
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            const pendingFetch = vm.runInContext("fetchJson('/api/live/overview')", context);
            if (!scheduledTimeouts.length) {{
              console.error("no timeout scheduled");
              process.exit(1);
            }}
            scheduledTimeouts[0].fn();
            pendingFetch.then(() => {{
              console.error("expected timeout");
              process.exit(1);
            }}).catch((error) => {{
              setImmediate(() => {{
                console.log(JSON.stringify({{
                  message: String(error.message || error),
                  scheduledDelay: scheduledTimeouts[0].delay,
                  clearedCount: clearedTimeouts.length,
                }}));
              }});
            }});
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertEqual(payload["scheduledDelay"], 4000)
        self.assertIn("timed out after 4s", payload["message"])
        self.assertGreaterEqual(payload["clearedCount"], 1)

    def test_realtime_first_payload_can_arrive_just_under_timeout_without_load_failed(self) -> None:
        app_js_path = (
            Path(__file__).resolve().parents[1] / "clawobserver" / "static" / "app.js"
        )
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(app_js_path))}, "utf8");
            const elements = {{
              "status-pill": {{ textContent: "" }},
              "page-root": {{
                innerHTML: "",
                attrs: {{}},
                setAttribute(name, value) {{ this.attrs[name] = value; }},
                querySelector: () => null,
                getBoundingClientRect: () => ({{ left: 0, top: 0, width: 100, height: 100 }}),
              }},
              "capture-button": {{ addEventListener: () => {{}} }},
            }};
            const context = {{
              console,
              AbortController,
              window: {{
                setTimeout: (fn, delay) => {{
                  const timer = setTimeout(fn, delay);
                  if (timer && typeof timer.unref === "function") {{
                    timer.unref();
                  }}
                  return timer;
                }},
                clearTimeout,
              }},
              setTimeout,
              clearTimeout,
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: (id) => elements[id] || {{ addEventListener: () => {{}}, setAttribute: () => {{}}, querySelector: () => null }},
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
              fetch: (url, options) => {{
                if (url === "/assets/scene-role-styles.json") {{
                  return Promise.resolve({{ ok: true, json: async () => context.defaultSceneRoleStyles }});
                }}
                if (url === "/assets/reference-scene-layout.json") {{
                  return Promise.resolve({{ ok: true, json: async () => ({{}}) }});
                }}
                if (url === "/api/live/overview") {{
                  return new Promise((resolve, reject) => {{
                    const timer = setTimeout(() => resolve({{
                      ok: true,
                      json: async () => ({{
                        captured_at: "2026-05-08T03:00:00Z",
                        source_version: "slow-waiting-runtime",
                        capture_status: "waiting",
                        refresh_seconds: 15,
                        session_overview: {{ active_sessions: 0, total_sessions: 0, idle_sessions: 0 }},
                        agent_sessions: [],
                        session_states: [
                          {{ state_name: "active", session_count: 0 }},
                          {{ state_name: "idle", session_count: 0 }},
                        ],
                        queue_lanes: [],
                        gateways: [
                          {{ gateway_group: "total", gateway_count: 0 }},
                          {{ gateway_group: "offline", gateway_count: 1 }},
                        ],
                      }}),
                    }}), 3900);
                    options.signal.addEventListener("abort", () => {{
                      clearTimeout(timer);
                      reject(Object.assign(new Error("aborted"), {{ name: "AbortError" }}));
                    }}, {{ once: true }});
                  }});
                }}
                throw new Error(`unexpected fetch ${{url}}`);
              }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            vm.runInContext("state.page = 'realtime'; refreshPage()", context).then(() => {{
              console.log(JSON.stringify({{
                status: elements["status-pill"].textContent,
                htmlHasScene: elements["page-root"].innerHTML.includes("Realtime Claw Scene"),
                htmlHasFailure: elements["page-root"].innerHTML.includes("Load failed"),
                htmlHasSceneMount: elements["page-root"].innerHTML.includes("realtime-r3f-scene-mount"),
                htmlHasWaitingStatus: elements["page-root"].innerHTML.includes('data-scene-runtime-status="waiting"'),
                htmlHasVersion: elements["page-root"].innerHTML.includes("slow-waiting-runtime"),
              }}));
            }}).catch((error) => {{
              console.error(error);
              process.exit(1);
            }});
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertTrue(payload["status"].startswith("Live ·"))
        self.assertTrue(payload["htmlHasScene"])
        self.assertFalse(payload["htmlHasFailure"])
        self.assertTrue(payload["htmlHasSceneMount"])
        self.assertTrue(payload["htmlHasWaitingStatus"])
        self.assertTrue(payload["htmlHasVersion"])

    def test_realtime_normalizes_mixed_response_shapes_without_failure(self) -> None:
        app_js_path = (
            Path(__file__).resolve().parents[1] / "clawobserver" / "static" / "app.js"
        )
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(app_js_path))}, "utf8");
            const elements = {{
              "status-pill": {{ textContent: "" }},
              "page-root": {{
                innerHTML: "",
                attrs: {{}},
                setAttribute(name, value) {{ this.attrs[name] = value; }},
                querySelector: () => null,
                getBoundingClientRect: () => ({{ left: 0, top: 0, width: 100, height: 100 }}),
              }},
              "capture-button": {{ addEventListener: () => {{}} }},
            }};
            const context = {{
              console,
              setTimeout: () => 1,
              clearTimeout: () => {{}},
              AbortController,
              window: {{ setTimeout: () => 1, clearTimeout: () => {{}} }},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: (id) => elements[id] || {{ addEventListener: () => {{}}, setAttribute: () => {{}}, querySelector: () => null }},
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
              fetch: async (url) => {{
                if (url === "/assets/scene-role-styles.json") {{
                  return {{ ok: true, json: async () => context.defaultSceneRoleStyles }};
                }}
                if (url === "/assets/reference-scene-layout.json") {{
                  return {{ ok: true, json: async () => ({{}}) }};
                }}
                if (url === "/api/live/overview") {{
                  return {{
                    ok: true,
                    json: async () => ({{
                      capturedAt: "2026-05-08T03:00:00Z",
                      sourceVersion: "mixed-runtime",
                      captureStatus: "ok",
                      refreshSeconds: 45,
                      sessionOverview: {{ activeSessions: 3, totalSessions: 8, idleSessions: 5 }},
                      agentSessions: [
                        {{
                          agentName: "planner",
                          activeSessions: 3,
                          totalSessions: 4,
                          roleStyleKey: "planner",
                          taskDetails: ["Stabilize live polling"],
                        }},
                      ],
                      sessionStates: [{{ stateName: "active", sessionCount: 3 }}],
                      queueLanes: [{{ laneName: "delivery_queue_pending", depth: 2 }}],
                      gateways: {{ total: 2, exits_today: 1 }},
                    }}),
                  }};
                }}
                throw new Error(`unexpected fetch ${{url}}`);
              }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            vm.runInContext("state.page = 'realtime'; refreshPage()", context).then(() => {{
              console.log(JSON.stringify({{
                status: elements["status-pill"].textContent,
                htmlHasScene: elements["page-root"].innerHTML.includes("Realtime Claw Scene"),
                htmlHasVersion: elements["page-root"].innerHTML.includes("mixed-runtime"),
                htmlHasFailure: elements["page-root"].innerHTML.includes("Load failed"),
              }}));
            }}).catch((error) => {{
              console.error(error);
              process.exit(1);
            }});
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertTrue(payload["status"].startswith("Live ·"))
        self.assertTrue(payload["htmlHasScene"])
        self.assertTrue(payload["htmlHasVersion"])
        self.assertFalse(payload["htmlHasFailure"])

    def test_realtime_waiting_first_payload_renders_recoverable_scene_on_refresh(self) -> None:
        app_js_path = (
            Path(__file__).resolve().parents[1] / "clawobserver" / "static" / "app.js"
        )
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(app_js_path))}, "utf8");
            const elements = {{
              "status-pill": {{ textContent: "" }},
              "page-root": {{
                innerHTML: "",
                attrs: {{}},
                setAttribute(name, value) {{ this.attrs[name] = value; }},
                querySelector: () => null,
                getBoundingClientRect: () => ({{ left: 0, top: 0, width: 100, height: 100 }}),
              }},
              "capture-button": {{ addEventListener: () => {{}} }},
            }};
            let liveCalls = 0;
            const context = {{
              console,
              setTimeout: () => 1,
              clearTimeout: () => {{}},
              AbortController,
              window: {{ setTimeout: () => 1, clearTimeout: () => {{}} }},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: (id) => elements[id] || {{ addEventListener: () => {{}}, setAttribute: () => {{}}, querySelector: () => null }},
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
              fetch: async (url) => {{
                if (url === "/assets/scene-role-styles.json") {{
                  return {{ ok: true, json: async () => context.defaultSceneRoleStyles }};
                }}
                if (url === "/assets/reference-scene-layout.json") {{
                  return {{ ok: true, json: async () => ({{}}) }};
                }}
                if (url === "/api/live/overview") {{
                  liveCalls += 1;
                  return {{
                    ok: true,
                    json: async () => ({{
                      captured_at: "2026-05-08T03:00:00Z",
                      source_version: "openclaw-cli-runtime",
                      capture_status: "waiting",
                      refresh_seconds: 15,
                      session_overview: {{ active_sessions: 0, total_sessions: 0, idle_sessions: 0 }},
                      agent_sessions: [],
                      session_states: [
                        {{ state_name: "active", session_count: 0 }},
                        {{ state_name: "idle", session_count: 0 }},
                      ],
                      queue_lanes: [],
                      gateways: [
                        {{ gateway_group: "total", gateway_count: 0 }},
                        {{ gateway_group: "offline", gateway_count: 1 }},
                      ],
                    }}),
                  }};
                }}
                throw new Error(`unexpected fetch ${{url}}`);
              }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            vm.runInContext("state.page = 'realtime'; refreshPage()", context).then(() => {{
              console.log(JSON.stringify({{
                status: elements["status-pill"].textContent,
                htmlHasScene: elements["page-root"].innerHTML.includes("Realtime Claw Scene"),
                htmlHasFailure: elements["page-root"].innerHTML.includes("Load failed"),
                htmlHasSceneMount: elements["page-root"].innerHTML.includes("realtime-r3f-scene-mount"),
                htmlHasWaitingStatus: elements["page-root"].innerHTML.includes('data-scene-runtime-status="waiting"'),
                htmlHasZeroState: elements["page-root"].innerHTML.includes(">0<"),
                liveCalls,
              }}));
            }}).catch((error) => {{
              console.error(error);
              process.exit(1);
            }});
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertEqual(payload["liveCalls"], 1)
        self.assertTrue(payload["status"].startswith("Live ·"))
        self.assertTrue(payload["htmlHasScene"])
        self.assertFalse(payload["htmlHasFailure"])
        self.assertTrue(payload["htmlHasSceneMount"])
        self.assertTrue(payload["htmlHasWaitingStatus"])
        self.assertTrue(payload["htmlHasZeroState"])

    def test_realtime_waiting_non_empty_live_payload_renders_agent_tags_and_queue_counts(self) -> None:
        app_js_path = (
            Path(__file__).resolve().parents[1] / "clawobserver" / "static" / "app.js"
        )
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(app_js_path))}, "utf8");
            const elements = {{
              "status-pill": {{ textContent: "" }},
              "page-root": {{
                innerHTML: "",
                attrs: {{}},
                setAttribute(name, value) {{ this.attrs[name] = value; }},
                querySelector: () => null,
                getBoundingClientRect: () => ({{ left: 0, top: 0, width: 100, height: 100 }}),
              }},
              "capture-button": {{ addEventListener: () => {{}} }},
            }};
            const context = {{
              console,
              setTimeout: () => 1,
              clearTimeout: () => {{}},
              AbortController,
              window: {{ setTimeout: () => 1, clearTimeout: () => {{}} }},
              document: {{
                addEventListener: () => {{}},
                querySelectorAll: () => [],
                querySelector: () => null,
                getElementById: (id) => elements[id] || {{ addEventListener: () => {{}}, setAttribute: () => {{}}, querySelector: () => null }},
                createElement: () => ({{ className: "", hidden: true, appendChild: () => {{}} }}),
              }},
              fetch: async (url) => {{
                if (url === "/assets/scene-role-styles.json") {{
                  return {{ ok: true, json: async () => context.defaultSceneRoleStyles }};
                }}
                if (url === "/assets/reference-scene-layout.json") {{
                  return {{ ok: true, json: async () => ({{}}) }};
                }}
                if (url === "/api/live/overview") {{
                  return {{
                    ok: true,
                    json: async () => ({{
                      captured_at: "2026-05-08T03:00:00Z",
                      source_version: "openclaw-cli-runtime",
                      capture_status: "waiting",
                      refresh_seconds: 15,
                      session_overview: {{ active_sessions: 3, total_sessions: 8, idle_sessions: 5 }},
                      agent_sessions: [
                        {{
                          agent_name: "planner",
                          active_sessions: 2,
                          total_sessions: 3,
                          role_style_key: "planner",
                          thinking_level: "High",
                          latest_user_input: "Plan release validation",
                          latest_user_input_timestamp: "2026-05-08T02:58:00Z",
                          session_model: "gpt-5.4",
                          task_details: ["Plan release validation"],
                        }},
                        {{
                          agent_name: "operator",
                          active_sessions: 1,
                          total_sessions: 2,
                          role_style_key: "operator",
                          thinking_level: "Low",
                          latest_user_input: "Monitor gateway path",
                          latest_user_input_timestamp: "2026-05-08T02:59:00Z",
                          session_model: "gpt-5.4-coder",
                          task_details: ["Monitor gateway path"],
                        }},
                        {{
                          agent_name: "reviewer",
                          active_sessions: 0,
                          total_sessions: 1,
                          role_style_key: "reviewer",
                          task_details: ["Confirm tag alignment"],
                        }},
                      ],
                      session_states: [
                        {{ state_name: "active", session_count: 3 }},
                        {{ state_name: "idle", session_count: 5 }},
                      ],
                      session_types: [
                        {{ session_type: "persistent", session_count: 6 }},
                        {{ session_type: "one_shot", session_count: 2 }},
                      ],
                      queue_lanes: [
                        {{ lane_name: "delivery_queue_pending", depth: 2 }},
                        {{ lane_name: "delivery_queue_failed", depth: 1 }},
                      ],
                      gateways: [
                        {{ gateway_group: "total", gateway_count: 1 }},
                        {{ gateway_group: "offline", gateway_count: 0 }},
                      ],
                    }}),
                  }};
                }}
                throw new Error(`unexpected fetch ${{url}}`);
              }},
            }};
            context.global = context;
            vm.createContext(context);
            vm.runInContext(source, context);
            vm.runInContext("state.page = 'realtime'; refreshPage()", context).then(() => {{
              console.log(JSON.stringify({{
                status: elements["status-pill"].textContent,
                htmlHasScene: elements["page-root"].innerHTML.includes("Realtime Claw Scene"),
                htmlHasFailure: elements["page-root"].innerHTML.includes("Load failed"),
                htmlHasSceneMount: elements["page-root"].innerHTML.includes("realtime-r3f-scene-mount"),
                htmlHasWaitingStatus: elements["page-root"].innerHTML.includes('data-scene-runtime-status="waiting"'),
                htmlHasSourceVersion: elements["page-root"].innerHTML.includes("openclaw-cli-runtime"),
                htmlHasQueuePending: elements["page-root"].innerHTML.includes("Pending delivery items"),
                htmlHasQueueFailed: elements["page-root"].innerHTML.includes("Failed delivery items"),
              }}));
            }}).catch((error) => {{
              console.error(error);
              process.exit(1);
            }});
            """
        )
        output = subprocess.check_output(["node", "-e", script], text=True)
        payload = json.loads(output)

        self.assertTrue(payload["status"].startswith("Live ·"))
        self.assertTrue(payload["htmlHasScene"])
        self.assertFalse(payload["htmlHasFailure"])
        self.assertTrue(payload["htmlHasSceneMount"])
        self.assertTrue(payload["htmlHasWaitingStatus"])
        self.assertTrue(payload["htmlHasSourceVersion"])
        self.assertTrue(payload["htmlHasQueuePending"])
        self.assertTrue(payload["htmlHasQueueFailed"])


if __name__ == "__main__":
    unittest.main()
