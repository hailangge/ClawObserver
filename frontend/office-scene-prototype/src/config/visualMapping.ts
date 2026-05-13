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
    deskColor: "#4d6884",
    monitorColor: "#16283b",
    lampColor: "#72dcff",
    monitorEmissive: "#58cbff",
    monitorIntensity: 0.52,
    lampBlink: false,
    dimmed: false,
  },
  busy: {
    deskColor: "#5c7da3",
    monitorColor: "#17385d",
    lampColor: "#86ecff",
    monitorEmissive: "#61d9ff",
    monitorIntensity: 1.08,
    lampBlink: false,
    dimmed: false,
  },
  error: {
    deskColor: "#6a5668",
    monitorColor: "#43243c",
    lampColor: "#ff6673",
    monitorEmissive: "#ff7d92",
    monitorIntensity: 0.84,
    lampBlink: true,
    dimmed: false,
  },
  offline: {
    deskColor: "#4d5865",
    monitorColor: "#111722",
    lampColor: "#5f6e81",
    monitorEmissive: "#000000",
    monitorIntensity: 0,
    lampBlink: false,
    dimmed: true,
  },
};
