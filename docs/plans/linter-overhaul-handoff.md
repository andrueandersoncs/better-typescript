# Linter Overhaul Handoff

## Status

Ready for implementation after the preflight scope conflict below is resolved. The human disposition
pass itself is complete.

The current `README.md` and `docs/policy-catalog/project-topology.md` describe package/API shapes
that do not match the source tree. Do not plan from those summaries; use the decision manifest,
current implementation, and executable tests.

## Mission

Replace the current policy, matcher, guidance, signal, advice, wiring, and architecture-analysis
system with a conventional linter:

1. load the TypeScript project;
2. run every built-in rule;
3. collect violations;
4. print the violations.

The finished repository has exactly three packages:

- `@better-typescript/cli`
- `@better-typescript/core`
- `@better-typescript/rules`

This is a replacement, not another layer over the current architecture. Do not retain compatibility
packages, aliases, adapters, deprecated exports, or a second execution path.

## Authoritative decisions

The source of truth is [`better-typescript-overhaul-decisions.json`](../../better-typescript-overhaul-decisions.json),
recorded by commit `536deb097`.

Before editing code, validate the file:

- inventory is `better-typescript-overhaul`;
- there are 281 decisions with 281 unique IDs;
- every choice is `keep`, `change`, or `discard`;
- every `change` choice has a non-empty `changes` value.

The current file is complete:

| Inventory class | Keep | Discard | Total |
| --- | ---: | ---: | ---: |
| Guidance outcomes | 124 | 52 | 176 |
| Runnable matchers | 79 | 26 | 105 |
| **Total** | **203** | **78** | **281** |

There are currently no `change` choices. If the decision file is amended later, treat `change` as a
selected item and implement its `changes` instruction exactly. The disposition matches the intended
simplification: all 58 higher-level rows are discarded; 202 lower-level rows are kept; the only
selected review row is `raw-fetch-outside-adapter`.

Do not reinterpret, rebalance, or reopen these choices during implementation. If a selected rule is
hard to migrate, stop with evidence instead of silently dropping it. If a discarded artifact seems
useful, delete it anyway unless the human changes the decision file.

## How to combine Guidance and Matcher decisions

The two inventory classes describe different legacy artifacts, not two votes on one item:

- a selected Guidance outcome means that user-visible behavior must survive as a direct rule;
- a selected Matcher means its recognition behavior must survive as a direct rule;
- a discard applies to that artifact only and does not veto a selected counterpart.

Key candidates by stable `name`, because fleets disappear in the target architecture. The target
rule catalog is the union of names with at least one selected Guidance or Matcher facet. This
produces **126 final rule identities**:

| Provenance | Final rules |
| --- | ---: |
| Default only | 89 |
| Effect Quality only | 36 |
| Shared by both (`process-environment`) | 1 |
| **Total** | **126** |

The selected source sets contain 90 default names and 37 Effect Quality names before their shared
`process-environment` identity is coalesced. Do not mistake the 203 selected rows for 203 rules.
Seventy-six selected Guidance/Matcher name groups collapse into one rule each.

Apply this conversion table:

| Guidance | Matcher | Instruction |
| --- | --- | --- |
| selected | selected | Combine the selected recognition and selected message/remediation into one rule. |
| selected | discarded or absent | Keep the behavior, but replace the legacy Matcher with a direct rule check. |
| discarded or absent | selected | Keep the recognition, but author new minimal violation text; do not resurrect discarded Guidance. |
| discarded | discarded | Delete both and all exclusively owned support. |

### Known asymmetric decisions

Handle these deliberately rather than “fixing” the inventory:

- `no-function-keyword` and `no-inline-closures`: Guidance is selected and Matcher is discarded.
  Reimplement each as a direct rule check.
- `no-callbacks` and `require-because-in-comments`: Matcher is selected and Guidance is discarded.
  Retain the recognition behavior with new concise violation text.
- `prefer-curried-data-last-functions`: selected Matcher with no direct Guidance counterpart. Promote
  it from silent evidence to a direct rule.
- The nine selected concept-control outcomes (`closed-abstraction`, `duplicate-shape`,
  `function-derived-model`, `missing-rationale`, `parameter-bag`, `pass-through-conversion`,
  `redundant-alias`, `speculative-export`, and `unused-field`) survive, but the discarded
  `concept-control` umbrella Matcher does not. Implement nine independently named rules.
- Thirty-seven Effect Quality outcomes survive, but both Effect Quality umbrella Matchers are
  discarded. Split the selected outcomes into independently runnable rules; do not preserve
  `effect-quality-rules` or `effect-quality-advice-evidence`.
- `process-environment` has two selected Guidance definitions (default and Effect Quality) plus one
  selected Matcher. Produce one canonical rule that preserves both selected detection semantics,
  reconciles the copy, and deduplicates identical locations. Do not register two rules with the same
  name.

The only default rule identities removed entirely are:

- `no-long-comments`
- `no-multi-line-comments`
- `no-array-spread`
- `no-primitive-array-constructors`

All nine default derived-Advice outcomes are discarded. All Architecture Explore and Functional Core
Effect outcomes and Matchers are discarded.

The following twelve formerly derived Effect Quality outcomes become ordinary direct rules:

- `boundary-schema-decode`
- `cache-preference`
- `config-refined-values`
- `http-client-preference`
- `idempotent-retry`
- `observable-worker-failure`
- `raw-fetch-outside-adapter`
- `retry-without-jitter`
- `scoped-background-work`
- `stream-pagination`
- `test-clock-for-time`
- `typed-boundary-error`

Use the JSON for every individual decision; the lists above explain the non-obvious cases but do not
replace the manifest.

## Preflight scope conflict

The current default and Effect Quality implementations use a shared architecture-role/path index to
classify root, test, adapter, application, port, and production files. The target explicitly deletes
that system, but several selected rules currently use it as an eligibility filter. The most acute are
`raw-fetch-outside-adapter`, `http-client-preference`, `typed-boundary-error`,
`boundary-schema-decode`, and the two selected `process-environment` variants.

Before migrating these rules, obtain one human policy decision for role-dependent predicates:

1. make them role-independent and run their local syntactic/type predicate everywhere applicable; or
2. encode only an explicitly approved, rule-owned eligibility predicate in each affected rule.

Do not retain or recreate the shared architecture classifier, fleet policy, or directory-role system.
`raw-fetch-outside-adapter` is the only selected item classified as “review” rather than lower-level,
and its name itself assumes an adapter distinction. If neither option can give it deterministic local
semantics, change or discard that rule explicitly.

Work on role-independent rules can proceed while this policy is pending. The final catalog count
remains 126 only if every selected role-dependent identity survives.

## Target package architecture

The dependency direction is:

```text
@better-typescript/cli ─────► @better-typescript/core
         │
         └──────────────────► @better-typescript/rules ─────► @better-typescript/core
```

`core` must not depend on `rules`, and `rules` must not depend on `cli`.

### `@better-typescript/core`

Own only the reusable linter kernel:

- TypeScript project discovery and Program creation;
- the `Rule` and `Violation` domain types;
- source traversal and rule execution;
- deterministic violation ordering and deduplication;
- one deep `lint` interface that accepts a project and rules and returns violations.

The public product model should be no larger than a rule name, a check implementation, and a located
violation. A violation needs a stable rule name, actionable message, file path, line, and column.
Fold useful legacy hints into the message rather than recreating a second Guidance layer.

The existing fused SyntaxKind traversal may survive as an internal performance technique. It must
not preserve `Matcher`, subscription planning, policy slots, signals, or wiring as public product
concepts.

### `@better-typescript/rules`

Own:

- all 126 selected rule implementations;
- rule-specific facts and private scanning helpers;
- one deterministic built-in rule catalog;
- rule fixtures and focused tests.

Each rule owns recognition and violation construction together. There are no silent rules, evidence
producers, aggregate advisers, policy factories, or fleet-level umbrella rules.

### `@better-typescript/cli`

Own only:

- command-line argument parsing;
- loading the project path;
- invoking `core` with the built-in `rules` catalog;
- rendering returned violations to stdout;
- rendering operational failures to stderr.

The CLI must not assemble Wiring, derive Advice, interpret Signals, or know rule implementation
details.

## Runtime invariants

The replacement is complete only when these statements are true:

- every catalog entry is a reported rule;
- every rule runs on every included project source for which it is applicable;
- one rule occurrence produces one located violation;
- the result is one flat, deterministic list of violations;
- an empty run has no violations;
- there are no severities, suppressions, silent modes, aggregate thresholds, advice precedence, or
  directory/project report blocks;
- no rule depends on a directory name, architecture role, semantic-module placement, or a
  user-authored wiring graph;
- refactor examples may remain as test/documentation fixtures, but are not loaded by the runtime or
  embedded in output.

The overhaul decisions do not change exit-code semantics. Keep the current successful exit behavior
unless a separate product decision changes it.

## Required deletion

Delete, rather than deprecate or re-export, the following legacy surfaces after cutover:

- `packages/guidance/`
- `packages/matchers/`
- `packages/workflows/`
- aggregate Advice derivation under `packages/core/src/engine/derive/`;
- Policy and Guidance modules under `packages/core/src/engine/policy/`;
- Signal and Wiring modules under `packages/core/src/engine/{signal,wiring}/`;
- Advice report keys, evidence bucketing, policy slots, and mixed report-event machinery;
- `packages/core/src/project/loadWiringConfig/` and the custom Wiring configuration path;
- Architecture Explore, Functional Core Effect, semantic-module, architecture-role, directory, and
  workspace-matcher code, tests, fixtures, examples, and catalog pages;
- runtime refactor-example loading if it no longer serves direct violation output;
- every `compat/` declaration and package export for removed concepts.

Remove `better-typescript.config.ts` and self-host Wiring once the new catalog is the only rule set.
Update the root workspace build order, package manifests, lockfile, TypeScript configs, examples,
scripts, README, and policy catalog so they describe only `cli`, `core`, and `rules`.

Preserve historical ADRs. Add `adrs/0027-rules-only-linter-architecture.md` and mark it Accepted; it
must explicitly supersede ADR-0024 and identify other architecture-fleet decisions made obsolete by
the replacement.

## Implementation sequence

### 1. Make the decisions executable

Add a small test or build-time manifest check that reads the decision JSON and derives the exact 126
selected stable names. Retain fleet only as provenance, and assert that the 90 default and 37 Effect
Quality provenance sets overlap only at `process-environment`. Commit the generated target catalog
or its stable expected IDs. This prevents migration progress from drifting away from the human
review.

### 2. Introduce the minimal core seam

Create `Rule`, `Violation`, and `lint` in `core`. Prove the interface with two tiny fake rules against
a fixture Program. Test multiple violations, deterministic order, and an empty result before moving
built-ins.

Do not port Policy/Wiring types into the new interface. If existing traversal code is reused, move
only the implementation needed behind the new seam.

### 3. Create `@better-typescript/rules` and migrate the 90 default-provenance names

Move rules in coherent thematic batches. For every rule:

- preserve the selected detection boundary, subject only to the resolved role-filter policy;
- emit a direct `Violation`;
- keep or rewrite the existing positive and negative tests;
- move only shared helpers used by selected rules;
- delete exclusively owned legacy code immediately after the rule moves.

Apply the asymmetric decisions exactly, especially the split concept-control rules and the four
fully removed default identities.

### 4. Migrate the 37 Effect Quality-provenance names

Split the umbrella implementation first. Migrate the 25 selected reported findings and convert the
12 selected derived outcomes into direct rules. A direct rule may still use Program/type-checker
context, but it may not emit evidence for a later derivation phase.

Delete the eight discarded Effect Quality outcomes and the umbrella dispatch/evidence machinery.
Merge the Effect Quality `process-environment` provenance into the canonical rule created during the
default migration; never register it twice.

### 5. Cut the CLI over

Replace `defaultConfig`/`reportEvents` invocation with one call to `lint` using the built-in rule
catalog. Render only violations. Keep project discovery and the existing output mode only where they
remain thin projections of the same violation data.

Delete watch/configuration behavior that requires Wiring or a second execution model; do not rebuild
those systems under new names.

### 6. Delete the old architecture

Remove the three obsolete packages and the core modules listed above. Run `bun install` after
editing workspace manifests so `bun.lock` matches the new three-package graph. Remove stale tests and
docs only when their owned behavior is discarded or replaced by a new rule test; never weaken a
selected rule's behavioral coverage.

### 7. Rewrite documentation and record the decision

Update README architecture, usage, package names, output examples, and public imports. Replace the
194-entry policy/advice/evidence catalog with a 126-rule catalog or a simpler generated rule list.
Write ADR-0027 and mark ADR-0024 as superseded without deleting historical ADR content.

## Verification loop

Use executable feedback after every migration batch:

1. focused tests for the rule(s) moved;
2. package build/typecheck for `core` and `rules`;
3. a CLI fixture smoke test;
4. the decision-manifest completeness test.

Before each implementation commit, follow the repository instructions. At final cutover run:

```bash
bun install
bun run format
bun run build
bun run typecheck
bun run test
bun run format:check
bun run bench:self
bun run dev
```

Also verify mechanically:

```bash
find packages -mindepth 1 -maxdepth 1 -type d | sort
rg '@better-typescript/(guidance|matchers|workflows)' packages scripts tests examples package.json --glob '*.{ts,json}'
rg '\b(Policy|Guidance|Matcher|Signal|Advice|Wiring)\b' packages --glob '*.ts'
```

The first command must list only `packages/cli`, `packages/core`, and `packages/rules`. The two `rg`
commands must return no live runtime references to removed packages or concepts.

## Completion checklist

- [ ] The decision manifest validates and derives exactly 126 target rules.
- [ ] The final catalog contains exactly 126 unique names from 90 default and 37 Effect Quality provenance entries, with `process-environment` coalesced once.
- [ ] Every selected Guidance behavior is represented by a direct rule.
- [ ] Every selected Matcher behavior is represented by a direct rule.
- [ ] No discarded artifact remains reachable from a package export, catalog, CLI path, or test.
- [ ] `lint` returns one flat deterministic `ReadonlyArray<Violation>`.
- [ ] CLI output is a projection of that violation array and nothing else.
- [ ] Only `cli`, `core`, and `rules` packages remain.
- [ ] No compatibility layer or old execution path remains.
- [ ] ADR-0027 and README describe the final architecture.
- [ ] Formatting, typecheck, tests, benchmark, and self-host run all pass.

## Stop conditions

Stop and ask the human only when:

- a selected Guidance/Matcher behavior cannot be implemented without architecture or directory
  semantics that the target explicitly removes;
- two selected items are observably contradictory after applying the union rule above;
- implementing a selected item would require retaining a discarded umbrella or aggregate runtime;
- the final catalog cannot reconcile to exactly 126 unique rule identities.

Do not stop for ordinary source movement, stale catalog paths, or failing legacy tests owned by
explicitly discarded behavior; update or remove those as part of the relevant migration.
