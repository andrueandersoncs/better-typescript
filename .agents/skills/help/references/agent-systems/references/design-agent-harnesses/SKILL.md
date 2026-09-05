---
name: design-agent-harnesses
description: Design agent control loops, autonomy, execution gates, feedback, and recovery.
---

# Design Agent Harnesses

Treat the agent as `model + context + tools`; treat the harness as the system that prepares context, exposes actions, constrains execution, verifies results, and drives correction.

## Method

1. Write the task, environment, success evidence, failure cost, and allowed autonomy.
2. Map the observation space: what the model can see, at what fidelity, and how fresh it is.
3. Map the action space: available tools, permissions, side effects, and reversibility.
4. Start with the smallest complete control structure:
   - Prompt for one bounded judgment.
   - Workflow for a known sequence or branch structure.
   - Autonomous loop only when the path cannot be specified in advance.
5. Keep the request prefix stable. Append observations and actions as a structured trajectory.
6. Put each guarantee in the deepest practical layer:
   - Context for guidance.
   - Execution gates for permissions and irreversible actions.
   - Data-layer constraints for invariants the agent must never bypass.
7. Define the loop as observe, decide, act, verify, and repair. Let external evidence decide completion.
8. Add recovery by failure class: retry transient failures, change strategy after repeated equivalent failures, and stop at an explicit budget.
9. Compare model swaps and harness ablations on the same tasks before attributing failure. Select models by task capability, policy boundary, latency, cost, and required modalities; record limitations transparently.

## Design rules

- Once the model is fixed, improve observations, tools, and feedback before adding handcrafted exceptions. The Bitter Lesson favors general capabilities and search over brittle domain logic.
- Evolve complexity from a working simple system, following Gall's Law.
- Prefer foundational tools that compose. Add dedicated tools where permissions, auditability, or strict business rules require them.
- Preserve raw evidence outside compressed context.
- Make changes as minimal, attributable, reversible diffs.

Source: *Building AI Agents*, Chapter 1, “Agent Fundamentals.”
