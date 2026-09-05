---
name: manage-work-queue
description: Turn a large, foggy, or issue-driven program into verified states, decision tickets, blockers, and a claimable ready frontier. Use for triage, roadmap decomposition, issue queues, external pull requests, or work too large for one agent session.
---

# Manage Work Queue

## Inputs

The canonical tracker, issue or program scope, repository evidence, ownership rules, and known decisions and dependencies.

This skill owns tracker triage and the ready frontier. [manage-project](../../../manage-project/SKILL.md) owns a requested durable execution lifecycle. At handoff, preserve the canonical execution record and explicitly map or reference it instead of silently creating a second queue.

## Method

1. Identify the canonical tracker, state model, labels, and ownership rules. Preserve one source of truth.
2. Read the complete issue, linked artifacts, code, history, and related work. Verify claims before changing state.
3. Distinguish:
   - implementation ready now;
   - a blocked decision;
   - research or prototype evidence;
   - duplicate, already completed, rejected, or out of scope;
   - unresolved fog that cannot yet be formulated honestly.
4. Represent only actionable knowledge. Create decision tickets for research, prototyping, or human choices; create implementation tickets only after the contract is clear.
5. Express blocking edges and publish the current ready frontier. Keep each claimable item independently owned and bounded to one context.
6. Recommend the state transition and evidence before applying it. Retain the reason for rejected or deferred work in the repository's established location.
7. Update the map as decisions reveal new work. Resolve one dependent frontier at a time rather than inventing a complete distant plan.

## Output

An updated work queue in which each item has a justified state, explicit blockers, one owner, and a claimable ready frontier.

## Done

Every visible item has one justified state, blockers reflect real dependencies, and the ready frontier can be claimed without hidden context.