---
name: simulate-callstack
description: Generate a source-grounded, callstack-style dry-run simulation of a workflow, procedure, algorithm, or function for a supplied scenario, showing nested frames, branches, and state changes. Use when asked to simulate, dry-run, walk through, or trace execution step by step without running it.
---

# Workflow Callstack Simulation

Model supplied behavior as a source-grounded trace for inspection without executing the target, modifying target or context sources, performing described side effects, or claiming observed runtime or timing.

## Inputs

1. **Target:** An inline or repository-relative workflow, procedure, algorithm, function, or skill in prose, pseudocode, source code, or Markdown; include an entry point when the source defines multiple operations.
2. **Scenario:** Optional arguments, initial state, environment values, and expected external responses; omitted values remain symbolic.
3. **Supporting context:** Optional available definitions, data shapes, invariants, and external behavior; relevant context accompanying a target path may explain but not override the target.
4. **Controls:** Optional entry-point override, branch selection, expansion depth, loop or recursion limit, focus area, `compact` or `expanded` detail, and repository-relative Markdown destination; defaults are compact detail, expansion of described local calls, three loop iterations, ten recursive frames, and inline output.
5. **Requested views:** Views assigned to this task: callstack only, or both projections with any authorized Mermaid or HTML destinations. A supporting invocation uses its assigned view only; the full original request remains context.


## Outputs

1. **Callstack:** One Markdown callstack returned inline or written to the authorized destination, conforming to [`references/simulation-template.md`](references/simulation-template.md); it is complete when it directly presents the validated, source-traceable call hierarchy and material decisions without a title, section heading, metadata, wrapper, or completion message.
2. **State-machine companion:** When this task's requested views include it, the source-grounded Mermaid and optional HTML projection under [`../simulate-state-machine/SKILL.md`](../simulate-state-machine/SKILL.md).

## Procedure

### 1. Resolve the simulation contract

**Inputs:**

    a. Target.
    b. Scenario.
    c. Supporting context.
    d. Controls.
    e. Requested views.

**Constraints:**

    a. Determine the root operation, initial values, source identifiers, authority order, requested views, limits, and output locations.
    b. Treat the target as authoritative for control flow, calls, state transitions, returns, and errors.
    c. Surface context conflicts while retaining the target's behavior.
    d. Stop and name the blocker when the target or entry point is missing, unreadable, or ambiguous.
    e. Retain supplied projections that already satisfy the assigned views and skip their production steps. Stop if a destination that needs writing already exists without explicit revision authority.

**Outputs:**

    a. Fixed simulation contract.
    b. Blocker when the contract cannot be fixed.

### 2. Build the execution model

**Inputs:**

    a. Fixed simulation contract.

**Constraints:**

    a. Map ordered operations, call edges, conditions, repetition boundaries, state reads and writes, side effects, returns, and errors.
    b. Link locally defined callees while retaining source terminology.
    c. Classify transitions as source- or scenario-derived.
    d. Keep missing dependencies and values symbolic.
    e. Do not invent business rules, runtime behavior, external responses, timing, or concurrency order.

**Outputs:**

    a. Source-grounded model of every reachable transition.

### 3. Simulate the model

**Inputs:**

    a. Source-grounded execution model.
    b. Initial concrete and symbolic bindings.

**Constraints:**

    a. Enter the root frame and trace reachable operations depth-first.
    b. For an expanded local call, push and trace a child frame, then bind its result before resuming the caller.
    c. Follow a branch selected by scenario data or an authorized control; otherwise fork finite feasible cases from their shared pre-condition state.
    d. Block a dependent path that cannot continue symbolically.
    e. Treat an undefined or external callee as an opaque leaf, applying a supplied response or preserving a symbolic result.
    f. Record only state changes that affect later control flow, outputs, or side effects, including `before → after` and their basis.
    g. Propagate errors as the target specifies.
    h. At a loop or recursion limit, mark the remainder truncated or summarize modeled iterations without implying execution.
    i. Retain only source-guaranteed ordering for asynchronous or concurrent work.

**Outputs:**

    a. Trace with balanced stack transitions or explicit blocked or truncated boundaries.

### 4. Validate the trace

**Inputs:**

    a. Simulated trace.
    b. Fixed simulation contract.

**Constraints:**

    a. Compare the trace with every input.
    b. Correct omissions, reordering, impossible case combinations, fabricated values, unsupported state changes, hidden truncation, and boundary violations.
    c. Require every frame and material decision to be source-traceable.

**Outputs:**

    a. Validated callstack trace.

### 5. Publish the callstack

**Inputs:**

    a. Validated callstack trace.
    b. Resolved output location.

**Constraints:**

    a. Render the trace exactly according to [`references/simulation-template.md`](references/simulation-template.md).
    b. Return it inline or write it to the authorized destination.
    c. For a callstack-only task, publish only the callstack in the template's form. For a combined task, retain that form while completing the requested state-machine companion under its own publication rules.
    d. For a combined task, retain a supplied state-machine projection that already satisfies the task. Otherwise apply [`../simulate-state-machine/SKILL.md`](../simulate-state-machine/SKILL.md) to a state-machine-only subtask with the same source, scenario, bounds, and authorized destinations. Keep the original request as context; the supporting procedure produces only the missing companion.

**Outputs:**

    a. Callstack at the resolved location.
    b. When requested, every selected state-machine companion artifact.
    c. Complete result only when all requested views are published.

## Done

The returned callstack is source-traceable, respects the requested bounds and scenario, and contains no fabricated execution or side effects. For a combined request, the callstack and every requested state-machine artifact are complete.
