# Interactive Artifact Specification

When explicitly requested, the optional HTML output is one source-grounded, event-driven
state-machine app, not a generic flowchart, website, dashboard, report, or claim that the target
ran. The graph is the interface and the status display; users drive the machine by emitting modeled
events from a minimal overlay on that graph. When HTML is not requested, do not create, modify, or
validate an `.html` artifact.

## Canonical template

[`../assets/app-template.html`](../assets/app-template.html) is the authoritative implementation and
visual reference for selected HTML output. Every generated HTML artifact must be a copy of that file
with only the embedded `machine` value between `// MACHINE_DATA_START` and `// MACHINE_DATA_END`
replaced. The template's remaining HTML, CSS, DOM order, graph renderer, event dock, controls,
tooltips, accessibility behavior, and runtime logic must remain byte-for-byte unchanged. Do not
reproduce the design from prose, create an approximation, or improve the template while generating
an artifact.

## Delivery

These requirements apply only when the user explicitly requests HTML.

- Copy the canonical template to the resolved destination and replace exactly one machine data
  block. Do not generate the document shell, stylesheet, or runtime from scratch.
- Use only browser-native HTML, CSS, SVG, and JavaScript. Do not require a package install, build
  step, server, external font, remote asset, network request, or additional file.
- Do not execute or import target code. Do not use `eval`, `Function`, script injection, inline
  event-handler attributes, or HTML-string insertion for target-derived content.
- Treat labels, event names, payloads, evidence, source references, context values, guards, and
  effects as untrusted data. Render them with `textContent` or equivalent safe DOM APIs. Encode any
  literal `</script` sequence before embedding data in a script element.
- The artifact must work when opened directly from a local `file://` URL in a current Chromium,
  Firefox, or Safari browser.

## Machine model

Embed one declarative `machine` value containing, at minimum:

- Metadata: title, target identifier, entry point, scope boundary, and nonvisual disclosures for
  assumptions, source conflicts, symbolic behavior, truncation, and omitted detail.
- `initialStateId` and a JSON-compatible `initialContext`.
- A `states` array whose entries have a unique stable `id`, human label, kind, concise description,
  relevant inline context key, finite numeric `x` and `y` graph coordinates, and zero or more source
  references. Allowed kinds are `start`, `operation`, `decision`, `waiting`, `success`, `error`,
  `blocked`, and `truncated`. Coordinates place the primary flow left to right, separate branches
  vertically, avoid node overlap, and let the canonical renderer derive graph bounds.
- An `events` array whose entries have a unique event `type`, readable label, concise description,
  and an optional finite payload schema. Event types use stable source-derived names such as
  `SOURCE_VALID` rather than generic names such as `NEXT` or `CONTINUE`.
- A `transitions` array whose entries have a unique stable `id`, valid `from` and `to` state IDs, an
  event type defined by `events`, optional allowlisted guard and payload match, zero or more
  declarative context updates, zero or more intended side-effect descriptions, and zero or more
  source references.

Use source terminology in states and events. One source operation may become a compound state when
its internals are outside the selected detail, but its tooltip must disclose that boundary. Model
loops as transition cycles. Model recursive behavior with a stated finite visualization bound and a
`truncated` continuation rather than generating an unbounded graph. Give every terminal state its
actual source outcome class; do not merge success, error, blocked, and truncated outcomes merely to
simplify layout.

Keep dispatch logic declarative. Context updates may use only a small explicit interpreter
implemented by the artifact, such as literal `set`, numeric `increment` or `decrement`, and array
`append` or `remove-last`. Guards may use only allowlisted comparisons against context or event
payload. If a condition cannot be represented faithfully, expose separate source-feasible event
types or a finite symbolic payload choice. Never turn target text into executable JavaScript.

For a given active state, event type, and payload, at most one transition may match. Every
nonterminal state must accept at least one modeled event. Terminal states accept no target event;
the reserved local reset event remains available.

## Graph-only interface

The visible app consists of a full-viewport graph canvas plus minimal floating graph controls. It
must not contain a masthead, hero, explanatory introduction, sidebar, inspector, context panel,
history or timeline, legend, disclosure section, card grid, footer, article content, or any other
website-like region around the graph.

The graph canvas must provide:

- Every modeled state as a clearly labeled node and every modeled transition as a directed edge
  labeled with its event type or readable event label.
- An unmistakable active node, a distinct just-traversed edge, and a subtler indication of edges
  enabled by events accepted in the active state.
- Relevant context values rendered inside or immediately beside the active node only when they
  materially explain its current behavior. Do not create a separate context view.
- State kind and terminal outcome encoded by shape or text in addition to color. Cycles and terminal
  classes remain legible.
- Concise, on-demand tooltips for node or edge description, guard, payload, intended side effects,
  source references, symbolic status, or bounded detail. Tooltips appear only on hover or keyboard
  focus and never become a persistent inspector.
- Pan, zoom in, zoom out, and fit-to-view controls in one compact corner cluster.

A compact event-emitter dock floats over the graph without reducing the canvas into a content
column. It must:

- List only the event types accepted by the active state, with each native button labeled
  `Emit <EVENT_TYPE>` and a readable event label available in the same control.
- Render a select, radio group, or similarly compact native control when an event requires a finite
  payload choice. Do not ask users to write JSON or code.
- Dispatch the same internal event path for pointer and keyboard activation.
- Include a compact **Reset** control that dispatches the reserved local reset event.
- Replace its available events immediately after every accepted dispatch. At a terminal state, show
  the terminal outcome and Reset rather than an empty or disabled event list.

A tiny in-canvas status cue may show the last emitted or rejected event. It must not become a
header, log, history, or notification stack. The graph itself remains the dominant content at every
viewport size.

## Event semantics

- On load, the initial state is active and its accepted events are ready to emit; there is no
  separate Start step.
- Emitting an accepted event evaluates its allowlisted guard and payload match, applies its
  declarative context updates, visually traverses the matched edge, and activates the destination
  state.
- The visual update synchronizes the active node, just-traversed edge, enabled outgoing edges,
  inline context values, status cue, and event-emitter dock from the same runtime snapshot.
- Emitting an event that the active state does not accept leaves state and context unchanged and
  briefly marks the rejection within the graph canvas.
- Reset restores the pristine initial state and context, clears the just-traversed edge and status
  cue, and refreshes accepted events. Reset does not approximate reverse transitions.
- Do not provide generic Start, Next, Back, play, scrubber, or timeline controls. State-machine
  movement occurs only through named target events and Reset.
- Intended side effects are graph labels or tooltip descriptions only. Never send a request, write
  storage, execute target code, navigate away, or invoke a device API to simulate one.
- The in-app emitter is required. The artifact may additionally expose
  `window.stateMachine.emit(type, payload)` for testing, but external console use must never be
  necessary to operate the app.

## Visual and accessibility requirements

- Set the app root and graph canvas to the full viewport with no document-like vertical page flow.
  The event dock and graph controls overlay the canvas and use only the space they need.
- Lay out the full graph deterministically. Prevent node and primary event-label overlap, route
  edges visibly, and provide a useful fit-to-view transform. Dense graphs may pan and zoom.
- At narrow widths, keep the graph full-screen and let the event dock wrap or scroll within a
  compact overlay; do not stack panels below the graph or introduce horizontal page overflow. Touch
  targets are at least 44 by 44 CSS pixels.
- Use a restrained, high-contrast app interface with readable labels. Do not rely on animation or
  decoration to communicate a state transition.
- All event and graph controls work from the keyboard, have visible focus indicators, and have
  accessible names. Graph nodes and edges with tooltips are focusable and expose the same
  information to assistive technology.
- Announce accepted and rejected events and the new active state through one polite `aria-live`
  region without moving focus unexpectedly.
- Do not use color as the sole state, transition, or terminal signal. Maintain at least WCAG AA text
  contrast and visible focus contrast.
- Honor `prefers-reduced-motion: reduce`; transition animation is optional and must never be
  required to identify the traversed edge or active state.

## Validation checklist

Before publication, verify all of the following:

- After replacing both machine data blocks with one identical sentinel, the destination and
  canonical template are byte-for-byte equal. Any other difference fails template invariance.
- Every state has finite coordinates, nodes do not overlap, primary flow proceeds left to right, and
  branch or cycle edges remain distinguishable in the canonical renderer.
- Every state ID, event type, and transition ID is unique; `initialStateId`, `from`, `to`, and event
  references resolve; every nonterminal state accepts at least one source-supported event; terminal
  states accept none.
- For every state, event, and finite payload combination, zero or one transition matches; ambiguous
  dispatch is impossible.
- Every target-reachable branch and terminal outcome is represented, and every rendered route is
  traceable to the target, scenario, or an explicit symbolic event.
- Every accepted event can be emitted from the in-app dock. Each dispatch activates the correct
  node, marks the traversed edge, applies the expected inline context update, and refreshes the
  accepted event buttons.
- Rejected events leave state and context unchanged. Reset restores the exact initial state and
  context. Cycles can be traversed repeatedly without corrupting dispatch behavior.
- Pan, zoom, fit, event payload controls, graph tooltips, terminal reset, and keyboard-only
  operation work. Focus remains visible and live announcements are accurate.
- Desktop and narrow-screen screenshots show a full-viewport graph with only the compact event dock
  and graph-control cluster over it. Any website header, sidebar, persistent panel, history, legend,
  disclosure region, or page-like content fails validation.
- Bounds, blocked paths, symbolic outcomes, conflicts, source references, and intended side effects
  remain discoverable from graph labels, accessible names, or on-demand tooltips rather than
  persistent panels.
- The browser console has no uncaught errors during tested routes, and the artifact makes no network
  request or target side effect.
- The completion report names any event route not exercised in a live browser; static inspection
  alone must not be described as interactive validation.
