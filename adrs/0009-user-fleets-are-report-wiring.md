# ADR-0009: User fleets are report wiring

## Status

Accepted for explicit reviewed TypeScript configuration and no registry; config cardinality is
superseded by ADR-0015 and Stream-based ReportWiring is superseded by
[ADR-0023](0023-one-shot-effects-and-rerun-watch.md).

## Date

2026-07-09

## Context

ADR-0005 accepted the product intent: the durable value is the kernel, and a project's fleet should
be explicit, reviewed user code rather than a hidden built-in list. Its implementation plan still
assumed the older detector-registry world: detector ids, matcher scheduling, registry validation,
and guide output. ADR-0006 deliberately removed that world. Detection is now ordinary functions and
Effect streams; rules consume AST-node streams; advice consumes the rule/advice streams it needs;
report wiring connects leaf streams directly. ADR-0007 then made the product continuous-only, and
ADR-0008 made NDJSON events the default stdout contract.

The user-fleet boundary therefore cannot be the ADR-0005 registry. The actual public seam is
`ReportWiring`: named reported rules, named helper rules, and one advice function that receives the
materialized rule/helper signals for a batch. This ADR records how user fleets enter the product
without reopening the registry, matcher, scheduler, ids, severity, suppression, or dynamic-plugin
models that ADR-0005 through ADR-0008 rejected.

## Decision

Expose one package with two public subpaths:

- `better-typescript` is the kernel entry point. It exports rule authoring and runtime primitives
  such as `RuleCheck`, `nodeCheck`, `fileCheck`, `withProgramIndex`, `Detection`, `AdviceElement`,
  `ReportWiring`, `namedRuleCheck`, `makeWiring`, `ruleSignal`, `withFallbackAdvice`,
  `reportFromWiring`, and `watchReportFromWiring`.
- `better-typescript/preset` is the reference preset entry point. It exports the physically
  extracted built-in fleet (`reportedRules`, `helperRules`, `defaultAdvice`, `defaultWiring`),
  namespaces for the individual built-in rules/advice, and preset-bound `report`/`watchReport`
  helpers.

This is a single-package boundary, not a split into plugin packages. The preset is physically
extracted so the kernel no longer has to be the built-in fleet, but it is versioned and published
with the same package as the kernel.

A project's fleet is one root `better-typescript.config.ts` in the CLI project directory. The CLI
resolves that exact file at startup and loads it with `jiti`. If the file is absent, the CLI uses
`defaultWiring`. If the file is present, it must export a wiring shape as either `wiring` or
`default`; the exported value may be the wiring object or a zero-argument factory that returns it.
The loaded value is validated as:

- `rules`: an array of `{ name: string, check: function }` reported rules;
- `helpers`: an array of `{ name: string, check: function }` helper rules that feed advice but do
  not print rule leaf blocks themselves;
- `advice`: a function from `(rules, helpers)` signal arrays to an advice stream.

The config is reviewed TypeScript code. It imports the preset and local rule modules explicitly,
composes arrays explicitly, and is loaded once. There is no config discovery beyond that root file,
no package-name plugin loading, no `extends` chain, no runtime registry, and no hot reloading of the
wiring graph. Changing the fleet is a source change reviewed like any other build-script change and
takes effect on restart.

`makeWiring` is the structural constructor for this boundary. It rejects duplicate names inside
`rules` and duplicate names inside `helpers`; the categories are checked independently because
reported rules and helper rules have different report visibility. Names are not detector ids in a
registry. They are the prose-facing labels used by rule report blocks and by advice lookups through
`ruleSignal`.

Rules remain AST-only. A `RuleCheck` receives the loaded AST-node stream and produces `Detection`
values; it does not receive other rule signals, advice signals, scheduler state, or a registry. If a
user wants to interpret one signal through another, that belongs in advice, not in a rule.

Advice is the composition layer. The `ReportWiring.advice` function receives the materialized
`RuleSignals` arrays for reported rules and helper rules in the current batch. It can select named
rule streams with `ruleSignal`, call ordinary advice functions, collect and replay advice streams
when one advice layer must feed another, and flatten the final output stream directly. These
dependencies are visible TypeScript calls, not metadata edges for a scheduler to discover.

`withFallbackAdvice` owns safe fallback composition. It collects the specific advice once, emits
that specific advice first, and then emits fallback advice only for files where no file-level
specific advice fired. Fallback suppression is therefore one shared kernel policy instead of a
convention every advice author must reimplement.

Detection deduplication is semantic at the report-wiring boundary. For each named rule in a batch,
the runner collects that rule's detections across the workspace project snapshots and preserves the
first occurrence of each unique semantic detection. The key is the detection's path, line, column,
message, hint, and `Detection.data` equality. This removes repeated workspace signals caused by
overlapping project coverage without hiding genuinely different messages, hints, locations, or data.

The immutable constraints from ADR-0006 through ADR-0008 remain the product contract:

- ADR-0006: detection is functions and streams; rules consume AST-node streams; advice consumes
  signals; no registry, matcher language, scheduler, detector ids, roles, severities, suppressions,
  or result-based signal exit gate returns.
- ADR-0007: the CLI is continuous-only; wiring is loaded before the watch stream starts; source and
  report changes flow through the existing watch pipeline.
- ADR-0008: stdout defaults to NDJSON events; `--pretty` is only a rendering projection over the
  same report events.

## Alternatives Considered

### Split kernel and preset into separate packages

- Pros: makes the conceptual boundary visible in package names.
- Cons: creates version-skew and peer-dependency support surface before there is a real independent
  release cadence. The preset is still the reference fleet shipped with the product.
- Rejected. Subpath exports give users the boundary without inventing a second package lifecycle.

### Dynamic plugin discovery or `extends` chains

- Pros: familiar to users of lint tools and central shareable configs.
- Cons: reintroduces the failure mode ADR-0005 named: fleets assembled from runtime strings, package
  resolution, and transitive configuration nobody has reviewed in the target repo.
- Rejected. The fleet is explicit code imported and composed in `better-typescript.config.ts`.

### Revive a detector registry with ids, matcher edges, and a scheduler

- Pros: would give the platform a metadata graph to validate and order.
- Cons: ADR-0006 removed that graph because direct functions and streams are the simpler true model.
  Reintroducing ids and scheduler metadata would make users author for machinery the runtime no
  longer needs.
- Rejected. Report wiring is arrays plus direct advice composition.

### Let rules consume other rules

- Pros: powerful TypeScript rule authors could write higher-order detectors.
- Cons: it creates hidden rule-to-rule dependencies, makes ordering meaningful, and brings back the
  scheduler/registry ontology through the side door.
- Rejected. Rules are AST-only; signal interpretation happens in advice.

### Hot-reload or auto-discover config files

- Pros: changes to fleet code could take effect without restarting the process.
- Cons: the current watch pipeline tracks TypeScript project/source changes, not executable wiring
  changes. Reloading arbitrary config code mid-stream would add lifecycle and invalidation semantics
  unrelated to detection.
- Rejected. One root config is loaded once at startup; restart to change the fleet.

### Make fallback advice an authoring convention

- Pros: no kernel helper needed.
- Cons: every advice author would have to remember the same suppression rule and ordering guarantee,
  making duplicated or missing fallback text likely.
- Rejected. `withFallbackAdvice` is the shared composition primitive.

## Consequences

- ADR-0005's intent is fulfilled through `ReportWiring`, not through its obsolete registry
  implementation plan. User fleets are first-class reviewed code, while ADR-0006's direct stream
  model remains intact.
- The public product boundary is small: kernel primitives, the reference preset, a root TypeScript
  config, `makeWiring` validation, and the continuous NDJSON report stream.
- Default behavior is unchanged for projects with no config: the CLI watches the project with
  `defaultWiring` from `better-typescript/preset`.
- A bad config is a startup error. Invalid export shape, failing config import, factory failure, and
  duplicate names are reported as `ProjectWiringError` and the CLI exits with the existing
  tool-error path.
- Replacing or extending the preset is an explicit diff. Users import `reportedRules`,
  `helperRules`, or individual preset exports, spread or omit them deliberately, and add local
  `namedRuleCheck` values; there is no shadowing registry to make replacement implicit.
- Advice layering is powerful but visible. The cost is that advice authors must materialize/replay
  streams deliberately when one layer consumes another; the benefit is no hidden scheduler or rule
  dependency model.
- Semantic deduplication makes solution-style or overlapping workspaces usable without changing rule
  semantics: duplicate emissions of the same detection in one rule become one signal, but distinct
  evidence remains visible.
