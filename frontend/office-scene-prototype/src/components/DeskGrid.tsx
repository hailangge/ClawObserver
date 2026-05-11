import type { AgentVisualState } from "../agentVisualState";
import { FIXED_WORKSTATION_SLOTS } from "../config/workstationSlots";
import { assignAgentsToFixedDesks } from "../lib/sceneState";
import { AgentDesk } from "./AgentDesk";

type DeskGridProps = {
  agents: AgentVisualState[];
  hoveredAgentId: string | null;
  selectedAgentId: string | null;
  onHover: (agentId: string | null) => void;
  onSelect: (agentId: string | null) => void;
};

export function DeskGrid({
  agents,
  hoveredAgentId,
  selectedAgentId,
  onHover,
  onSelect,
}: DeskGridProps) {
  const assignments = assignAgentsToFixedDesks(agents);

  return (
    <group>
      {assignments.map((assignment, index) => {
        const slot = FIXED_WORKSTATION_SLOTS[index];
        return (
          <AgentDesk
            key={slot.id}
            position={slot.position}
            label={slot.label}
            agent={assignment.agent}
            hovered={hoveredAgentId === assignment.agent?.id}
            selected={selectedAgentId === assignment.agent?.id}
            onHover={onHover}
            onSelect={onSelect}
          />
        );
      })}
    </group>
  );
}
