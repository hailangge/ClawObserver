from __future__ import annotations

import json
import subprocess
import textwrap
import unittest
from pathlib import Path


class RealtimeSceneLogicTests(unittest.TestCase):
    def test_idle_lounge_order_follows_canonical_desk_assignments(self) -> None:
        app_js_path = (
            Path(__file__).resolve().parents[1] / "clawobserver" / "static" / "app.js"
        )
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(app_js_path))}, "utf8");
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
                {{ agent_name: "planner", active_sessions: 2, total_sessions: 3, role_style_key: "planner" }},
                {{ agent_name: "researcher", active_sessions: 0, total_sessions: 1, role_style_key: "researcher" }},
                {{ agent_name: "operator", active_sessions: 1, total_sessions: 2, role_style_key: "operator" }},
                {{ agent_name: "reviewer", active_sessions: 0, total_sessions: 9, role_style_key: "reviewer" }},
              ],
            }};
            const sceneRoleStyles = context.normalizeSceneRoleStyles(context.defaultSceneRoleStyles);
            const model = context.buildRealtimeSceneModel(payload, sceneRoleStyles);

            console.log(JSON.stringify({{
              officeStates: model.officeAgents.slice(0, 4).map((agent) => ({{
                name: agent.name,
                sceneState: agent.sceneState,
                taskCount: agent.taskCount,
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
                {"name": "planner", "sceneState": "active", "taskCount": 2},
                {"name": "researcher", "sceneState": "idle", "taskCount": 0},
                {"name": "operator", "sceneState": "active", "taskCount": 1},
                {"name": "reviewer", "sceneState": "idle", "taskCount": 0},
            ],
        )
        self.assertEqual(payload["idleLoungeAgents"], ["researcher", "reviewer"])
        self.assertEqual(payload["activeWorkerCount"], 2)
        self.assertEqual(payload["restingWorkerCount"], 2)

    def test_rendered_desk_slots_keep_row_baselines_and_idle_vacancy_state(self) -> None:
        app_js_path = (
            Path(__file__).resolve().parents[1] / "clawobserver" / "static" / "app.js"
        )
        script = textwrap.dedent(
            f"""
            const fs = require("fs");
            const vm = require("vm");

            const source = fs.readFileSync({json.dumps(str(app_js_path))}, "utf8");
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
                {{ agent_name: "planner", active_sessions: 2, total_sessions: 3, role_style_key: "planner", task_details: ["Plan release validation"] }},
                {{ agent_name: "researcher", active_sessions: 0, total_sessions: 1, role_style_key: "researcher", task_details: ["Summarize hover mismatch evidence"] }},
                {{ agent_name: "operator", active_sessions: 1, total_sessions: 2, role_style_key: "operator", task_details: ["Monitor gateway path"] }},
                {{ agent_name: "reviewer", active_sessions: 0, total_sessions: 9, role_style_key: "reviewer", task_details: ["Confirm tag alignment"] }},
                {{ agent_name: "alpha", active_sessions: 1, total_sessions: 1, role_style_key: "operator", task_details: ["Triage queue"] }},
                {{ agent_name: "beta", active_sessions: 1, total_sessions: 1, role_style_key: "operator", task_details: ["Check logs"] }},
                {{ agent_name: "delta", active_sessions: 1, total_sessions: 1, role_style_key: "operator", task_details: ["Inspect gateway"] }},
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
              return {{
                name: agent.name,
                sceneState: agent.sceneState,
                row: referenceSceneLayout.activeSlots[index].row + 1,
                baselineTop: baselineMatch ? baselineMatch[1] : null,
                tagText: tagTextMatch ? tagTextMatch[1] : null,
                hasActiveResource: html.includes("scene-workstation-resource-active"),
                hasVacancy: html.includes("scene-reference-vacancy"),
                taskDetails: context.buildSceneTooltipPayload(agent).taskDetails,
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
                    "row": 1,
                    "baselineTop": "10.3",
                    "tagText": "planner (2)",
                    "hasActiveResource": True,
                    "hasVacancy": False,
                    "taskDetails": "Plan release validation",
                },
                {
                    "name": "researcher",
                    "sceneState": "idle",
                    "row": 1,
                    "baselineTop": "10.3",
                    "tagText": "researcher (0)",
                    "hasActiveResource": False,
                    "hasVacancy": True,
                    "taskDetails": "0 active tasks. Idle agent is resting in the lounge; workstation remains empty. Latest known task context before idle: Summarize hover mismatch evidence.",
                },
                {
                    "name": "operator",
                    "sceneState": "active",
                    "row": 1,
                    "baselineTop": "10.3",
                    "tagText": "operator (1)",
                    "hasActiveResource": True,
                    "hasVacancy": False,
                    "taskDetails": "Monitor gateway path",
                },
                {
                    "name": "reviewer",
                    "sceneState": "idle",
                    "row": 1,
                    "baselineTop": "10.3",
                    "tagText": "reviewer (0)",
                    "hasActiveResource": False,
                    "hasVacancy": True,
                    "taskDetails": "0 active tasks. Idle agent is resting in the lounge; workstation remains empty. Latest known task context before idle: Confirm tag alignment.",
                },
                {
                    "name": "alpha",
                    "sceneState": "active",
                    "row": 1,
                    "baselineTop": "10.3",
                    "tagText": "alpha (1)",
                    "hasActiveResource": True,
                    "hasVacancy": False,
                    "taskDetails": "Triage queue",
                },
                {
                    "name": "beta",
                    "sceneState": "active",
                    "row": 2,
                    "baselineTop": "38.8",
                    "tagText": "beta (1)",
                    "hasActiveResource": True,
                    "hasVacancy": False,
                    "taskDetails": "Check logs",
                },
                {
                    "name": "delta",
                    "sceneState": "active",
                    "row": 2,
                    "baselineTop": "38.8",
                    "tagText": "delta (1)",
                    "hasActiveResource": True,
                    "hasVacancy": False,
                    "taskDetails": "Inspect gateway",
                },
            ],
        )


if __name__ == "__main__":
    unittest.main()
