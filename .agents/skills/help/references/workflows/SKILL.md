---
name: workflows
description: Trace or model a workflow without executing it, using source-grounded callstack and state-machine projections.
metadata:
  internal: true
---

# Workflows

Follow the shared [gather → match → handoff procedure](../skill-routers/references/canonical-design.md). The distinguishing context is which views are requested and which projections are already usable for the same source, entry point, scenario, and bounds.

| Situation pattern | Skill |
| --- | --- |
| A callstack trace is requested on its own, or it is the only missing or stale view in a request for both projections. | [`simulate-callstack`](references/simulate-callstack/SKILL.md) |
| A state-machine projection is requested on its own, or both views are requested and the callstack is not the only missing or stale view. | [`simulate-state-machine`](references/simulate-state-machine/SKILL.md) |
