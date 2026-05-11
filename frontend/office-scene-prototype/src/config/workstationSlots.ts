import type { AgentDeskSlot } from "../agentVisualState";

export const FIXED_WORKSTATION_SLOT_COUNT = 12;
export const MAX_VISIBLE_TASK_BLOCKS = 4;

const DESK_X_POSITIONS = [-7.2, -2.4, 2.4, 7.2];
const DESK_Z_POSITIONS = [-3.9, 0.1, 4.1];

export const FIXED_WORKSTATION_SLOTS: AgentDeskSlot[] = DESK_X_POSITIONS.flatMap((x, column) =>
  DESK_Z_POSITIONS.map((z, row) => ({
    id: `desk-${row + 1}-${column + 1}`,
    label: `Desk ${row * DESK_X_POSITIONS.length + column + 1}`,
    row,
    column,
    position: [x, 0, z] as [number, number, number],
  })),
);

if (FIXED_WORKSTATION_SLOTS.length !== FIXED_WORKSTATION_SLOT_COUNT) {
  throw new Error(`Expected ${FIXED_WORKSTATION_SLOT_COUNT} fixed workstation slots`);
}
