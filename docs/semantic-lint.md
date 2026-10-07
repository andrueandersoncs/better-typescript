# Semantic lint

`better-typescript semantic` asks whether selected files violate natural-language engineering policies.

The command embeds the default policy catalog. Add project policies under `.better-typescript/rules/`.

See [Semantic lint architecture](./semantic-lint-architecture.md) for the implementation flow.

## Run

```sh
export TYPESAFE_API_KEY="..."
npx better-typescript semantic
```

With no target option, the command reads complete changed, staged, and untracked files from the working tree. Deleted files are skipped because they have no current contents.

For every selected file:

1. select policies whose frontmatter globs match its path;
2. split the file into overlapping, line-aware spans of at most 4,000 encoded source bytes;
3. ask a Noul per span and policy whether it could contain concrete violation evidence or necessary context;
4. merge candidate spans scoring above 0.40 for each policy;
5. cut selected spans into whole-line blocks of at least 400 source bytes and ask one Noul per block whether it could supply evidence or necessary context, keeping blocks above 0.40 as an evidence set;
6. ask two independent Nouls over that complete evidence set: whether the policy applies and whether the original file violates it; and
7. report the verdict, selected context, and whether that context covers the entire file.

Selection questions use:

```text
Could the `file` segment provide evidence that the complete file at `path` violates the following rule?
This is candidate selection, not a final verdict. Apply the rule's scope and exceptions. Answer yes when the segment shows a concrete construct, behavior, or omission that plausibly conflicts with the rule, or provides context needed to evaluate a specific candidate violation. A candidate need not be proved within this segment; do not require the rest of the file to be visible. Judge semantics and the role of the code, not just matching words or APIs. An absent requirement is evidence when the segment shows where it should be satisfied; do not invent unseen behavior or dependencies. Answer no for mere topical relevance, clearly compliant code, or an inapplicable rule. Uncertainty about a concrete candidate favors yes; uncertainty without a concrete candidate does not.
Rule:
<verbatim rule file>
```

This wording was chosen by prompt optimization against the semantic eval corpus. It halves silent misses relative to the earlier wording, with violation precision unchanged, and roughly doubles live token cost because it is longer and selects more spans.

Each evidence request states the policy once and asks one Noul per block:

```text
Could `block_N` provide concrete evidence, or context needed, for deciding whether the complete file violates the rule in `policy`? Answer yes for plausible evidence or necessary context, not merely related code. Answer no if this block cannot contribute.
```

The state holds `path`, the verbatim rule file as `policy`, and the blocks as `block_1` … `block_n`. Blocks hold whole lines. Each block is judged on its own, so distant blocks that are jointly needed can both remain. A span that is a single block is kept without asking. A block too large for a request is kept whole rather than truncated.

Final applicability question:

```text
Is the subject of this rule present in `file`? Answer yes for any covered operation, even one that complies. Do not decide whether the rule is violated.

Rule:
<verbatim rule file>
```
Applicability uses `true` for a covered operation whether it complies or violates, and `false` when no covered operation is present.

Final violation question:

```text
Do the selected source spans in `file`, considered together, establish a concrete violation of the following rule? Answer yes if they demonstrate a violation even when other code complies. Answer no if the shown behavior follows the rule or omitted context is needed to decide.

Rule:
<verbatim rule file>
```

The final questions receive the same evidence set but are judged independently. Every request includes the project-relative file `path` so the model can apply path-specific policy text. The rule file includes its frontmatter and original line endings. Requests never contain diffs, neighboring files, or other repository context. Final state includes selected source text with original line labels. Selected spans can include distant context that matters together; they do not explain a violation or pinpoint the offending code.

Selection questions over the same span are batched up to the 64,000-byte request limit. Selection spans prefer line boundaries and overlap by up to 2,000 source bytes. At most eight requests run concurrently per stage. If no candidate is selected, no evidence block is kept, or the combined evidence set cannot fit one final request, the result is `inconclusive` without a final probability. No source is silently truncated. A policy that leaves no room for source text still causes an error.

Live semantic lint sends source spans and policy text to TypeSafe. Do not run it on repositories whose data cannot be sent to that provider. Deterministic lint and semantic `--dry-run` make no TypeSafe request.

## Options

```text
--threshold <number>     Violation probability threshold (default: 0.7)
--model <name>           TypeSafe model override (default: jev-latest)
--rules-dir <path>       Additional Markdown rules
--range <from>..<to>     Analyze complete files from a committed range endpoint
--files <glob>           Analyze selected current files; repeat or comma-separate
--all                    Analyze all eligible current files
--rules <name>           Run selected policies; repeat or comma-separate
--json                   Print machine-readable results
--dry-run                Inspect files, policies, partitions, and bytes without API calls
--help                    Show help
```

`--range`, `--files`, and `--all` are mutually exclusive.

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

`--all` lists tracked and non-ignored untracked files from Git in the current directory, skips files deleted from the working tree, then keeps supported extensions, including `.ts` and `.tsx`. Its dry run lists every selected file even if no policy matches it. `--files` narrows that same Git-visible file set; it does not include ignored files.

Use `--rules` to limit policies:

```sh
npx better-typescript semantic --all --rules function-naming,readonly
```

Rule names are Markdown basenames without `.md`. Catalog-relative paths also work, such as `abstraction/do-not-force-variation-through-flags`.

## Default policy cutover

The embedded policies distinguish shared behavior from similar-looking code, keep pure calculations outside Effect, and avoid copying a growing accumulator with one-pass construction. Converting already decoded data into a result stays a plain function, even when its caller uses Effect. Local mutable builders require explicit exclusions from the mutation rules. Suitable tagged multiway decisions use Effect `Match`, not forbidden `switch` statements.

Each embedded policy states one invariant: one property a file either keeps or breaks. Policies that combined several invariants were split; an invariant that several policies repeated has one owner, and where a top-level project rule (`if-statements`, `mutability`, `function-naming`, `expression-complexity`, `avoid-repetition`) overlapped an imported policy, the project rule owns it.

Retired selectors have no aliases. Update `--rules` and semantic-mode `better-typescript.json` commands:

| Retired selector | Replacement |
| --- | --- |
| `file-code-organization/eliminate-all-duplication` | `avoid-repetition` |
| `modularity/extract-shared-concepts-not-merely-similar-looking-code`, `readability/abstract-shared-concepts-not-merely-similar-looking-code` | `avoid-repetition`, `abstraction/do-not-force-variation-through-flags`, `simplicity/give-each-function-or-module-one-coherent-responsibility` |
| `modularity/keep-implementation-details-private-by-default`, `simplicity/keep-interfaces-small-and-predictable` | `abstraction/make-the-public-interface-as-small-as-the-contract-allows` |
| `modularity/test-modules-through-their-contracts`, `simplicity/test-behavior-rather-than-implementation-details` | `abstraction/test-observable-guarantees-not-private-structure` |
| `modularity/give-every-module-one-clear-purpose`, `readability/give-each-function-one-coherent-responsibility` | `simplicity/give-each-function-or-module-one-coherent-responsibility` |
| `simplicity/separate-complicated-decision-making-from-external-operations` | `modularity/separate-decision-making-from-external-effects` |
| `readability/make-dependencies-and-side-effects-visible` | `modularity/make-dependencies-explicit`, `mutability`, `abstraction/make-important-consequences-apparent` |
| `readability/make-failure-behavior-explicit` | `simplicity/handle-errors-explicitly-and-close-to-the-right-boundary` |
| `readability/make-the-normal-flow-easy-to-follow` | `if-statements` |
| `simplicity/name-things-so-their-purpose-is-clear` | `readability/name-things-by-their-purpose` |
| `simplicity/prefer-obvious-code-over-clever-code` | `readability/prefer-straightforward-code-over-clever-code` |
| `switch-case/prefer-switch-for-multiple-branches` | `switch-case/prefer-match-for-multiple-branches` |
| `typescript-contracts/use-strict-runtime-specific-tsconfig-files` | Removed; no replacement |
| `abstraction/abstract-shared-meaning-not-merely-similar-code` | `avoid-repetition`, `abstraction/do-not-force-variation-through-flags`, `simplicity/give-each-function-or-module-one-coherent-responsibility` |
| `abstraction/give-each-abstraction-one-coherent-responsibility` | `simplicity/give-each-function-or-module-one-coherent-responsibility`, `readability/keep-each-function-at-a-consistent-level-of-detail` |
| `abstraction/hide-implementation-decisions-not-important-consequences` | `abstraction/make-the-public-interface-as-small-as-the-contract-allows`, `abstraction/make-important-consequences-apparent` |
| `abstraction/keep-dependencies-and-ownership-explicit` | `modularity/make-dependencies-explicit`, `abstraction/give-each-resource-an-owner-that-releases-it` |
| `abstraction/separate-stable-behavior-from-required-variation` | `avoid-repetition` |
| `effect-errors` | `effect/model-expected-failures-with-specific-types`, `effect/keep-expected-failures-out-of-the-defect-channel`, `effect/keep-pure-calculations-pure`, `effect/convert-thrown-exceptions-at-external-boundaries`, `effect/adapt-promises-once-at-integration-boundaries` |
| `effect/give-runtimes-resources-and-background-tasks-an-owner` | `effect/acquire-application-dependencies-once`, `abstraction/give-each-resource-an-owner-that-releases-it`, `effect/give-background-tasks-an-owner` |
| `file-code-organization/group-similar-code-entities` | `file-code-organization/keep-variants-of-one-thing-together` |
| `file-code-organization/simplify-code-organization` | `file-code-organization/avoid-pass-through-files` |
| `modularity/do-not-return-mutable-internal-state` | `mutability` |
| `modularity/give-each-piece-of-mutable-state-a-clear-owner` | `mutability` |
| `modularity/keep-public-interfaces-small-explicit-and-task-focused` | `modularity/minimize-back-and-forth-communication-between-modules`, `modularity/specify-inputs-outputs-errors-and-side-effects`, `modularity/do-not-require-a-secret-call-order` |
| `modularity/make-dependencies-explicit-and-narrow` | `modularity/make-dependencies-explicit`, `modularity/depend-on-narrow-collaborators` |
| `modularity/split-or-merge-based-on-cohesion-and-coupling-not-line-counts` | `simplicity/give-each-function-or-module-one-coherent-responsibility`, `modularity/merge-modules-that-change-together` |
| `modularity/use-abstractions-at-meaningful-boundaries-not-everywhere` | `simplicity/let-abstractions-emerge-from-concrete-needs` |
| `readability/make-tests-readable-examples-of-behavior` | `readability/name-tests-after-condition-and-outcome`, `readability/separate-test-setup-action-and-assertions`, `readability/use-test-data-that-makes-behavior-obvious` |
| `readability/name-complicated-conditions-and-intermediate-results` | `expression-complexity` |
| `readability/remove-distractions` | `readability/delete-dead-code`, `readability/keep-comments-current`, `simplicity/do-not-add-speculative-extension-points` |
| `simplicity/do-not-mutate-inputs-unexpectedly` | `mutability` |
| `simplicity/keep-control-flow-shallow` | `if-statements` |
| `simplicity/make-inputs-dependencies-and-side-effects-explicit` | `modularity/make-dependencies-explicit`, `mutability`, `abstraction/make-important-consequences-apparent` |
| `simplicity/minimize-maintainer-cognitive-load` | `simplicity/prefer-direct-calls-over-hidden-dispatch` |
| `simplicity/minimize-mutable-and-duplicated-state` | `mutability`, `simplicity/keep-each-fact-in-one-authoritative-place` |
| `testing-enforcement/do-not-focus-or-silently-exclude-tests` | `testing-enforcement/do-not-commit-focused-tests`, `testing-enforcement/justify-skipped-and-expected-failure-tests` |

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
| `modularity/do-not-expose-internal-representations-unnecessarily` | `mutability` |
| `readability/keep-related-code-close-together` | `readability/declare-variables-near-their-first-use` |
| `readability/make-important-distinctions-visible-in-names` | `readability/name-booleans-as-conditions` |
| `readability/make-interfaces-understandable-at-the-call-site` | `abstraction/do-not-force-variation-through-flags` |
| `readability/name-things-by-their-purpose` | `readability/avoid-obscure-abbreviations-and-redundant-prefixes`, `readability/avoid-temporaries-that-merely-repeat-an-expression`, `function-naming` |
| `readability/prefer-straightforward-code-over-clever-code` | `readability/avoid-temporaries-that-merely-repeat-an-expression` |
| `readability/write-comments-that-explain-what-the-code-cannot` | `readability/do-not-narrate-obvious-code`, `readability/keep-comments-current` |
| `simplicity/handle-errors-explicitly-and-close-to-the-right-boundary` | `typescript-contracts/decode-external-data-at-the-boundary`, `simplicity/keep-each-fact-in-one-authoritative-place`, `simplicity/preserve-failure-context`, `simplicity/do-not-swallow-failures` |
| `testing-enforcement/avoid-fixed-test-waits` | `testing-enforcement/assert-absence-only-after-the-operation-completes` |
| `testing-enforcement/control-test-nondeterminism` | `testing-enforcement/preserve-replay-data-for-generated-failures` |
| `testing-enforcement/isolate-state-for-each-generated-case` | `testing-enforcement/preserve-original-generated-inputs` |
| `testing-enforcement/keep-test-fixtures-type-checked` | `testing-enforcement/send-malformed-input-through-the-real-boundary` |
| `testing-enforcement/keep-test-resources-hermetic` | `testing-enforcement/clean-up-test-resources-after-failure`, `testing-enforcement/keep-tests-away-from-production-credentials` |
| `testing-enforcement/reuse-expensive-test-setup` | `testing-enforcement/reset-shared-test-state-deterministically` |
| `testing-enforcement/state-the-law-property-tests-enforce` | `testing-enforcement/explain-the-law-and-domain-of-property-tests` |
| `testing-enforcement/use-test-layers-instead-of-global-module-mocks` | `testing-enforcement/avoid-fixed-test-waits`, `testing-enforcement/test-resource-lifecycle-behavior` |
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

Range mode selects paths changed by the range and reads each complete file from the range's end commit. Deleted files are skipped. It also reads `better-typescript.json` from the end commit. Untracked and working-tree contents are excluded.

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

Files under `.better-typescript/rules/` are discovered recursively. `--rules-dir` selects another additional directory. Invalid or empty policy files stop the run.

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
| No candidate, no evidence block selected, or selected context too large | `inconclusive` (no final probability) | No |
| Final probability `> 0.55`, but applicability below `0.70` | `inconclusive` (no violation probability) | No |
| Final probability `≤ 0.55` | `pass` | No |
| Final probability `> 0.55` and below `--threshold`, with applicability at least `0.70` | `review` | No |
| Final probability at or above `--threshold`, with applicability at least `0.70` | `violation` | Yes |

Text output marks whole-file selections as `[file-wide context]` instead of displaying a full-file line range. Partial selections appear as `[context lines N-M]`; these are leads to inspect, not precise defect locations. JSON findings retain candidate byte and line ranges and add `evidenceScope`: `file` when the selected range covers every source byte, `localized` when it does not, or omitted when no context was selected. They also include applicability probability when evaluated, the final violation probability when available, and a reason for inconclusive results. Candidate and evidence selection are not verdicts. The default violation threshold is `0.70`; the applicability gate stays at `0.70` when `--threshold` changes.

The applicability check is a model judgment, not proof of correctness. The service/Layer policy applies only to files with a service definition or Layer construction; the Effect failure policy applies to fallible effectful operations, not pure checks. A function-local mutable builder remains subject to the immutability policy unless deterministic mutation rules are explicitly excluded for that file. Review concrete findings; use narrow semantic-mode exclusions for policies that do not apply instead of rewriting correct code to satisfy a false positive.

Live runs exit `0` for pass, review, or inconclusive findings without violations, `1` for violations, and `2` for arguments, Git, file, response, or TypeSafe errors. Reviews remain visible in text and JSON but do not fail a run. The API key remains in the process environment and is sent only in the TypeSafe authorization header.
