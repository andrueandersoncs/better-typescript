# Semantic lint

`better-typescript semantic` asks whether selected files violate natural-language engineering policies.

Policies are off by default. The command reads only Markdown policies under `.better-typescript/rules/`. Opt in to the default catalog with `better-typescript semantic init`, which copies every default policy there and keeps files that already exist. Edit or delete the copies freely.

See [Semantic lint architecture](./semantic-lint-architecture.md) for the implementation flow.

## Run

```sh
npx better-typescript semantic init   # once: copy the default policies
echo 'TYPESAFE_API_KEY=...' >> .env
npx better-typescript semantic
```

The key comes from the environment or, when unset there, from `.env` in the current directory. `TYPESAFE_BASE_URL` is read the same way.

With no target option, the command reads complete changed, staged, and untracked files from the working tree. Deleted files, symlinks, and submodules are skipped because they have no source of their own.

For every selected file:

1. select policies whose frontmatter globs match its path;
2. split the file into overlapping, line-aware spans of at most 4,000 encoded source bytes;
3. ask a Noul per span and policy whether it could contain concrete violation evidence or necessary context;
4. merge candidate spans scoring above 0.40 for each policy;
5. cut selected spans into whole-line blocks of at least 800 source bytes and ask one Noul per block whether it could supply evidence or necessary context, keeping blocks above 0.40 as an evidence set;
6. ask two independent Nouls over that complete evidence set: whether the policy applies and whether the original file violates it; and
7. report the verdict, selected context, and whether that context covers the entire file.

Guidance that every question of a stage shares sits once in request state; each question only points at it. TypeSafe bills state once per request and question text once per question, so this keeps the cost of packing many policies into one request low.

Each selection question is:

```text
Apply `selection_guide` to the following rule.
Rule:
<verbatim rule file>
```

The state holds `path`, the span as `file`, and `selection_guide`:

```text
Could the `file` segment provide evidence that the complete file at `path` violates the rule, or necessary context for evaluating a concrete suspected violation?

This is candidate selection, not a final verdict. Apply the rule's scope, conditions, and exceptions first. Answer yes when the shown code contains an identifiable construct, behavior, contradiction, or omission that plausibly meets the rule's reporting criteria. An omission is evidence only when the segment shows the place where the requirement should be satisfied. The segment need not prove the violation or contain every related fact.

Select context only when it is tied to a specific candidate and is needed to interpret that candidate. Do not select material merely because it might become relevant if unseen code contains a violation. Do not invent unseen behavior, dependencies, or conflicting facts.

Answer no for token or API overlap, imports, generic setup, merely governed constructs, or uncertainty with no concrete candidate. Also answer no when the visible code satisfies the requirement, falls under an exception, or is outside the rule's scope. Judge meaning and code role rather than surface wording. Once a concrete candidate exists, unresolved uncertainty favors yes; otherwise it favors no.
```

This guide was chosen by GEPA, selecting on real external code (`ext-dev`). On held-out cases it kept accuracy and cut tokens by 8–12% by selecting fewer spans.

Each evidence question is ``Apply `evidence_guide` to `block_N`.`` The state holds `path`, the verbatim rule file as `policy`, the blocks as `block_1` … `block_n`, and `evidence_guide`:

```text
Could the block provide concrete evidence, or context needed, for deciding whether the complete file violates the rule in `policy`? Answer yes for plausible evidence or necessary context, not merely related code. Answer no if this block cannot contribute.
```

Blocks hold whole lines. Each block is judged on its own, so distant blocks that are jointly needed can both remain. A span that is a single block is kept without asking. A block too large for a request is kept whole rather than truncated.

Final applicability question:

```text
Is the subject of this rule present in `file`? Answer yes for any covered operation, even one that complies. Do not decide whether the rule is violated.

Rule:
<verbatim rule file>
```
Applicability uses `true` for a covered operation whether it complies or violates, and `false` when no covered operation is present.

Final violation question:

```text
Decide whether the selected source spans in `file`, read together and in light of `path`, establish at least one violation of the appended rule.
Use only the rule, path, and shown code. First check that the rule applies to this file and the code at issue. For each concrete candidate, test every required condition, qualifier, exception, scope limit, and explicit reporting direction. Answer yes only if one candidate meets the complete violation test.
Treat separated spans as shared evidence, but do not invent omitted uses, definitions, control flow, runtime behavior, or intent. Names, imports, types, comments, patterns, and absent evidence establish a fact only when the rule makes them decisive. If a necessary fact is merely possible or depends on unseen code, answer no. Conversely, do not use missing context to excuse a violation already established.
Distinguish code from commentary and examples when relevant. Apply exemptions to each candidate independently. One complete violation is enough; compliant code elsewhere does not cancel it. Return a calibrated probability that the answer is yes.

Rule:
<verbatim rule file>
```

This wording was chosen by GEPA, selecting on real external code. On held-out real code (`ext-test`, about 200 violations) it surfaced 89% of labeled violations instead of 78%, with precision not worse, at 2.4% more tokens. Real-code results take priority over the synthetic corpus, where its score dipped by 0.003.

The final questions receive the same evidence set but are judged independently. Every request includes the project-relative file `path` so the model can apply path-specific policy text. The rule file includes its frontmatter and original line endings. Requests never contain diffs, neighboring files, or other repository context. Final state includes selected source text with original line labels. Selected spans can include distant context that matters together; they do not explain a violation or pinpoint the offending code.

Selection questions over the same span are batched up to the 64,000-byte request limit. Selection spans prefer line boundaries and overlap by a quarter of a span, at most 1,000 source bytes. At most eight requests run concurrently per stage. If no candidate is selected, the policy passes without a final probability: on real files, every such policy also passed a full-file final judgment. If no evidence block is kept, the result is `inconclusive` without a final probability. An evidence set too large for one final request is split into chunks that each fit, cutting at line ends where possible; each chunk is judged and the most severe chunk verdict wins. No source is truncated. A policy that leaves no room for source text still causes an error.

Identical final requests vary by about ±0.05. When a violation probability lands within `0.05` of `--threshold`, the final request is asked four more times and the five answers are averaged, rounded to two decimals, before classification. This keeps borderline findings from flipping between `review` and `violation` across runs.

Live semantic lint sends source spans and policy text to TypeSafe. Do not run it on repositories whose data cannot be sent to that provider. Deterministic lint and semantic `--dry-run` make no TypeSafe request.

## Options

```text
--threshold <number>     Violation probability threshold (default: 0.7)
--model <name>           TypeSafe model override (default: jev-latest)
--rules-dir <path>       Markdown policies directory (default: .better-typescript/rules)
--range <from>..<to>     Analyze complete files from a committed range endpoint
--files <glob>           Analyze selected files; repeat or comma-separate
--all                    Analyze all eligible files
--rules <name>           Run selected policies; repeat or comma-separate
--json                   Print machine-readable results
--dry-run                Inspect files, policies, partitions, and bytes without API calls
--help                    Show help
```

`--files` and `--all` cannot be combined. Either one can be combined with `--range`.

## Current files

Use `--files` to analyze selected complete files:

```sh
npx better-typescript semantic --files 'src/**/*.ts'
npx better-typescript semantic --files src/auth.ts,src/session.ts
```

Use `--all` for every eligible current file:

```sh
npx better-typescript semantic --all
```

`--all` lists tracked and non-ignored untracked files from Git in the current directory, skips deleted files, symlinks, and submodules, then keeps supported extensions, including `.ts` and `.tsx`. Its dry run lists every selected file even if no policy matches it. `--files` narrows that same Git-visible file set; it does not include ignored files.

Use `--rules` to limit policies:

```sh
npx better-typescript semantic --all --rules function-naming,readonly
```

Rule names are Markdown basenames without `.md`. Catalog-relative paths also work, such as `abstraction/do-not-force-variation-through-flags`.

## Default policy cutover

The default policies distinguish shared behavior from similar-looking code, keep pure calculations outside Effect, and avoid copying a growing accumulator with one-pass construction. Converting already decoded data into a result stays a plain function, even when its caller uses Effect. Local mutable builders require explicit exclusions from the mutation rules.

Each default policy states one invariant: one property a file either keeps or breaks. Policies that combined several invariants were split; an invariant that several policies repeated has one owner, and where a top-level project rule (`function-naming`, `avoid-repetition`) overlapped an imported policy, the project rule owns it. Invariants a deterministic rule can check have no semantic policy.

Retired selectors have no aliases. Update `--rules` and semantic-mode `better-typescript.json` commands:

| Retired selector | Replacement |
| --- | --- |
| `file-code-organization/eliminate-all-duplication` | `avoid-repetition` |
| `modularity/extract-shared-concepts-not-merely-similar-looking-code`, `readability/abstract-shared-concepts-not-merely-similar-looking-code` | `avoid-repetition`, `abstraction/do-not-force-variation-through-flags`, `simplicity/give-each-function-or-module-one-coherent-responsibility` |
| `modularity/keep-implementation-details-private-by-default`, `simplicity/keep-interfaces-small-and-predictable` | `abstraction/make-the-public-interface-as-small-as-the-contract-allows` |
| `modularity/test-modules-through-their-contracts`, `simplicity/test-behavior-rather-than-implementation-details` | `abstraction/test-observable-guarantees-not-private-structure` |
| `modularity/give-every-module-one-clear-purpose`, `readability/give-each-function-one-coherent-responsibility` | `simplicity/give-each-function-or-module-one-coherent-responsibility` |
| `simplicity/separate-complicated-decision-making-from-external-operations` | `modularity/separate-decision-making-from-external-effects` |
| `readability/make-dependencies-and-side-effects-visible` | `modularity/make-dependencies-explicit`, `no-mutation`, `no-mutable-variable-declarations`, `no-mutable-array-methods` (deterministic), `abstraction/make-important-consequences-apparent` |
| `readability/make-failure-behavior-explicit` | `simplicity/handle-errors-explicitly-and-close-to-the-right-boundary` |
| `readability/make-the-normal-flow-easy-to-follow` | `no-nested-if-statements` (deterministic) |
| `simplicity/name-things-so-their-purpose-is-clear` | `readability/name-things-by-their-purpose` |
| `simplicity/prefer-obvious-code-over-clever-code` | `readability/prefer-straightforward-code-over-clever-code` |
| `switch-case/prefer-switch-for-multiple-branches`, `switch-case/prefer-match-for-multiple-branches`, `switch-case/use-conditionals-for-boolean-branches` | `no-switch-statements`, `prefer-effect-match`, `no-manual-tag-comparison` (deterministic) |
| `typescript-contracts/use-strict-runtime-specific-tsconfig-files` | Removed; no replacement |
| `abstraction/abstract-shared-meaning-not-merely-similar-code` | `avoid-repetition`, `abstraction/do-not-force-variation-through-flags`, `simplicity/give-each-function-or-module-one-coherent-responsibility` |
| `abstraction/give-each-abstraction-one-coherent-responsibility` | `simplicity/give-each-function-or-module-one-coherent-responsibility`, `readability/keep-each-function-at-a-consistent-level-of-detail` |
| `abstraction/hide-implementation-decisions-not-important-consequences` | `abstraction/make-the-public-interface-as-small-as-the-contract-allows`, `abstraction/make-important-consequences-apparent` |
| `abstraction/keep-dependencies-and-ownership-explicit` | `modularity/make-dependencies-explicit`, `abstraction/give-each-resource-an-owner-that-releases-it` |
| `abstraction/separate-stable-behavior-from-required-variation` | `avoid-repetition` |
| `effect-errors` | `effect/model-expected-failures-with-specific-types`, `effect/keep-expected-failures-out-of-the-defect-channel`, `effect/keep-pure-calculations-pure`, `effect/convert-thrown-exceptions-at-external-boundaries`, `effect/adapt-promises-once-at-integration-boundaries` |
| `effect/give-runtimes-resources-and-background-tasks-an-owner` | `effect/acquire-application-dependencies-once`, `abstraction/give-each-resource-an-owner-that-releases-it`, `effect/give-background-tasks-an-owner` |
| `file-code-organization/group-similar-code-entities` | `file-code-organization/keep-variants-of-one-thing-together` |
| `file-code-organization/simplify-code-organization`, `file-code-organization/avoid-pass-through-files` | `no-reexports` (deterministic) |
| `modularity/do-not-return-mutable-internal-state` | `no-mutation`, `no-mutable-variable-declarations`, `no-mutable-array-methods` (deterministic) |
| `modularity/give-each-piece-of-mutable-state-a-clear-owner` | `no-mutation`, `no-mutable-variable-declarations`, `no-mutable-array-methods` (deterministic) |
| `modularity/keep-public-interfaces-small-explicit-and-task-focused` | `modularity/minimize-back-and-forth-communication-between-modules`, `modularity/specify-inputs-outputs-errors-and-side-effects`, `modularity/do-not-require-a-secret-call-order` |
| `modularity/make-dependencies-explicit-and-narrow` | `modularity/make-dependencies-explicit`, `modularity/depend-on-narrow-collaborators` |
| `modularity/split-or-merge-based-on-cohesion-and-coupling-not-line-counts` | `simplicity/give-each-function-or-module-one-coherent-responsibility`, `modularity/merge-modules-that-change-together` |
| `modularity/use-abstractions-at-meaningful-boundaries-not-everywhere` | `simplicity/let-abstractions-emerge-from-concrete-needs` |
| `readability/make-tests-readable-examples-of-behavior` | `readability/name-tests-after-condition-and-outcome`, `readability/separate-test-setup-action-and-assertions`, `readability/use-test-data-that-makes-behavior-obvious` |
| `readability/name-complicated-conditions-and-intermediate-results`, `expression-complexity` | `no-multiple-boolean-operators` (deterministic) |
| `readability/remove-distractions` | `readability/delete-dead-code`, `simplicity/do-not-add-speculative-extension-points` |
| `simplicity/do-not-mutate-inputs-unexpectedly` | `no-mutation`, `no-mutable-array-methods` (deterministic) |
| `simplicity/keep-control-flow-shallow` | `no-nested-if-statements` (deterministic) |
| `simplicity/make-inputs-dependencies-and-side-effects-explicit` | `modularity/make-dependencies-explicit`, `no-mutation`, `no-mutable-variable-declarations`, `no-mutable-array-methods` (deterministic), `abstraction/make-important-consequences-apparent` |
| `simplicity/minimize-maintainer-cognitive-load` | `simplicity/prefer-direct-calls-over-hidden-dispatch` |
| `simplicity/minimize-mutable-and-duplicated-state` | `no-mutation`, `no-mutable-variable-declarations`, `no-mutable-array-methods` (deterministic), `simplicity/keep-each-fact-in-one-authoritative-place` |
| `testing-enforcement/avoid-fixed-test-waits` | `test-clock-for-time` (deterministic), `testing-enforcement/assert-absence-only-after-the-operation-completes` |
| `testing-enforcement/do-not-focus-or-silently-exclude-tests` | `testing-enforcement/do-not-commit-focused-tests`, `testing-enforcement/justify-skipped-and-expected-failure-tests` |
| `testing-enforcement/use-test-layers-instead-of-global-module-mocks` | `no-module-mocking` (deterministic), `test-clock-for-time` (deterministic), `testing-enforcement/test-resource-lifecycle-behavior` |
| `testing-enforcement/execute-effects-created-by-tests` | `effect-test-style`, `discarded-effect-operation` (deterministic) |

These policies kept their names but now cover one invariant. Their other invariants moved to the listed policies, which a command naming only the old policy no longer covers:

| Narrowed policy | Policies that took its other invariants |
| --- | --- |
| `abstraction/make-correct-use-straightforward-and-invalid-use-difficult` | `typescript-contracts/decode-external-data-at-the-boundary`, `modularity/do-not-require-a-secret-call-order`, `abstraction/provide-defaults-only-when-safe` |
| `abstraction/make-the-public-interface-as-small-as-the-contract-allows` | `abstraction/do-not-force-variation-through-flags`, `abstraction/do-not-import-another-modules-internal-files` |
| `abstraction/preserve-the-controls-callers-genuinely-need` | `simplicity/do-not-add-speculative-extension-points` |
| `abstraction/test-observable-guarantees-not-private-structure` | `abstraction/test-promised-laws-against-their-equivalence`, `abstraction/test-behavior-boundaries-failures-and-integrations`, `abstraction/keep-core-behavior-testable-in-isolation`, `abstraction/avoid-redundant-test-cases`, `abstraction/keep-test-utilities-simpler-than-what-they-support` |
| `effect/adapt-promises-once-at-integration-boundaries` | `effect/construct-effects-lazily`, `effect/model-expected-failures-with-specific-types`, `simplicity/preserve-failure-context` |
| `effect/bound-retries-by-attempts-and-time` | `effect/retry-only-transient-failures`, `effect/retry-writes-only-when-safe-to-repeat` |
| `effect/keep-operational-policies-with-their-operations` | `effect/match-operational-policies-to-each-operation`, `effect/compose-timeouts-and-retries-deliberately`, `effect/retry-writes-only-when-safe-to-repeat` |
| `effect/keep-pure-calculations-pure` | `effect/do-not-wrap-pure-utilities-in-services` |
| `effect/model-expected-failures-with-specific-types` | `effect/keep-expected-failures-out-of-the-defect-channel`, `simplicity/do-not-swallow-failures`, `effect/translate-failures-only-at-the-presentation-boundary` |
| `effect/separate-service-interfaces-from-layer-construction` | None; its capabilities-not-clients invariant was removed |
| `modularity/do-not-expose-internal-representations-unnecessarily` | `no-mutation`, `no-mutable-variable-declarations`, `no-mutable-array-methods` (deterministic) |
| `readability/keep-related-code-close-together` | `readability/declare-variables-near-their-first-use` |
| `readability/make-important-distinctions-visible-in-names` | `readability/name-booleans-as-conditions` |
| `readability/make-interfaces-understandable-at-the-call-site` | `abstraction/do-not-force-variation-through-flags` |
| `readability/name-things-by-their-purpose` | `readability/avoid-obscure-abbreviations-and-redundant-prefixes`, `readability/avoid-temporaries-that-merely-repeat-an-expression`, `function-naming` |
| `readability/prefer-straightforward-code-over-clever-code` | `readability/avoid-temporaries-that-merely-repeat-an-expression` |
| `simplicity/handle-errors-explicitly-and-close-to-the-right-boundary` | `typescript-contracts/decode-external-data-at-the-boundary`, `simplicity/keep-each-fact-in-one-authoritative-place`, `simplicity/preserve-failure-context`, `simplicity/do-not-swallow-failures` |
| `testing-enforcement/control-test-nondeterminism` | `testing-enforcement/preserve-replay-data-for-generated-failures` |
| `testing-enforcement/isolate-state-for-each-generated-case` | `testing-enforcement/preserve-original-generated-inputs` |
| `testing-enforcement/keep-test-fixtures-type-checked` | `testing-enforcement/send-malformed-input-through-the-real-boundary` |
| `testing-enforcement/keep-test-resources-hermetic` | `testing-enforcement/clean-up-test-resources-after-failure`, `testing-enforcement/keep-tests-away-from-production-credentials` |
| `testing-enforcement/reuse-expensive-test-setup` | `testing-enforcement/reset-shared-test-state-deterministically` |
| `testing-enforcement/state-the-law-property-tests-enforce` | `testing-enforcement/explain-the-law-and-domain-of-property-tests` |
| `typescript-contracts/make-exported-effect-signatures-intentional` | `typescript-contracts/isolate-unsafe-type-escapes` |
| `typescript-contracts/separate-storage-domain-and-api-representations` | `typescript-contracts/preserve-meaningful-distinctions-until-the-boundary`, `modularity/do-not-expose-internal-representations-unnecessarily`, `typescript-contracts/test-date-and-identifier-mappings` |
| `typescript-contracts/use-schemas-for-external-contracts` | `typescript-contracts/decode-external-data-at-the-boundary` |
| `web-boundaries/give-frontend-state-one-owner` | `web-boundaries/keep-ordinary-ui-state-out-of-effect` |
| `web-boundaries/give-request-bodies-and-streams-one-consumption-owner` | `web-boundaries/treat-streaming-responses-as-active-work` |
| `web-boundaries/keep-route-handlers-and-ui-components-thin` | `web-boundaries/enforce-authorization-in-the-protected-operation` |
| `web-boundaries/separate-application-dependencies-from-request-state` | `effect/acquire-application-dependencies-once` |

## Committed ranges

```sh
npx better-typescript semantic --range 'release..HEAD'
npx better-typescript semantic --range 'origin/main...HEAD'
```

Range mode selects paths changed by the range and reads each complete file from the range's end commit. Deleted files, symlinks, and submodules are skipped. It also reads `better-typescript.json` from the end commit. Untracked and working-tree contents are excluded.

With `--files` or `--all`, the range only names the commit to read: the command selects matching files from the end commit, whether or not the range changed them. This checks one file as it was at an earlier commit:

```sh
npx better-typescript semantic --range 'abc123^..abc123' --files src/auth.ts
```

## Project policies

A policy is a Markdown file with one or more project-relative globs:

```md
---
globs:
  - "src/**/*.ts"
---
# Do not commit debugger statements

Remove debugger statements.
```

Files under `.better-typescript/rules/` are discovered recursively. `--rules-dir` selects another directory for both `semantic` and `semantic init`. A missing or empty directory, or an invalid policy file, stops the run.

The complete policy file is sent verbatim. Write policies whose violations can be demonstrated from one file. Policies that require proving a global absence or comparing distant regions may be inconclusive when selected spans do not supply enough context.

## Configuration

Semantic-mode commands in `better-typescript.json` include or exclude policies for matching files. Commands apply in order. An explicit `--rules` selection skips semantic-mode commands.

## Dry run

`--dry-run` needs no API key. It reports the **selection-stage** plan for each file:

- complete file byte count;
- path-matched policies;
- selection request partitions;
- whether the file was split into multiple spans;
- span start, end, and source byte count;
- question count per partition; and
- encoded request bytes per partition.

Final requests depend on live selection answers, so they are not included in the dry run.

## Results

| Outcome | Classification | Fails a live run |
| --- | --- | --- |
| No candidate selected | `pass` (no final probability) | No |
| No evidence block selected | `inconclusive` (no final probability) | No |
| Final probability `> 0.55`, but applicability below `0.70` | `inconclusive` (no violation probability) | No |
| Final probability `≤ 0.55` | `pass` | No |
| Final probability `> 0.55` and below `--threshold`, with applicability at least `0.70` | `review` | No |
| Final probability at or above `--threshold`, with applicability at least `0.70` | `violation` | Yes |

Text output marks whole-file selections as `[file-wide context]` instead of displaying a full-file line range. Partial selections appear as `[context lines N-M]`; these are leads to inspect, not precise defect locations. JSON findings retain candidate byte and line ranges and add `evidenceScope`: `file` when the selected range covers every source byte, `localized` when it does not, or omitted when no context was selected. They also include applicability probability when evaluated, the final violation probability when available (averaged near the threshold), and a reason for inconclusive results and candidate-free passes. Candidate and evidence selection are not verdicts. The default violation threshold is `0.70`; the applicability gate stays at `0.70` when `--threshold` changes.

The applicability check is a model judgment, not proof of correctness. The service/Layer policy applies only to files with a service definition or Layer construction; the Effect failure policy applies to fallible effectful operations, not pure checks. Review concrete findings; use narrow semantic-mode exclusions for policies that do not apply instead of rewriting correct code to satisfy a false positive.

Live runs exit `0` for pass, review, or inconclusive findings without violations, `1` for violations, and `2` for arguments, Git, file, response, or TypeSafe errors. Reviews remain visible in text and JSON but do not fail a run. The API key is sent only in the TypeSafe authorization header.
