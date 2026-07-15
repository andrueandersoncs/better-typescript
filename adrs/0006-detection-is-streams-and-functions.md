# ADR-0006: Detection is streams and functions

## Status

Accepted

## Date

2026-07-06

## Context

The previous design unified rules and advice by making everything a `Detector` with an id, role,
level, recognizer, examples, and a structured `Finding` output. That solved earlier duplication, but
it also made the implementation orbit metadata instead of the actual computation.

The useful model became clearer during the refactor:

- detection is a function that produces an Effect `Stream`;
- the stream is the signal;
- rules consume the loaded program;
- advice consumes the rule and advice streams it needs;
- the CLI's user-facing output is the text emitted by the leaf streams.

The older vocabulary had started to obscure that model. The matcher language, stratified detector
registry, generated guide, JSON report, roles, detector ids, presentation objects, and result-based
exit gate were all machinery around composition that ordinary Effect code can express directly.

The target product for this change is still batch analysis. The CLI collects snapshot streams once
and prints text. A future continuously running product can reuse the same seam by replacing snapshot
source streams with watch streams.

## Decision

Represent detection as ordinary functions producing Effect streams. Every detector is a function
returning a `Stream`, and the stream is its signal.

Rules are `RuleCheck` functions: a plain stream transformer from the upstream AST-node stream to a
stream of `Detection` values carrying only domain data — `location`, `message`, `hint`, and optional
internal data for advice. The program context is not a separate argument: every source element
carries it as a product (`AstNodeElement` is `context`, `sourceFile`, `node`), because the context
is time-varying in the continuous product and anything time-varying must travel in the stream. Rule
authoring stays subscription-based (`nodeCheck`/`fileCheck` handlers over syntax kinds); a single
lift turns a subscription plan into the stream transformer, deriving the context from the elements
and building once-per-context indexes on first use.

Advice modules are stream consumers and producers. Each advice derivation receives the upstream rule
or advice streams it needs, folds their collected signals, and emits its own stream of advice
elements. There is no scheduler or registry layer: the report wiring names the leaf streams by the
prose it prints and connects functions directly. The report itself is the concatenation of the leaf
streams — the advice leaf first, then one rule leaf per reported rule in wiring order.

The CLI prints the collected leaf text blocks. It keeps only these user-facing options:

- `--project <directory>`
- `--limit <integer>`
- `--offset <integer>`

The CLI no longer has:

- generated style-guide output;
- JSON report output;
- detail or signal visibility toggles;
- detector ids or roles in the report;
- exit code 1 for successful reports containing signals.

Exit code 0 means the report was produced. Exit code 2 means the tool could not run.

The benchmark remains informational. It measures the current report path but is not an architectural
gate.

## Alternatives Considered

### Keep the stratified detector registry

- Pros: preserved the ADR-0003 abstraction and derived ordering machinery.
- Cons: retained ids, roles, generated descriptions, mention graphs, and structured reports after
  direct stream wiring made them redundant.
- Rejected: the registry had become accidental complexity.

### Keep the generated style guide

- Pros: preserved instruction/enforcement coupling from earlier ADRs.
- Cons: required examples, descriptions, and a formatter surface that are no longer part of the CLI
  product. It also made agents depend on a generated document rather than the rule modules and
  self-hosting output.
- Rejected for the product. The remaining executable check is per-rule fixture coverage in tests,
  not a CLI subcommand.

### Keep machine-readable JSON output

- Pros: useful for downstream tooling.
- Cons: would preserve the old wire format and its metadata commitments. The current product is text
  for coding agents.
- Rejected for this refactor. A JSON stream can be added later as a new leaf stream if a concrete
  consumer needs it.

### Keep result-based exit gating

- Pros: matches conventional lint tools.
- Cons: this tool's primary value is advice text for agents. A successful report with signals is
  still a successful tool run.
- Rejected. Tool execution errors remain exit 2.

### Reintroduce a fused dispatcher for performance

- Pros: may reduce traversal overhead.
- Cons: performance is not the design constraint for this batch product, and the loaded program
  already supplies source text and AST streams without re-parsing.
- Rejected until measurements show the direct stream design is unusable.

## Consequences

- ADR-0003 and ADR-0005 are superseded where they depend on detector ids, roles, a generated guide,
  JSON reports, matcher scheduling, or registry validation.
- ADR-0001 and ADR-0002 remain historical context, but their matcher-language machinery is no longer
  the implementation path.
- The README no longer promises JSON output, a rules subcommand, collapsed details, or exit 1 on
  signals.
- The agent instructions now point maintainers to `src/rules/` and `npm run dev` output instead of
  `npm run dev -- rules`.
- Per-rule fixture tests, advice threshold tests, and self-hosting are the enforcement surface that
  prevents rule prose and behavior from drifting.
- The daemon direction is intentionally undecided. A watch-mode product should replace the source
  streams, keep the function/stream contracts, and choose its own transport for leaf text.
