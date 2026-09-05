---
name: design-agent-tools
description: Design agent-facing tool contracts, discovery, permissions, feedback, and MCP integration.
---

# Design Agent Tools

Design the interface around the agent's goal, not the underlying API. A tool should expose one legible capability with faithful parameters, useful feedback, and enforceable boundaries.

## Method

1. Classify the need as perception, execution, or agent collaboration control.
2. Write the agent goal and the evidence that confirms success.
3. Prefer a general executor or skill when composition is enough. Create a dedicated tool for high-frequency actions, complex parameter sets, platform adaptation, permissions, security, or audit requirements.
4. Define the contract:
   - When to use it.
   - Boundaries, required inputs, their exact meaning, and concrete parameter examples.
   - Side effects, cost, and authorization.
   - Structured result, pagination, and explicit truncation.
   - Observable evidence of completion.
5. Preserve parameter fidelity. Do not silently rewrite, infer, or inject values.
6. Use a small stable catalog plus hierarchical discovery. Load schemas once and expose specialized tools on demand.
   - Use MCP to standardize callable tools and resources across clients.
   - Use a skill to teach when and how to combine tools through a procedure.
7. Apply [secure-system's method](../../../software-craft/references/secure-system/SKILL.md#method) to the tool's authorization and dependency boundaries. Sandbox dynamic code and third-party tools.
8. Make mutations idempotent when possible. Query state before retrying side effects.

## Tool feedback

- Return enough raw evidence for the model to correct itself.
- Store large outputs outside context and return a reference plus summary.
- Use [verify-change](../../../software-craft/references/verify-change/SKILL.md#method) to choose an authoritative observation of the tool's effect.

Tool abstractions leak. State latency, consistency, authorization, and failure semantics instead of hiding them behind a uniform name.

Source: *Building AI Agents*, Chapter 4, “Agent Tools.”
