---
name: manage-project
description: Manage a multi-task project through a durable record and CLI or board across owners, blockers, and asynchronous events.
metadata:
  internal: true
compatibility: Requires the `andrue-cli` command from `@andrue/cli` and a durable project record accessible to participating agents.
---

# Manage Project

Use `andrue-cli manage-project` for durable coordination. Keep one project owner accountable for the record and final result; each task retains its specialist workflow.

## Record

At a handoff from [manage-work-queue](../software-craft/references/manage-work-queue/SKILL.md), preserve the established execution-state authority unless a transfer was requested. Explicitly map or link the CLI record and existing tracker; do not maintain independently editable copies of task status.

```sh
andrue-cli manage-project --record <path> <command>
```

Use `project.json` only when no canonical execution record already exists. Start the optional operator board with `serve`; it reads and writes this record.

Read [the task-management reference](references/ai-agent-processes.md) for field meanings, readiness gates, status transitions, and role responsibilities before changing task state.

## Workflow

1. Initialize the project with its observable outcome and finite completion criteria. Add the smallest set of independently completable tasks.
2. Give each task one owner and a concrete next action. Verify its inputs, dependencies, tools, and environment before marking it `Ready`; otherwise record `Blocked` with the unmet condition and review event or time.
3. Start ready work. Delegate or parallelize independent tasks with clear ownership and an integration point. Start asynchronous work once, retain its handle, and inspect it at its completion event.
4. Persist meaningful transitions, evidence, decisions, blockers, resume triggers, and next actions as they occur. Update status and its supporting fields atomically; keep `Not started`, `Ready`, `In progress`, `Blocked`, `In review`, and `Done` equal to actual conditions.
5. Submit task evidence for independent review against its definition of done. Review the combined result against the project outcome and every completion criterion.
6. Continue corrective work while authorized actions remain. Reapply the Ready gate after review or changed facts. For a failed task review with an unavailable requirement, include `--action`, `--blocked-by`, and `--follow-up`; the CLI records `Ready` or `Blocked` atomically.

| Action | Command |
| --- | --- |
| Define | `init --outcome --done`, then `add <id> --task --outcome --done` |
| Prepare | `prepare <id> --owner --next` |
| Allocate | `route <id> --priority --effort` |
| Execute | `start`, `pause --next`, `block --dependency --follow-up`, `submit --evidence` |
| Review | `review-task <id> --verdict Passed` or `Failed`, then `review --verdict Passed`, `Failed`, or `Incomplete` |
| Report | `report` |

## Done

Claim completion only after independent review passes the project outcome and every completion criterion. Otherwise, report the current result and record path with each unfinished task's actual status, blocker or pending event, resume trigger, active handle, checkpoint, and next action.
