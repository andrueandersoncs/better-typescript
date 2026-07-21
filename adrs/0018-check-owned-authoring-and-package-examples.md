# ADR-0018: Check-owned authoring and package examples

## Status

Accepted. Package ownership is superseded by [ADR-0024](0024-matcher-policy-guidance-factoring.md);
example-source ownership remains accepted.

## Date

2026-07-16

## Context

The default fleet grew to 64 Checks, but each built-in Check repeated the same facts in several
places. Its module exported a raw `Check` and a separate examples value; `defaultWiring` repeated
the name, reporting policy, Check, and examples when constructing a `NamedCheck`; and a separate
test repeated the expected line, column, message, and hint for every characterization case.

The first package-owned example loader kept a module-global `Ref` cache and exposed filesystem
loading through a synchronous thunk. That thunk called `Effect.runSync` solely to unwrap the loader,
hiding I/O behind a property-like interface. Loading every example while constructing effectful
wiring would remove the unwrap, but would also read package assets that a run might never render.

This ceremony made a Check's identity easy to split from its behavior, made adding a built-in
require coordinated registry edits, and kept prose and location mirrors synchronized by hand.

## Decision

### Built-in modules own complete NamedChecks

Every individual built-in module exports one `NamedCheck`. The `@better-typescript/checks` package
provides `defineCheck`, `defineFileCheck`, and `definePlannedCheck` for reported built-ins.
Evidence-only built-ins use `defineSilentCheck` to own an existing `Check`, or
`defineSilentPlannedCheck` to own a subscription plan. These constructors bind the stable name,
executable Check, reporting policy, and examples at the module that owns the detection behavior.

The preset's `defaultChecks` is a direct ordered list of those exports. It does not register names,
reporting policy, or examples again. The migration is a clean cutover: individual built-in modules
no longer export a raw Check plus a separate examples value, and no compatibility aliases or paired
legacy exports remain.

### Refactor examples are inert sources resolved by reporting

Built-in refactor examples live at `packages/checks/examples/<name>/<pair>/{bad,good}/`. Each side
is a source tree, so a remediation may add, remove, or reorganize several files. These trees are
package assets, independent of the repository's characterization fixtures.

An authoring constructor stores an inert `RefactorExampleSource` on the `NamedCheck`. Package
examples use a directory descriptor; custom fleets may provide already-built inline examples.
Constructing Checks, Wiring, and configuration therefore performs no filesystem I/O.

The report program owns the effectful resolution seam. It creates one resolver for a complete report
run, loads a directory only when a report block needs its examples, and caches successful loads for
that run. No global `Ref`, synchronous unwrap, or eager wiring load remains.

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
`silentCheck` accept inert example sources, and `inlineRefactorExamples` supports callers that
already own concrete examples.

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

### Load examples while constructing effectful wiring

- Pros: all downstream reporting receives concrete immutable example arrays and no synchronous
  unwrap is required.
- Cons: configuration construction reads every package example tree even when no report renders it,
  and Wiring becomes effectful solely because it owns filesystem-backed presentation data.
- Rejected: an inert source keeps authoring and Wiring pure while the report Effect owns both
  loading and cache lifetime.

## Consequences

- Importing an individual built-in yields a ready-to-wire `NamedCheck` with stable identity,
  reporting policy, and an inert example source.
- `defaultChecks` enrolls built-ins directly and cannot disagree with their module-owned names or
  examples.
- Check and Wiring construction remain pure; report and watch Effects resolve only examples they
  render.
- Production packages no longer depend on repository test assets for report examples.
- Characterization fixtures are the detection corpus; package examples are the remediation corpus.
- Most per-Check tests become one marker-driven assertion through the same interface used by Wiring.
- Syntax-sensitive exceptions retain exact assertions only when markers cannot preserve the input or
  express the contract.
