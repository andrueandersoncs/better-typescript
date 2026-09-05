---
name: coordinate-agent-teams
description: Design multi-agent topology, context ownership, delegation, and handoff protocols.
---

# Coordinate Agent Teams

Use multiple agents only when collaboration adds information, independent evidence, useful parallelism, or necessary isolation that one agent cannot obtain as effectively.

## Decision sequence

1. Compare against one agent with the same total compute. State the expected information gain and cost.
2. Choose context ownership:
   - Shared context when later roles need the full history and context growth is bounded.
   - Isolated context when work benefits from focus, concurrency, permission separation, or modularity.
3. Choose the smallest topology:
   - Peer loop for two or three independent perspectives or proposer-reviewer repair.
   - Manager-worker for decomposition, dependencies, scheduling, and aggregation.
   - Decentralized handoff for peer autonomy across stable interfaces.
4. Apply [coordinate-agents' method](../../../software-craft/references/coordinate-agents/SKILL.md#method) for ownership, handoffs, writer isolation, and integration evidence to the designed system, without dispatching workers for this design task.
5. Separate durable artifacts from control messages for assignments, status, results, and termination.
6. Budget steps, tokens, money, and concurrency. When workers are redundant alternatives, cancel the others after the first verified success.
7. Bound loops with stop conditions, cycle detection, settlement locks, graceful cancellation, and escalation.

## Coordination rules

- Give the strongest planning capability to the manager; its decomposition constrains the whole system.
- Design cognitive diversity through different evidence, roles, tools, contexts, or models.
- Apply Brooks's Law: every added participant creates communication and integration cost. Add an agent only when its contribution exceeds that cost.
- Apply Conway's Law deliberately: align agent boundaries and interfaces with the structure the output should have.
- Preserve human understanding of architecture, evidence, and responsibility.

Source: *Building AI Agents*, Chapter 10, “Multi-Agent Collaboration.”
