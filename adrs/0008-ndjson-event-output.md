# ADR-0008: NDJSON event output by default

## Status

Accepted

## Date

2026-07-08

## Context

ADR-0006 rejected machine-readable JSON output "for this refactor", noting that "a JSON stream can
be added later as a new leaf stream if a concrete consumer needs it." ADR-0007 shipped the
continuous product with stdout as a stream of rendered text blocks and cleared lines.

The concrete consumer has materialized: the tool's end users are coding agents that parse stdout
programmatically. A stream of multi-line text blocks separated by blank lines is ambiguous to parse
— block boundaries, cleared lines, and the empty-report line are all prose conventions. The user
decision is that machine-parseable output is the default and the text rendering becomes an opt-in
flag.

## Decision

Stdout defaults to NDJSON: one JSON event per line, `JSON.stringify` of the tagged event classes the
watch pipeline now emits. `blockDeltas` — and with it `watchReportFromWiring`/`watchReport` —
produces `ReportEvent` values instead of pre-rendered strings; rendering is a leaf projection chosen
by the CLI.

The event vocabulary, discriminated by `_tag`:

- `signal` `{ key, text }` — a report block appeared or its content changed; `text` is the full
  rendered block.
- `cleared` `{ key, text }` — a previously emitted block disappeared; `text` is its one cleared
  line.
- `empty` `{ rootPath }` — the initial report found no signals.

`key` is the block's stable identity across batches. Rule keys are structured as
`{ _tag: "rule", name, message, hint }`; advice keys are structured as
`{ _tag: "advice", level, path, title }`. Consumers correlate a `cleared` event with the `signal`
events it retires by deep-equal key. The events are plain-data `Schema.TaggedClass` values, so the
wire format is exactly their fields plus `_tag`.

`--pretty` renders the same events through `renderEventText`, reproducing the prior human-readable
output verbatim: block texts and cleared lines each followed by a blank line, and
`No signals in <root>.` for the empty report. Stderr is unchanged either way — status lines only,
stdout stays a pure event stream.

The repo's own dev loop (`npm run dev`) passes `--pretty`, keeping the AGENTS.md self-hosting
contract — a bounded run whose initial report reads `No signals` — literally true while the product
default stays NDJSON.

## Alternatives Considered

### Keep text as the default and add a `--json` flag

- Pros: no change for a human watching a terminal.
- Cons: the primary consumer is an agent parsing stdout; the default should be the parseable form,
  and humans opting into `--pretty` is the cheaper direction.
- Rejected by product decision.

### Decompose events into semantic fields (rule, message, hint, locations)

- Pros: consumers could filter without parsing the rendered text.
- Cons: requires report blocks to carry structured payloads through the advice/rule builders,
  widening the wire commitment well beyond what the current output shows. The rendered `text` is the
  leaf-text contract ADR-0006 established; the block `key` already carries the stable identity.
- Deferred. Additive later if a concrete consumer needs fields — the event vocabulary leaves room
  for new members and new fields.

### Serialize through `Schema.encode` instead of `JSON.stringify`

- Pros: principled encoding path.
- Cons: every event field is a plain string; `JSON.stringify` of the tagged classes already emits
  exactly the declared fields, verified by test.
- Rejected as needless machinery.

## Consequences

- ADR-0006's rejection of machine-readable output is superseded; its anticipation clause is
  fulfilled. ADR-0007 otherwise stands — only the stdout rendering changed, not the pipeline or its
  gates.
- The wire format (`_tag`, `key`, `text`, `rootPath`) is pinned by a test that round-trips the
  events through `JSON.stringify`/`JSON.parse`.
- The README documents the event schema and the `--pretty` flag; the non-goals list no longer claims
  the tool has no machine-readable output.
- `npm run dev` is the pretty self-hosting loop; `npm start` and the installed binary default to
  NDJSON.
