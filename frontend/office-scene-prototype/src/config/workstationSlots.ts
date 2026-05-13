import type { AgentDeskSlot } from "../agentVisualState";

export const FIXED_WORKSTATION_SLOT_COUNT = 12;
export const MAX_VISIBLE_TASK_BLOCKS = 4;

const DESK_X_POSITIONS = [-6.15, -2.05, 2.05, 6.15];
const DESK_Z_POSITIONS = [-2.95, 0.25, 3.35];
const DESK_FACING_BY_ROW = [0, 0, 0];

export const FIXED_WORKSTATION_SLOTS: AgentDeskSlot[] = DESK_X_POSITIONS.flatMap((x, column) =>
  DESK_Z_POSITIONS.map((z, row) => ({
    id: `desk-${row + 1}-${column + 1}`,
    label: `Desk ${row * DESK_X_POSITIONS.length + column + 1}`,
    row,
    column,
    position: [x, 0, z] as [number, number, number],
    facing: DESK_FACING_BY_ROW[row],
  })),
);

if (FIXED_WORKSTATION_SLOTS.length !== FIXED_WORKSTATION_SLOT_COUNT) {
  throw new Error(`Expected ${FIXED_WORKSTATION_SLOT_COUNT} fixed workstation slots`);
}
