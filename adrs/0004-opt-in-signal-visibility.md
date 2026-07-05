# ADR-0004: Signal visibility is opt-in at every surface

## Status

Accepted

## Date

2026-07-04

## Context

ADR-0001 fixed signal semantics — signals feed summaries, never gate, never
render as imperatives — and settled the text surfaces: the guide teaches
findings only, default text output renders findings and diagnoses. It left the
machine surface ambiguous. "JSON always carries every layer" was written to
mean "JSON never collapses findings under diagnoses," but it reads as a
promise that signal matches appear on the wire. In the implementation the
shared finding filter in `analyzeProject` excluded signal matches from the
JSON page as a side effect of excluding them from text, and no surface could
reveal them at all: the only trace of a signal was an aggregate count inside a
diagnosis's evidence.

Both the accident and the ambiguity matter because the end user is a coding
agent (ADR-0003). An agent reading the default JSON report treats every listed
match as work. Signal matches are, by construction, mostly not directly
actionable — `prefer-curried-data-last-functions` fires on every reducer and
Proxy handler that is correct as written; that is why it is a signal. Putting
those matches in the default report reintroduces, on the machine surface, the
exact noise ADR-0001 deleted the rule to remove from the human one.

At the same time, "invisible everywhere" is too strong. Diagnosing why a
syndrome fired — or tuning a threshold — requires seeing the underlying
measurements with positions, not just the count in the evidence trace.

## Decision

**Signal-role findings appear in machine output only under an explicit
`--signals` flag.** The invariant is stated in role terms so it survives wire
format changes (ADR-0003 phase 1 moves JSON to one findings array with
level/role; the flag's meaning is unchanged there: signal-role entries are
present only when requested).

Concretely, on today's report shape:

1. The JSON report gains a constant `signals` key — an array of the same
   per-rule report shape as `groups`, `[]` unless `--signals` is passed. A
   stable key keeps the schema uniform for parsers; a separate section keeps
   `groups` actionable-only, so a consumer never filters roles out of a mixed
   list.
2. `--signals` changes nothing else. Pagination and `totalCount` count finding
   matches only; signal matches ride whole in their section (they are grouped
   per rule, so the payload is compact). The exit code remains a function of
   finding matches alone. Text output never renders signals — the flag is
   inert there, documented as JSON-scoped — because a rendered signal group
   would carry the rule's imperative hint, which is the
   confident-wrong-prescription failure ADR-0001 §2 guards against.
3. Diagnosis evidence is unaffected: aggregate signal measurements remain in
   `advice[].evidence` whatever the flag, because evidence is why a diagnosis
   fired, not a match listing.

## Alternatives Considered

### Always include signal matches, tagged with a role field

- Pros: no flag; one uniform list anticipates ADR-0003's wire format.
- Cons: default noise to the primary consumer; every agent must implement
  role filtering correctly or mistake measurements for work.
- Rejected: the default surface must be safe to consume naively.

### Mix signals into `groups` under the flag, tagged with a role field

- Pros: one section.
- Cons: entangles pagination (`totalCount` would count non-actionable
  matches or need a carve-out), and flag-conditional semantics for one
  section are worse than a second constant section.
- Rejected: separate section is self-describing and leaves finding semantics
  untouched.

### Paginate the signals section independently

- Rejected: two paging axes for a diagnostic view is over-engineering;
  per-rule grouping already bounds the payload.

## Consequences

- `formatMatchesPageJson` takes the signal matches as an argument before the
  page; `MatchesReport` carries `signals`. Text formatting is untouched.
- ADR-0001 §3's "JSON always carries every layer" is refined, not reversed:
  the layers JSON always carries are findings and diagnoses; signal-match
  visibility is governed by this flag.
- Governance already guarantees every signal is consumed by a syndrome
  (orphan-signal parity test), so `--signals` output is never the only home
  of a measurement — it is a window into inputs the interpreter already used.
