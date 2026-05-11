import type { AgentVisualStatus } from "../agentVisualState";

export type StatusVisualConfig = {
  deskColor: string;
  monitorColor: string;
  lampColor: string;
  monitorEmissive: string;
  monitorIntensity: number;
  lampBlink: boolean;
  dimmed: boolean;
};

export const STATUS_VISUALS: Record<AgentVisualStatus, StatusVisualConfig> = {
  idle: {
    deskColor: "#40584a",
    monitorColor: "#234131",
    lampColor: "#4fd17f",
    monitorEmissive: "#2e7a4f",
    monitorIntensity: 0.25,
    lampBlink: false,
    dimmed: false,
  },
  busy: {
    deskColor: "#2f4458",
    monitorColor: "#3f89ff",
    lampColor: "#65c0ff",
    monitorEmissive: "#53a7ff",
    monitorIntensity: 0.75,
    lampBlink: false,
    dimmed: false,
  },
  error: {
    deskColor: "#4e3136",
    monitorColor: "#7e2d36",
    lampColor: "#ff6673",
    monitorEmissive: "#ff5a64",
    monitorIntensity: 0.65,
    lampBlink: true,
    dimmed: false,
  },
  offline: {
    deskColor: "#3b424b",
    monitorColor: "#1b222a",
    lampColor: "#66707d",
    monitorEmissive: "#000000",
    monitorIntensity: 0,
    lampBlink: false,
    dimmed: true,
  },
};
