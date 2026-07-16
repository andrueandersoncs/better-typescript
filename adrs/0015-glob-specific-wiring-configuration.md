# ADR-0015: Glob-specific wiring configuration

## Status

Accepted. The public runner naming and cutover clause is superseded by
[ADR-0017](0017-workspace-update-report-seam.md); the `WiringConfig` and glob semantics remain
accepted.

## Date

2026-07-14

## Context

The root `better-typescript.config.ts` previously exported one `Wiring`. A later `scopeCheck(paths)`
helper added positive path roots to individual `NamedCheck` values. Each root meant one exact file
or one directory and every descendant.

That interface put selection at the wrong seam:

- a check could be restricted, but its containing wiring and `derive` function could not;
- standard file patterns such as `packages/*/src/**/*.ts` could not be expressed;
- applying one policy to several file families repeated scope metadata on every check;
- one root config could not host an arbitrary number of independently derived fleets; and
- `NamedCheck.paths` mixed execution policy into the reusable named check.

The project still needs the decisions retained from ADR-0009 and ADR-0011: one explicit reviewed
TypeScript config at the project root, loaded once; checks as the sole runnable named concept;
direct derivation from complete signal sets; no plugin registry, inheritance chain, scheduler, or
config discovery.

## Decision

### A flat config assigns complete wirings to globs

The config export is a `WiringConfig`, an ordered array of entries:

```ts
export type NonEmptyFileGlobs = Array.NonEmptyReadonlyArray<string>

export class WiringEntry extends Data.Class<{
  readonly files: NonEmptyFileGlobs
  readonly wiring: Wiring
}> {}

export type WiringConfig = ReadonlyArray<WiringEntry>
```

A config uses `defineConfig` and may contain any number of entries:

```ts
export default defineConfig([
  { files: ["src/**/*.ts"], wiring: applicationWiring },
  { files: ["tests/**/*.ts"], wiring: testWiring },
  { files: ["packages/*/scripts/**/*.ts"], wiring: scriptWiring }
])
```

Patterns within one entry form a union. Entries are independent and ordered. When a file matches
several entries, every matching wiring runs. Check names remain globally unique across the complete
config because report keys and the human-facing lookup namespace do not contain a wiring-entry
identity. `defineConfig` and the loader reject collisions across entries.

The root file may default-export the array or a zero-argument factory, or expose it as the named
`config` export. A bare `Wiring`, the named `wiring` export, and per-check `paths` are invalid.
Projects without a config receive `defaultConfig`, which assigns `defaultWiring` to `**/*`.

### Globs are deterministic workspace-relative file selection

`files` uses Minimatch syntax: globstar, braces, extglobs, character classes, `*`, and `?`.
Candidate paths are resolved from each TypeScript project and normalized to forward-slash paths
relative to the discovered workspace root. Matching is case-sensitive and platform-independent.
Dotfiles participate. Patterns are positive; leading `!` is literal rather than implicit exclusion.

A wiring is active for a batch when at least one TypeScript project source file matches one of its
patterns. An inactive wiring runs neither check plans nor `derive`. For an active wiring:

1. only matching source files dispatch its check subscriptions;
2. detections whose resolved locations do not match the wiring are discarded;
3. its checks materialize one complete, deduplicated `Signal[]`; and
4. its `derive` consumes only that signal set.

Derived advice is not glob-filtered after derivation. Project- and directory-level advice represents
the aggregate interpretation of the wiring's already-filtered evidence and may not map to one file.

### Multiple wirings retain fused execution

The runtime flattens checks from every entry into one ordered dispatch plan per TypeScript program.
A check index retains its wiring-entry index, so file matching can activate the correct
subscriptions while the AST is still traversed once. Detection state is grouped back into one signal
set per wiring before derivation. Solution-style workspaces remain sequential and bounded as
required by ADR-0013.

All matched wirings derive independently. Their advice arrays are combined and rendered before local
blocks; local blocks retain config-entry order and then check order. Watch equivalence includes both
each wiring's match state and its signals, so adding the first matching file or removing the last
one propagates to derivation and block clearing.

### Clean public cutover

`scopeCheck`, `NamedCheck.paths`, and `NonEmptyCheckPaths` are removed rather than deprecated.
Snapshot and watch runners now take `WiringConfig` and are named `reportFromConfig`,
`reportBlocksFromConfig`, `reportEventsFromConfig`, and `watchReportFromConfig`. Config loading
moves to `loadWiringConfig` and reports `ProjectWiringConfigError`. No aliases, adapters, or dual
config shapes remain.

This decision supersedes ADR-0009's one-wiring config cardinality and ADR-0011's single-object
public config shape. It preserves their one-root-file, load-once, explicit-code,
check/signal/derive, and no-registry decisions. It also preserves the report-event vocabulary and
rendering contracts from ADR-0008 through ADR-0011.

## Alternatives Considered

### Add glob syntax to `scopeCheck`

- Pros: smallest source change.
- Cons: still repeats selection on every check and cannot select `derive` or a complete fleet.
- Rejected: the requested variation is wiring policy, so the seam belongs above `Wiring`, not inside
  `NamedCheck`.

### Discover nested config files by directory

- Pros: familiar directory-local configuration.
- Cons: introduces lookup precedence, inheritance, invalidation, and watch lifecycle semantics; the
  effective fleet stops being visible in one reviewed file.
- Rejected: retain one explicit root config and express every assignment in its flat array.

### Merge partial wiring overrides for every matching file

- Pros: resembles lint-tool override merging.
- Cons: merging checks is easy, but merging independent `derive` functions and their signal
  namespaces is order-sensitive and ambiguous.
- Rejected: each entry assigns one complete wiring and derives independently.

### Namespace duplicate check names by glob or entry index

- Pros: permits the same prose name in independent entries.
- Cons: existing report keys contain the check name but no config scope; an implicit index is
  unstable and adding a public scope changes every event key.
- Rejected: retain one global check-name namespace. Multiple patterns can target one wiring entry
  when the same fleet should cover a union.

### Use Node's `path.matchesGlob`

- Pros: no dependency.
- Cons: it offers no reusable compiled matcher and only became stable in newer Node 22 and 24
  releases than some supported development environments.
- Rejected: use the explicit `minimatch` dependency and compile matchers for the report pass.

## Consequences

- Config migration is intentionally breaking: wrap each wiring in one or more `{ files, wiring }`
  entries and export `defineConfig([...])`.
- Any number of distinct check-and-derive fleets can target disjoint or overlapping file sets from
  one root config.
- A no-match entry has no execution or reporting side effects.
- Glob selection cost grows with source-file and wiring-entry count, not check count; fused
  subscription dispatch still traverses each AST once.
- Glob patterns use one cross-platform syntax and are validated before analysis.
- Check names must be unique across all entries. Advice identities retain their existing authoring
  invariant.
- Config source still loads once. Changing globs or wiring requires a restart; source membership
  changes continue through the existing watch pipeline.
