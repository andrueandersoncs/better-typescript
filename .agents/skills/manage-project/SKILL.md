---
name: manage-project
description: "Manage an AI-agent project from request through decomposition, preparation, routing, execution, monitoring, review, and closure using durable task records. Use when asked to manage, coordinate, run, or track a multi-task project."
compatibility: Requires concurrent fresh-subagent delegation and a durable project record accessible to all participating agents.
---

# Manage Project

Manage one project through owned, evidence-backed tasks; this skill coordinates the work rather than replacing each task's specialist workflow.

Use this global `workflow-model`:

- Run every step in a new, fresh subagent.
- Keep the invoking agent as the single accountable project owner; subagents may plan, execute, monitor, or review, but the owner maintains the project record, resolves handoffs, and reports the result.
- Give every step, workflow input, and output a unique kebab-case identifier and bind each input or output ID to `$<id>` in task text.
- Treat only `Wait` inputs as dependencies; every `Use` value is available initially.
- Launch all ready steps concurrently and launch newly ready steps immediately.
- A step is ready only when its inputs, context, tools, permissions, and environment are available.
- When a requirement is unavailable, mark the affected work `Blocked`, record the unmet condition and its review event or time, and do not launch dependents.
- After each meaningful action, persist artifacts, evidence, decisions, active job handles, status changes, and the next action in the project record.
- Start asynchronous work once, save its handle and output location, and inspect it only when its completion event occurs.
- Keep task status equal to its current condition: `Not started`, `Ready`, `In progress`, `Blocked`, `In review`, or `Done`.
- Move no task to `Ready` without the complete Ready gate and move no task to `Done` without review of both its definition of done and outcome.
- Use `references/ai-agent-processes.md` as the global `task-management-reference` for field meanings, gates, transitions, and role responsibilities.

## Inputs

- **project-request:** The requested project, intended outcome, constraints, and known completion conditions in any workable form.
- **project-context:** Available source locations, repository instructions, prior decisions, tools, permissions, people, deadlines, and existing project records.
- **project-record-location:** A durable file or system location for project state; when omitted, choose a clear repository-local Markdown path.

## Outputs

- **managed-project-result:** The completed project deliverables and durable project record, with inspectable evidence and an independent passed review; when incomplete, the same record states the current status, blocker or corrective action, resume trigger, and next action.

## Tasks

### interpret-project: Define the project and its tasks

Read the project request $project-request and project context $project-context, then use $task-management-reference to define the project outcome, finite completion criteria, governing context, and the smallest set of independently completable task records; create or update the durable record at $project-record-location and preserve authoritative material by reference.

**Inputs:**

- Use workflow input project-request.
- Use workflow input project-context.
- Use workflow input project-record-location.
- Use global value task-management-reference.

**Constraints:**

- Each task must describe one coherent observable result.
- The project record must let an agent act without hidden conversation state.

**Outputs:**

- project-definition: The project outcome, completion criteria, and governing context.
- project-task-set: The decomposed task records in `Not started`.
- initialized-project-record: The durable project record path and initialized contents.

### prepare-project-work: Apply the Ready gate

Prepare every task in $project-task-set against $project-definition and persist the result in $initialized-project-record: assign exactly one accountable owner, verify inputs and dependencies, confirm tools and environment, write one concrete next action, and use $task-management-reference to set each task to `Ready` or `Blocked` with a resume trigger.

**Inputs:**

- Wait for interpret-project to produce project-task-set.
- Wait for interpret-project to produce project-definition.
- Wait for interpret-project to produce initialized-project-record.
- Use global value task-management-reference.

**Constraints:**

- `Ready` requires every Ready-gate condition to pass now.
- Every `Blocked` task must name its unmet condition and review event or time.

**Outputs:**

- prepared-project-record: The durable record with ownership, readiness facts, next actions, and accurate statuses.
- project-readiness-summary: The ready tasks, blocked tasks, and resume triggers.

### plan-and-route-project: Allocate project work

Use $prepared-project-record and $project-readiness-summary to record true deadlines, relative priorities with reasons, effort, scheduled capacity, capability routing, useful parallel delegation, and asynchronous completion events according to $task-management-reference, then persist the routing decisions without changing status merely because work was planned.

**Inputs:**

- Wait for prepare-project-work to produce prepared-project-record.
- Wait for prepare-project-work to produce project-readiness-summary.
- Use global value task-management-reference.

**Constraints:**

- `Due` records a true deadline; `Scheduled` records reserved work time.
- One project owner remains accountable for combining delegated results.

**Outputs:**

- routed-project-record: The durable record with priority, effort, schedule, delegation, and asynchronous-work decisions.

### execute-and-control-project: Complete and coordinate project tasks

Operate from $routed-project-record using $project-definition, $project-context, and $task-management-reference: launch all ready independent work, inspect actual results, persist each transition and checkpoint, process every reached blocker follow-up, asynchronous completion event, scheduled window, deadline risk, and review event without busy-polling, reapply the Ready gate whenever facts change, and emit the current result, evidence, and durable state after all currently actionable work and reached events are processed.

**Inputs:**

- Wait for plan-and-route-project to produce routed-project-record.
- Wait for interpret-project to produce project-definition.
- Use workflow input project-context.
- Use global value task-management-reference.

**Constraints:**

- Use each target system's normal interface and environment.
- Status changes and their supporting field updates must be one persisted operation.
- Preserve unresolved work with its actual status, blocker or pending event, resume trigger, active handle, checkpoint, and next action.

**Outputs:**

- current-project-result: The deliverables produced so far, including the completed candidate when all required tasks are `Done`.
- current-project-evidence: The inspectable evidence gathered for task outcomes and project completion criteria.
- current-project-record: The durable record after all currently actionable work and reached events are processed.

### review-project-outcome: Independently verify the managed project

Inspect $current-project-result in its actual destination, $current-project-evidence, $current-project-record, and $project-definition from a fresh independent context; use $task-management-reference to return `Passed` when every completion criterion and the outcome pass, `Failed` with one concrete corrective action when a completed candidate is deficient, or `Incomplete` when work is still waiting or actionable.

**Inputs:**

- Wait for execute-and-control-project to produce current-project-result.
- Wait for execute-and-control-project to produce current-project-evidence.
- Wait for execute-and-control-project to produce current-project-record.
- Wait for interpret-project to produce project-definition.
- Use global value task-management-reference.

**Constraints:**

- Inspect evidence rather than accepting agent claims.
- Preserve unaffected behavior unless the project authorizes broader change.
- Pass only when every criterion and the project outcome are satisfied.

**Outputs:**

- project-review-verdict: `Passed`, `Failed`, or `Incomplete`, with evidence for the decision.
- project-corrective-action: One concrete corrective action when a completed candidate fails review, otherwise `None`.

### report-project-result: Report completion or resumable work

Report $current-project-result and the record location and actual state from $current-project-record using $project-review-verdict, $project-corrective-action, and $current-project-evidence; claim completion only for `Passed`, reapply the Ready gate before recording corrective work for `Failed`, and for `Incomplete` preserve each task's real status, blocker or pending event, resume trigger, active handle, checkpoint, and next action.

**Inputs:**

- Wait for execute-and-control-project to produce current-project-result.
- Wait for execute-and-control-project to produce current-project-record.
- Wait for review-project-outcome to produce project-review-verdict.
- Wait for review-project-outcome to produce project-corrective-action.
- Wait for execute-and-control-project to produce current-project-evidence.

**Constraints:**

- Claim completion only when the independent review verdict is `Passed`.
- Report the result location, completion state, and supporting evidence.

**Outputs:**

- managed-project-result: The completed project report, or an incomplete resumable report with the current state and required next action.
