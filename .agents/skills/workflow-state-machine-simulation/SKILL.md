---
name: workflow-state-machine-simulation
description: Generate a source-grounded, event-driven workflow simulation as a static Mermaid state diagram, with an optional canonical graph-only web app. Use when asked to visualize, explore, teach, simulate, or export a workflow, procedure, algorithm, function, or skill as a state machine without executing it.
compatibility: Produces Mermaid stateDiagram-v2 source and, when explicitly requested, a standalone HTML app for a modern JavaScript-enabled browser.
---

# Workflow State Machine Simulation

Create a source-grounded state-machine projection for inspection and learning without executing the target, performing its side effects, modifying its sources, or presenting inferred behavior as observed runtime behavior.

## Inputs

1. **Target:** A required inline or repository-relative workflow, procedure, algorithm, function, or skill in prose, pseudocode, source code, or Markdown; include an entry point when the source defines multiple operations.
2. **Scenario:** Optional initial arguments, machine context, environment values, and expected external responses; omitted values remain symbolic.
3. **Supporting context:** Optional available definitions, data shapes, invariants, and external behavior that may explain but not override the target.
4. **Controls:** Optional entry-point override, abstraction level, expansion or focus controls, event-name or payload overrides, initial scenario, repository-relative `.mmd` destination, explicit HTML request, and repository-relative `.html` destination.

## Outputs

1. **Simulation result:** One validated static Mermaid `.mmd` projection at the resolved destination, an interactive canonical-template `.html` projection only when explicitly requested, and a concise completion report; it is complete when every selected artifact matches one source-grounded machine model, all modeled terminal outcomes are reachable, validation evidence and symbolic or bounded behavior are disclosed, no unselected or unauthorized destination was changed, and no target code or side effect was executed.

## Procedure

### 1. Resolve the simulation contract

**Inputs:**

    a. Target.
    b. Scenario.
    c. Supporting context.
    d. Controls.

**Constraints:**

    a. Read the target and relevant supplied or repository context completely.
    b. Fix the root operation, entry point, initial context, authority order, abstraction boundary, and source identifiers.
    c. Treat the target as authoritative and surface any conflicting supporting context.
    d. Default to Mermaid only at `workflow-state-machine-simulation.mmd` in the active repository root.
    e. Select HTML only when explicitly requested and, when selected without a destination, place it beside Mermaid with the same basename.
    f. Stop before writing when the target or entry point is missing, unreadable, or ambiguous.
    g. Stop before writing when a selected destination exists without explicit revision authority.
    h. Leave every unselected HTML file untouched.

**Outputs:**

    a. Fixed simulation contract and selected destinations.
    b. Blocking report when the contract cannot be fixed.

### 2. Map the source-grounded machine

**Inputs:**

    a. Fixed simulation contract.

**Constraints:**

    a. Map reachable start, operation, decision, waiting, success, error, blocked, and truncated states in source order.
    b. Map every reachable transition with its trigger, guard, payload, material context reads and writes, intended side effects, return, or error.
    c. Represent local calls at the chosen abstraction level and undefined or external calls as opaque waiting states.
    d. Preserve loops as cycles and recursion as a bounded summary.
    e. Keep absent values, responses, timing, and concurrency ordering symbolic unless the source or scenario fixes them.
    f. Expose every source-feasible outcome controlled by missing information as an explicit event or finite payload choice.
    g. Do not invent business rules or target behavior.

**Outputs:**

    a. Finite source-grounded topology with explicit reachable outcomes.

### 3. Define deterministic event semantics

**Inputs:**

    a. Source-grounded topology.
    b. Fixed simulation contract.

**Constraints:**

    a. Set the initial active state, initial declarative context, and accepted event set for every state.
    b. Define each event type once with a source-derived name and readable label.
    c. Make each accepted event evaluate only allowlisted declarative guards, apply declarative context updates, and enter one defined destination.
    d. Split ambiguous outcomes into distinct events or require a finite payload choice.
    e. Retain intended side effects only as labels and never execute them.
    f. When HTML is selected, define source-grounded node coordinates, rejected-event feedback, and a reserved local reset that restores pristine state and context.
    g. Exclude generic Next, Back, and timeline behavior that hides the event model.

**Outputs:**

    a. One deterministic shared machine model from which every selected projection can be generated.

### 4. Write the Mermaid projection

**Inputs:**

    a. Shared machine model.
    b. Resolved Mermaid destination.

**Constraints:**

    a. Follow [`references/mermaid-diagram-spec.md`](references/mermaid-diagram-spec.md).
    b. Begin with `stateDiagram-v2` and write raw Mermaid source without a Markdown wrapper.
    c. Declare every state once with a deterministic Mermaid-safe alias.
    d. Render the initial pseudostate, every event-labeled transition, every cycle, and every terminal final transition exactly once.
    e. Preserve model order and omit runtime context, controls, HTML-only behavior, and inferred transitions.

**Outputs:**

    a. Static Mermaid projection at the resolved `.mmd` destination.

### 5. Write the optional HTML projection

**Inputs:**

    a. Shared machine model.
    b. HTML selection and resolved destination.

**Constraints:**

    a. When HTML is unselected, skip this step without creating, modifying, or validating any HTML file.
    b. When HTML is selected, follow [`references/interactive-artifact-spec.md`](references/interactive-artifact-spec.md).
    c. Copy [`assets/app-template.html`](assets/app-template.html) to the destination and replace only the machine value between `// MACHINE_DATA_START` and `// MACHINE_DATA_END`.
    d. Preserve every other template byte, including its structure, styling, renderer, controls, accessibility behavior, and runtime logic.
    e. Encode embedded target strings safely and add no executable target code, external packages, remote assets, network requests, or target side effects.
    f. Keep the visible interface to the full-viewport graph and minimal floating graph controls defined by the template.

**Outputs:**

    a. No HTML change when unselected.
    b. Canonical interactive projection at the resolved `.html` destination when selected.

### 6. Validate the model and selected projections

**Inputs:**

    a. Target and scenario.
    b. Shared machine model.
    c. Mermaid projection.
    d. Optional selected HTML projection.

**Constraints:**

    a. Compare the model with the target and correct omissions, impossible paths, fabricated values, and hidden truncation.
    b. Validate Mermaid against [`references/mermaid-diagram-spec.md`](references/mermaid-diagram-spec.md) with an available Mermaid CLI or library; otherwise run its static checks and disclose that rendering was unavailable.
    c. Require model-to-Mermaid equality for state IDs, transitions, event labels, initial state, cycles, and terminal outcomes.
    d. When HTML is selected, validate every route and required interaction against [`references/interactive-artifact-spec.md`](references/interactive-artifact-spec.md) with available browser automation.
    e. When browser automation is unavailable, run the specification's static checks and disclose that live interaction was unavailable.
    f. When HTML is selected, compare it with the canonical template after normalizing only the machine data block and require model parity across both projections.
    g. Correct a failed selected projection and repeat its checks; report an unresolved validation failure without claiming completion.

**Outputs:**

    a. Passing validation evidence for every selected projection.
    b. Exact unresolved failure and selected-output status when validation cannot pass.

### 7. Publish the simulation result

**Inputs:**

    a. Simulation contract.
    b. Selected artifacts.
    c. Validation evidence or unresolved failure.

**Constraints:**

    a. Leave only validated, authorized artifacts at their resolved destinations.
    b. On success, report `Simulation: complete`, `Mermaid: <path> (static; <validation method>)`, `Target: <target and entry point>`, `Terminals: <outcomes>`, `Symbolic behavior: <items|None>`, and `Bounded or omitted: <items|None>`.
    c. When HTML was selected, also report `HTML: <path> (<validation method>)`.
    d. On unresolved failure, report `Simulation: incomplete`, the exact failure, and every selected artifact's status instead of a success report.
    e. Distinguish source-grounded behavior from scenario choices and never claim that the target ran.

**Outputs:**

    a. Exact simulation completion report or unresolved-failure report.
    b. Complete simulation result only when every selected projection is source-grounded, mutually consistent, validated or explicitly limited by the disclosed method, and published at its authorized destination.
