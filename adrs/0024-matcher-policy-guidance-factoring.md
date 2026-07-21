# ADR-0024: Matcher, policy, and guidance factoring

## Status

Accepted

## Date

2026-07-21

## Context

A Check combined four independent concerns: recognizing a TypeScript pattern, planning its
execution, selecting a diagnostic location, and writing user-facing remediation. This made the same
recognition logic unavailable to a second policy or aggregate adviser without carrying presentation
strings and diagnostic choices with it. It also made file-, program-, directory-, and
workspace-level work look like variants of one file callback.

The runner must retain its one-pass AST traversal with SyntaxKind dispatch. Some recognition needs
the type checker, program-wide indexes, or dynamically derived evidence, so a serializable matcher
DSL would hide required host-language behavior instead of simplifying it.

## Decision

Use three product concepts:

1. `Matcher<Fact>` recognizes targets and returns factual `Match<Fact>` values without user prose.
2. `Guidance<Fact>` maps a fact and target to local findings or later aggregate advice.
3. `Policy<Fact>` binds stable identity, matcher, guidance, visibility, and refactor examples.

`@better-typescript/matchers` owns target types, contexts, subscriptions, fused program execution,
program-index construction, and completed-workspace matching. Program matching retains the
SyntaxKind-dispatched single traversal. Directory and workspace matching run only after
workspace-relative file paths are collected.

`@better-typescript/core` owns product-neutral policy interpretation, location conversion,
detections, signals, advice, reporting, configuration, project loading, workspace collection, and
deduplication. Its wiring names policies rather than checks.

`@better-typescript/guidance` owns built-in policy definitions, messages, hints, examples, presets,
and advice derivation. It consumes matchers rather than owning AST recognition. The former
`@better-typescript/checks` package is removed; no compatibility aliases remain.

## Consequences

- A matcher can feed multiple policies or aggregate guidance without copying AST logic or prose.
- Recognition cannot accidentally choose a user-facing message or hint.
- Program, directory, and workspace targets have explicit execution stages and location semantics.
- Core remains reusable without bundled product guidance; guidance depends on core and matchers.
- The repository has four ordered packages: matchers, core, guidance, and CLI.

## Alternatives considered

### Keep Checks as the execution primitive

Rejected because it keeps recognition coupled to diagnostics and makes the target stage implicit.

### Add a universal matcher DSL

Rejected because type-checker queries, program indexes, relational matching, and dynamic evidence
are host-language primitives; encoding them as terms would add indirection without reuse.

### Split suggestions from guidance

Rejected because messages, hints, examples, and advice derivation are one user-facing concern. A
fourth package would add ceremony to ordinary policies without a useful seam.

## Supersedes

This ADR supersedes the package-ownership decision in ADR-0018 and the three-package topology in
ADR-0012. ADR-0013's fused-dispatch and bounded-workspace constraints remain accepted.
