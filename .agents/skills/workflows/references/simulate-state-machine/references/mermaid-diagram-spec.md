# Mermaid Diagram Specification

The required default Mermaid output is a static projection generated directly from the shared declarative machine model. It documents topology and event names; it does not emit events, evaluate guards, mutate context, animate runtime state, or execute target side effects. When optional HTML is selected, both projections use the same model, but Mermaid must never be scraped or reverse-engineered from the app.

## Delivery

- Write one UTF-8 `.mmd` file beginning with `stateDiagram-v2`.
- Output raw Mermaid source only. Do not add a Markdown code fence, heading, explanation, initialization directive, theme configuration, or completion text.
- Generate from the in-memory machine model, never by scraping or reverse-engineering the HTML output.
- Preserve model order for state declarations and transitions so diffs remain stable.

## State mapping

Declare every modeled state exactly once as:

```text
state "<display label>" as <alias>
```

Create `<alias>` by prefixing `s_` to the state ID, replacing every character outside `A–Z`, `a–z`, `0–9`, and `_` with `_`, collapsing repeated underscores, and appending `_2`, `_3`, and so on only when sanitization would collide. Use that alias consistently; never use a human label as an identifier.

Use the source-grounded state label as `<display label>`. Append ` [success]`, ` [error]`, ` [blocked]`, or ` [truncated]` to the label for the corresponding terminal kind. Do not append kinds to nonterminal labels. Escape quotes, line breaks, and Mermaid-sensitive characters without changing the displayed wording.

After all declarations, connect the Mermaid initial pseudostate to the modeled initial state:

```text
[*] --> <initial alias>
```

Connect each modeled terminal alias to `[*]` with one unlabeled arrow. These initial and final pseudostate arrows are Mermaid notation, not additional machine events or target transitions.

## Transition mapping

Render every modeled transition exactly once and in model order:

```text
<from alias> --> <to alias> : <EVENT_TYPE>
```

Use the exact event type from the shared machine model. When a finite event payload is required to distinguish outcomes, append its compact literal match as `<EVENT_TYPE>(<key>=<value>)`. Do not substitute the readable event label for the stable event type.

Preserve parallel branches, self-transitions, back edges, and cycles. Do not infer automatic transitions, merge repeated events, omit blocked paths, or render reset, rejected-event feedback, pan, zoom, fit, tooltips, inline context, declarative actions, intended side effects, or `window.stateMachine` APIs as transitions.

## Reference shape

```text
stateDiagram-v2
    state "Inputs received" as s_start
    state "Establish source and destination" as s_establish
    state "Input blocker [blocked]" as s_invalid_source

    [*] --> s_start
    s_start --> s_establish : BEGIN_ANALYSIS
    s_establish --> s_invalid_source : REJECT_SOURCE
    s_invalid_source --> [*]
```

The blank line between declarations and transitions is required. Indent declarations and arrows with four spaces.

## Bundled reference

[`simulate-state-machine.mmd`](simulate-state-machine.mmd) is the generated default static projection of the `simulate-state-machine` workflow itself. Use it as the canonical formatting and topology example; this specification remains authoritative when another target requires different states, events, branches, cycles, or terminals.

## Validation

- Parse or render the file with an available Mermaid CLI or library. If none is available, disclose that only static validation ran.
- Compare state aliases back to model state IDs and require exact set equality.
- Compare every non-pseudostate Mermaid arrow as `(from state ID, event type and payload match, to state ID)` and require exact ordered equality with model transitions.
- Require exactly one initial pseudostate arrow to `initialStateId` and exactly one final pseudostate arrow from each modeled terminal.
- Reject undeclared aliases, duplicate declarations, duplicate transition lines, fabricated transitions, missing cycles, malformed labels, Markdown fences, prose wrappers, and HTML-only runtime behavior.
- When optional HTML exists, also require its embedded machine data to equal the same shared model without changing the Mermaid projection.
