---
name: workflow-state-machine-simulation
description:
  Generate a source-grounded event-driven state-machine simulation as a static Mermaid state diagram
  by default, with an optional canonical graph-only web app. Use when asked to visualize, explore,
  teach, or export a workflow, procedure, algorithm, or function as Mermaid, and optionally when
  asked to emit modeled events through a browser graph.
compatibility:
  Produces a Mermaid stateDiagram-v2 source file and, when requested, a standalone HTML app for a
  modern JavaScript-enabled browser.
---

# Workflow State Machine Simulation

Model supplied behavior as a static Mermaid state diagram for inspection and learning by default,
with an optional graph-only, event-driven browser app in which users emit modeled events and watch
the active state and transition update live. Neither output executes the target, performs its side
effects, modifies its sources, or presents inferred behavior as observed runtime behavior.

## Inputs

### A. Target

A required inline or repository-relative workflow, procedure, algorithm, function, or skill in
prose, pseudocode, source code, or Markdown. An entry point is also required when the source defines
multiple operations. The target is read-only and authoritative for states, transitions, guards,
actions, outputs, and errors.

### B. Scenario

Optional initial arguments, machine context, environment values, and expected external responses.
Values the user does not supply remain symbolic; the machine model must preserve source-feasible
outcomes as explicit events or finite event payloads rather than silently inventing them. When HTML
is selected, the app must let the user emit those modeled choices.

### C. Supporting context

Optional available definitions for callees, procedures, data shapes, invariants, and external
behavior. Relevant context accompanying a target path is required input, but it may explain rather
than override the target; surface conflicts and preserve the target's behavior.

### D. Controls

Optional entry-point override, abstraction level, expanded or collapsed operations, focus area,
initial scenario, event-name or payload overrides, repository-relative `.mmd` destination,
interactive HTML companion request, and repository-relative `.html` destination. The default output
is only `workflow-state-machine-simulation.mmd` at the active repository root. Generate HTML only
when the user explicitly requests it; when requested without a destination, use the Mermaid basename
with an `.html` extension at the same location. Revising the Mermaid destination, or the HTML
destination when selected, requires explicit user authority.

### E. Optional canonical app template

When HTML is requested, the bundled [`assets/app-template.html`](assets/app-template.html) is the
authoritative implementation and visual reference for the generated app. Its document structure,
styling, graph renderer, event emitter, controls, tooltips, accessibility behavior, and runtime
logic are read-only template invariants; only the embedded machine data block between
`// MACHINE_DATA_START` and `// MACHINE_DATA_END` is target-specific.

## Outputs

### A. Mermaid state diagram

One Mermaid source file at the resolved `.mmd` destination, generated directly from the shared
machine model and conforming to
[`references/mermaid-diagram-spec.md`](references/mermaid-diagram-spec.md); the bundled
[`references/workflow-state-machine-simulation.mmd`](references/workflow-state-machine-simulation.mmd)
is the generated self-simulation reference. It is complete when a Mermaid renderer can display every
modeled state, event-labeled transition, cycle, initial state, and terminal outcome without
introducing a path absent from the shared model. It is static and does not claim to emit events or
update live.

### B. Optional interactive state-machine artifact

When HTML is explicitly requested, one self-contained HTML file at the resolved destination, created
from the canonical app template with only its machine data block replaced, that implements the same
modeled machine and conforms to
[`references/interactive-artifact-spec.md`](references/interactive-artifact-spec.md). It is complete
when it opens without a build step or network access as a full-viewport graph app, exposes the
events accepted by the active state, lets a keyboard or pointer user emit those events in the app,
and updates the active node, traversed edge, and relevant inline state data live until every modeled
terminal state is reachable. The visible interface contains only the graph and minimal floating
graph controls; it has no website masthead, sidebar, inspector, history, context, legend,
disclosure, or content panel. Do not create or modify an HTML file when HTML was not requested.

### C. Completion report

A concise response containing the Mermaid artifact path, target and entry point, modeled terminal
outcomes, symbolic or unresolved behavior, Mermaid validation performed, and any bounded or omitted
detail; identify Mermaid as static. When HTML was requested, also include its artifact path and
validation method. It is complete when it distinguishes source-grounded behavior from scenario
choices and does not claim that the target itself was executed.

## Procedure

### 1. Resolve the simulation contract

Read every input and determine the root operation, initial context, source identifiers, authority
order, abstraction boundary, Mermaid path, whether HTML was explicitly requested, and the HTML path
only when selected. If supporting context conflicts with the target, retain the target's behavior
and record the conflict for the outputs. If the target or entry point is missing, unreadable, or
ambiguous, stop before creating output and name the blocker. If the Mermaid destination exists
without revision authority, or the selected HTML destination exists without revision authority, stop
without changing any destination and request authority or another path. An existing unselected
`.html` file is irrelevant and must remain untouched. This step is complete when one shared
simulation contract, the Mermaid path, and any selected HTML path are fixed or a blocker has been
reported.

### 2. Build the source-grounded machine

Map the target into a finite model of start, operation, decision, waiting, success, error, blocked,
and truncated states; source-ordered transitions; the event that triggers each transition; guards
and optional event payloads; material context reads and writes; intended side effects; returns; and
errors. Assign every user-drivable transition an explicit event type; define each distinct type
once, derive its name from source terminology such as `SOURCE_VALID`, and retain a readable event
label. Represent a local call as a state or nested group at the chosen abstraction level, an
undefined or external call as an opaque waiting state, a loop as a cycle, and recursion as a bounded
summary rather than unbounded generated states. Never invent business rules, external responses,
timing, or concurrency ordering. If missing information controls a transition, model each
source-feasible outcome as an explicit event or payload choice and label its value symbolic. This
step is complete when every reachable source transition has a modeled event and destination or an
explicit blocked or truncated state.

### 3. Define event semantics

Set the initial active state and context, then determine the accepted event set for every state.
Dispatching an accepted event evaluates only its allowlisted declarative guard, applies its
declarative context updates, traverses the matching edge, and makes the destination active. When one
event can produce multiple source-feasible outcomes, require a modeled payload choice or split it
into distinct events rather than choosing silently. Intended external side effects remain labels on
transitions and never run. When HTML is selected, an unaccepted event leaves the app unchanged and
produces a brief in-graph rejection cue; **Reset** dispatches a reserved local reset event that
restores the pristine state and context; and the app must not provide generic **Next**, **Back**, or
timeline controls that hide the event model. This step is complete when every modeled transition has
an explicit event and destination, every dispatch is deterministic for its event and payload, and no
event can enter an undefined state; when HTML is selected, every modeled transition must also be
reachable by emitting its event in the app.

### 4. Create the Mermaid diagram

Render the in-memory machine model according to the Mermaid diagram specification. Declare every
state once with a deterministic Mermaid-safe alias, connect the initial pseudostate to the modeled
initial state, render every transition once with its event type as the edge label, and connect each
modeled terminal to a final pseudostate while retaining its terminal kind in the state label.
Preserve branches, cycles, event names, and source order; do not add runtime context, controls,
HTML-only interaction, or inferred transitions. Write the raw `stateDiagram-v2` source directly to
the resolved `.mmd` path without a Markdown fence or prose wrapper. This step is complete when the
Mermaid file is a static projection of exactly the shared machine model's states and transitions.

### 5. Create the optional graph app

If HTML was not explicitly requested, skip this step without creating, modifying, or validating any
`.html` file. If HTML was requested, read the canonical app template completely, copy it to the
resolved destination, and replace only the JavaScript value between `// MACHINE_DATA_START` and
`// MACHINE_DATA_END` with the complete JSON-compatible machine model. Preserve every other template
byte and do not redesign, restyle, restructure, simplify, or extend its HTML, CSS, graph renderer,
event dock, controls, tooltips, accessibility behavior, or runtime logic. Supply source-grounded
node coordinates in the machine data so the canonical renderer produces a clear left-to-right graph;
the template derives bounds and browser metadata from that data. Encode target-derived strings
safely for an embedded script and never add external packages, remote assets, network requests,
executable target code, or target side effects. This step is complete when HTML is unselected and no
HTML file was touched, or when the selected destination is a canonical-template copy with exactly
one replaced machine data block, every accepted event can be emitted from its overlay, and no other
file or surrounding page is required to use it.

### 6. Validate the model and selected outputs

Compare the shared machine model with the target and scenario, correcting omissions, impossible
paths, fabricated values, and hidden truncation before validating the selected projections. Parse or
render the Mermaid file with an available Mermaid CLI or library; otherwise perform static syntax
and set comparisons and disclose that rendering was not run. Confirm one-to-one equality between the
model and Mermaid state IDs, event-labeled transitions, initial state, cycles, and terminal
outcomes. When HTML was requested, use browser automation when available to emit every accepted
event, including every branch outcome and cycle, and verify graph updates, declarative context
changes, reset, rejected-event feedback, keyboard operation, focus, pan, zoom, fit, full-viewport
behavior, and reduced motion; otherwise perform static checks and disclose that live interaction was
not run. At desktop and narrow widths, reject website chrome or persistent panels, compare the HTML
with the canonical template after normalizing only the machine data block, and confirm that the
embedded machine equals the shared model and that no HTML-only runtime behavior appears as a Mermaid
transition. If any Mermaid syntax, render, model-parity, selected route, event, graph update,
template-invariance, or cross-projection check fails, correct the applicable output and repeat
validation. This step is complete when Mermaid passes and any selected HTML output passes, or the
exact unresolved validation failure is reported without claiming completion.

### 7. Publish the simulation

Leave the validated Mermaid diagram and any requested HTML app at their resolved destinations and
report the output contract. If validation is unresolved, report the failure and every selected
output's status instead of presenting the simulation as complete. Otherwise report the Mermaid path,
entry point, terminal outcomes, symbolic events or payloads, Mermaid validation method, and bounded
or omitted detail; identify Mermaid as static. When HTML was requested, also report its path and
validation method. Do not claim that the target ran. The workflow is complete when the Mermaid
source is source-grounded and renderable or its unrendered status is disclosed; when any requested
HTML app is source-grounded, mutually consistent, browser-usable, and non-destructive; and when the
completion report states their evidentiary limits.

## Callstack Simulation

**Workflow State Machine Simulation**(target, scenario, supporting context, controls) │ ├─ **Resolve
The Simulation Contract**(inputs, entry point, authority order, abstraction boundary, Mermaid path,
HTML option and optional path) │ │ │ ├─ if (the target or entry point is missing, unreadable, or
ambiguous): stop and report the blocker │ │ │ ├─ else if (the Mermaid destination or selected HTML
destination exists without revision authority): stop and request authority or another path │ │ │ └─
else: fix one shared contract, default to Mermaid only, and retain target behavior over conflicting
context │ ├─ **Build The Source Grounded Machine**(fixed contract) │ │ │ ├─ **Map Reachable
States**(operations, decisions, waits, terminals, source references, coordinates) │ │ │ └─ **Map
Event Driven Transitions**(event types, payloads, guards, context changes, effects, outcomes) │ │ │
└─ if (a controlling value is missing): expose each source-feasible outcome as an explicit symbolic
event or payload │ ├─ **Define Event Semantics**(machine model, initial state and context) │ │ │ ├─
**Resolve Accepted Events**(active state and context) │ ├─ **Define Deterministic Dispatch**(event
type, payload, guard, context updates, destination) │ └─ if (HTML was requested): define
rejected-event feedback and reserved local reset behavior │ ├─ **Create The Mermaid Diagram**(shared
machine model, Mermaid destination) │ │ │ ├─ **Declare Mermaid States**(stable aliases, labels,
terminal kinds) │ ├─ **Render Event Labeled Transitions**(branches, cycles, initial and final
pseudostates) │ └─ **Write Raw Mermaid Source**(stateDiagram-v2 without a wrapper) │ ├─ **Create The
Optional Graph App**(same machine model, HTML option and optional destination) │ │ │ ├─ if (HTML was
not explicitly requested): skip without touching any `.html` file │ └─ else: copy the canonical
template, replace only machine data, and preserve template invariants │ ├─ **Validate The Model And
Selected Outputs**(Mermaid source, optional HTML app, target, scenario) │ │ │ ├─ **Validate The
Mermaid Projection**(syntax, renderability, states, transitions, initial state, terminals, model
parity) │ ├─ if (HTML was requested): **Validate The Canonical App**(events, routes, graph updates,
controls, accessibility, template invariance, model and Mermaid parity) │ └─ if (Mermaid or a
selected HTML projection fails or differs from the shared model): correct the applicable output and
repeat validation │ └─ **Publish The Simulation**(validated Mermaid diagram and optional HTML app) │
├─ if (validation remains unresolved): report the failure and each selected output status without
claiming completion └─ else: report the Mermaid path and validation, plus the HTML path and
validation only when requested
