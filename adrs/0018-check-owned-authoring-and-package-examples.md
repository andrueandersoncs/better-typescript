# ADR-0018: Check-owned authoring and package examples

## Status

Accepted

## Date

2026-07-16

## Context

The default fleet grew to 64 Checks, but each built-in Check repeated the same facts in several
places. Its module exported a raw `Check` and a separate examples value; `defaultWiring` repeated
the name, reporting policy, Check, and examples when constructing a `NamedCheck`; and a separate
test repeated the expected line, column, message, and hint for every characterization case.

Moving refactor examples below `packages/checks/examples` fixed package ownership, but the first
loader design kept a module-global `Ref` cache and exposed examples through a synchronous thunk.
That thunk called `Effect.runSync` solely to unwrap filesystem loading, hiding I/O behind a plain
property-like interface and making wiring construction appear pure when it was not.

This ceremony made a Check's identity easy to split from its behavior, made adding a built-in
require coordinated registry edits, and kept prose and location mirrors synchronized by hand.

## Decision

### Built-in modules own complete NamedChecks

Every individual built-in module exports an `Effect` that constructs one `NamedCheck`. The
`@better-typescript/checks` package provides effectful `defineCheck`, `defineFileCheck`, and
`definePlannedCheck` constructors for reported built-ins, plus `defineSilentPlannedCheck` for the
one planned Check that contributes evidence without a local report. These constructors bind the
stable name, executable Check, reporting policy, and examples at the module that owns the detection
behavior.

The preset's `defaultChecks` is a direct ordered Effect collection of those exports. It does not
register names, reporting policy, or examples again. The migration is a clean cutover: individual
built-in modules no longer export a raw Check plus a separate examples value, and no compatibility
aliases or paired legacy exports remain.

### Refactor examples load at the effectful wiring seam

Built-in refactor examples live at `packages/checks/examples/<name>/<pair>/{bad,good}/`. Each side
is a source tree, so a remediation may add, remove, or reorganize several files. These trees are
package assets, independent of the repository's characterization fixtures.

An authoring constructor loads its package-owned examples while constructing the `NamedCheck`.
Preset and project wiring compose those Effects and execute them once when configuration loads.
`NamedCheck`, `Signal`, and `Advice` then retain the same concrete immutable arrays for every report
and watch pass. No global `Ref`, synchronous unwrap, or reload thunk remains.

### Characterization tests describe detections in the source corpus

The characterization corpus remains under `tests/fixtures/<name>/`. Tests run each built-in through
its exported `NamedCheck` interface. A `// ~detect <columns>` marker on a fixture line states the
expected detection columns; every unmarked line is expected to remain clean. This keeps the expected
locations beside the syntax that establishes them and removes per-test mirrors of lines, columns,
messages, and hints. The shared assertion also requires every emitted detection to have non-empty
prose.

Exact assertions remain appropriate for comment- and whitespace-sensitive Checks when adding a
marker would change the Check's own input, and for custom characterization contracts that cannot be
expressed by location markers alone. They are exceptions rather than a second default convention.

### Core keeps low-level custom-fleet primitives

This decision changes built-in package authoring, not the programmable kernel. Core continues to
expose `nodeCheck`, `fileCheck`, `checkFromSubscriptions`, and `namedCheck` for external and custom
fleets; `silentCheck` remains the corresponding evidence-only reporting choice. `namedCheck` and
`silentCheck` accept already-loaded example arrays, while package-specific effectful constructors
own filesystem loading.

This ADR supersedes only the fixture location and loader consequence in
[ADR-0012](0012-monorepo-core-checks-cli.md) that placed preset examples under `tests/fixtures` and
loaded them through the checks package's legacy fixture loader. ADR-0012's package split and
dependency direction remain accepted. It also supersedes only
[ADR-0013](0013-fused-dispatch-and-bounded-workspaces.md)'s consequence that built-in authors
assemble Checks with the low-level constructors and register them separately. ADR-0013's declarative
plans, fused dispatch, memoization, traversal, and bounded-workspace decisions remain accepted.

## Alternatives Considered

### Keep manual registration

- Pros: no authoring API or export migration.
- Cons: identity, policy, behavior, and examples can drift; each addition still edits several files.
- Rejected: a Check's stable public facts should have one owner.

### Generate a registry from source files

- Pros: removes the handwritten preset list and can enforce naming conventions.
- Cons: adds discovery and generation machinery, hides the reviewed fleet order, and still leaves
  reporting policy and example ownership to another convention.
- Rejected: a direct list of complete `NamedCheck` values is explicit and already small enough.

### Embed examples or assert source text in tests

- Pros: keeps all expectations in TypeScript test modules.
- Cons: large escaped strings obscure real file trees, duplicate source text, and make multi-file
  remediation awkward. Exact prose and location mirrors also couple tests to presentation details.
- Rejected: package-owned trees serve readers and reports, while markers characterize detection
  behavior at its natural source location.

### Keep examples lazy behind a global cache

- Pros: avoids reading example trees that a report never renders.
- Cons: hides filesystem I/O behind a synchronous thunk, requires global mutable cache state, and
  forces an `Effect.runSync` unwrap below an otherwise effectful construction path.
- Rejected: wiring is long-lived static configuration; load its package data once at the outer
  Effect seam and keep downstream reporting pure.

## Consequences

- Importing an individual built-in yields an Effect that constructs a `NamedCheck` with stable
  identity, reporting policy, and concrete immutable examples.
- `defaultChecks` composes built-in Effects in report order and cannot disagree with their
  module-owned names or examples.
- Production packages no longer depend on repository test assets for report examples.
- Characterization fixtures are the detection corpus; package examples are the remediation corpus.
- Most per-Check tests become one marker-driven assertion through the same interface used by Wiring.
- Syntax-sensitive exceptions retain exact assertions only when markers cannot preserve the input or
  express the contract.
