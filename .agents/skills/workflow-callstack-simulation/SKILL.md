---
name: workflow-callstack-simulation
description: Generate a source-grounded, callstack-style dry-run simulation of a workflow, procedure, algorithm, or function for a supplied scenario, showing nested frames, branches, and state changes. Use when asked to simulate, dry-run, walk through, or trace execution step by step without running it.
---

# Workflow Callstack Simulation

Model supplied behavior as a source-grounded trace for inspection without executing the target, modifying target or context sources, performing described side effects, or claiming observed runtime or timing.

## Inputs

### A. Target

A required inline or repository-relative workflow, procedure, algorithm, or function in prose, pseudocode, source code, or a skill. An entry point is also required when the source defines multiple operations. The target is authoritative for control flow, calls, state transitions, returns, and errors.

### B. Scenario

Optional arguments, initial state, environment values, and expected external responses. Omitted values and their dependent results remain symbolic.

### C. Supporting context

Optional available definitions for callees, procedures, data shapes, invariants, and external behavior. Relevant context accompanying a target path is required input, but may explain rather than override the target; conflicts must be surfaced.

### D. Controls

Optional entry-point override, branch selection, expansion depth, loop or recursion limit, focus area, `compact` or `expanded` detail, and repository-relative Markdown destination. Defaults are compact detail, expansion of described local calls, three loop iterations, ten recursive frames, and inline output. Revising an existing destination requires explicit user authority.

## Outputs

### A. Callstack

One Markdown callstack, returned inline or written to the authorized destination, that conforms to [`references/simulation-template.md`](references/simulation-template.md), the sole formatting specification. It is complete when it directly presents the validated, source-traceable call hierarchy and material decisions without a title, section heading, metadata, wrapper, or completion message.

## Procedure

### 1. Resolve the contract

Read every input and determine the root operation, initial values, source identifiers, authority order, limits, and output location. If supporting context conflicts with the target, retain the target's behavior and flag the conflict. If the target or entry point is missing, unreadable, or ambiguous, stop before creating a callstack and name the blocker. Also stop when the requested destination exists without revision authority. This step is complete when the simulation contract is fixed or a blocker has been returned.

### 2. Build the execution model

Map ordered operations, call edges, conditions, loop and recursion boundaries, state reads and writes, side effects, returns, and errors. Link locally defined callees while retaining source terminology. Classify transitions as source- or scenario-derived, keep missing dependencies symbolic, and never invent business rules, runtime behavior, external responses, or timing. This step is complete when every reachable transition has a modeled or explicitly blocked representation.

### 3. Simulate the model

Initialize and enter the root frame with concrete or symbolic bindings before tracing the model depth-first:

- For an expanded call, push a child frame, trace it to an exit, pop it, and bind its result before resuming the caller.
- Follow a condition selected by scenario data or an authorized control. Otherwise fork finite feasible cases without mutating their shared pre-condition state; block a dependent path that cannot proceed symbolically.
- Treat an undefined or external callee as an opaque leaf. Apply a supplied response, or preserve its symbolic result while concrete-independent tracing remains possible.
- Record only state changes that affect later control flow, outputs, or side effects, including `before → after` and their basis.
- Propagate errors as the target specifies. At a loop or recursion limit, mark the unmodeled remainder truncated or summarize the modeled iterations without implying it ran.
- For asynchronous or concurrent work, retain only source-guaranteed ordering.

This step is complete when each path has balanced stack transitions or an explicit blocked or truncated boundary.

### 4. Validate the trace

Compare the trace with every input and correct omissions, reordering, impossible case combinations, fabricated values, unsupported state changes, hidden truncation, and violations of the workflow boundary. This step is complete when every frame is source-traceable and every blocker or truncation is represented within the callstack.

### 5. Publish the callstack

Render the validated trace according to the output contract, then return it inline or write it at the resolved destination. Output the callstack directly: do not add a simulation title, `## Callstack` heading, scenario, status, execution, limits, wrapper, or separate completion message. The workflow is complete when that callstack exists at the resolved location.

## Callstack Simulation

**Workflow Callstack Simulation**(target, scenario, supporting context, controls)
│
├─ **Resolve The Contract**(inputs, entry point, authority order, limits, output location)
│  │
│  ├─ if (the target or entry point is missing, unreadable, or ambiguous): stop and name the blocker
│  │
│  ├─ else if (the destination exists without revision authority): stop and name the blocker
│  │
│  └─ else: fix the contract; target behavior remains authoritative over conflicting context
│
├─ **Build The Execution Model**(fixed contract)
│  │
│  └─ **Map Reachable Transitions**(operations, calls, conditions, state, side effects, returns, errors)
│     │
│     └─ if (a dependency is missing): keep its behavior symbolic rather than inventing rules
│
├─ **Simulate The Model**(execution model, concrete and symbolic bindings)
│  │
│  ├─ **Enter The Root Frame**(root operation, initial bindings)
│  │
│  └─ **Trace The Model Depth First**(reachable paths)
│     │
│     ├─ **Expand A Local Call**(callee bindings)
│     │
│     ├─ **Select A Condition**(scenario data or authorized control)
│     │  │
│     │  ├─ if (a branch is selected): follow that branch
│     │  │
│     │  ├─ else if (finite feasible cases remain): fork cases from the shared pre-condition state
│     │  │
│     │  └─ else: block the dependent path
│     │
│     ├─ **Resolve An External Callee**(supplied or symbolic response)
│     │  │
│     │  ├─ if (a response is supplied): apply it
│     │  │
│     │  └─ else: preserve a symbolic result while concrete-independent tracing remains possible
│     │
│     ├─ **Record A Material State Change**(before and after values, source or scenario basis)
│     │
│     ├─ **Propagate An Error**(target-defined error behavior)
│     │
│     ├─ **Bound Repetition**(loop or recursion limit)
│     │  │
│     │  └─ if (the limit is reached): mark the remainder truncated or summarize modeled iterations
│     │
│     └─ **Retain Source Guaranteed Ordering**(asynchronous or concurrent work)
│
├─ **Validate The Trace**(trace, target, scenario, context, controls)
│  │
│  └─ if (an omission, impossible combination, fabrication, hidden truncation, or boundary violation exists): correct it before publication
│
└─ **Publish The Callstack**(validated trace, resolved output location)
   │
   ├─ if (the output is inline): return the raw callstack
   │
   └─ else: write the raw callstack to the authorized destination
