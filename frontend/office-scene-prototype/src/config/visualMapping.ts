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
    deskColor: "#648a63",
    monitorColor: "#2e5a45",
    lampColor: "#4fd17f",
    monitorEmissive: "#4aa66b",
    monitorIntensity: 0.28,
    lampBlink: false,
    dimmed: false,
  },
  busy: {
    deskColor: "#4f7294",
    monitorColor: "#4d97ff",
    lampColor: "#65c0ff",
    monitorEmissive: "#62b8ff",
    monitorIntensity: 0.82,
    lampBlink: false,
    dimmed: false,
  },
  error: {
    deskColor: "#9e5c5f",
    monitorColor: "#aa4b52",
    lampColor: "#ff6673",
    monitorEmissive: "#ff7277",
    monitorIntensity: 0.7,
    lampBlink: true,
    dimmed: false,
  },
  offline: {
    deskColor: "#79808a",
    monitorColor: "#2b3138",
    lampColor: "#7a8591",
    monitorEmissive: "#000000",
    monitorIntensity: 0,
    lampBlink: false,
    dimmed: true,
  },
};
