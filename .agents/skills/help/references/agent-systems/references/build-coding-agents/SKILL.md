---
name: build-coding-agents
description: Design coding-agent execution, observation, repair, and verification loops.
---

# Build Coding Agents

Make code execution the agent's symbolic workspace and the filesystem its durable hub. Coding works best when goals are clear, feedback is fast, and correctness is executable.

## Method

1. Establish an acceptance baseline, execution boundary, feedback signals, and rollback path.
2. Provide the smallest useful tool set: inspect, search, edit, execute, and version or rollback.
3. Apply [diagnose-problem's method](../../../software-craft/references/diagnose-problem/SKILL.md#method) to the agent's repair loop. Specify the runtime's reproduction and diagnostic feedback; loop design does not authorize application edits.
4. Put deterministic rules in code. Use language instructions for judgment and tool checklists for process.
5. Classify failures by layer: model decision, tool/API, context/serialization, environment, or control loop.
6. Retry only transient failures. Fingerprint equivalent failures, trip a circuit breaker, and change strategy.
7. Use [verify-change](../../../software-craft/references/verify-change/SKILL.md#method) for completion evidence.
8. Retain the trajectory and patch so successful repairs can become reusable examples, tools, or workflows.
9. Use code as a meta-capability when it is the clearest medium: symbolic analysis, deterministic rule enforcement, adapters, generated tools, multimedia pipelines, generative UI, or agent bootstrapping.

## Design rules

- Reuse and modify a working implementation before generating a large new system. Gall's Law favors evolution from something that already works.
- Keep the control code simple. Kernighan's Law makes every clever branch a future debugging liability.
- Treat exact bytes, schemas, exit codes, and filesystem state as ground truth.
- Keep dynamic code behind a stable data and permission boundary.
- Prefer minimal, reversible patches.

Source: *Building AI Agents*, Chapter 5, “Coding Agents.”
