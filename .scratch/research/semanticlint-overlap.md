# Semanticlint default-rule overlap (111 × 111)

Research snapshot: 2026-09-24. **111 semantic policies; 17 duplicate-core pairs, 152 partial-overlap pairs, 5 incompatible pairs; 5,931 pairs with no overlap identified.** The reversible matrix below covers all **12,321 ordered cells** (111 diagonal + twice 6,105 distinct pairs). A live Jev scan is recorded below; its probabilities are not proof that unlisted pairs can never overlap.

> Historical snapshot: source links and [raw scores](./semanticlint-jev-scores.json) describe the [pre-cutover catalog at `974cd960`](https://github.com/andrueandersoncs/better-typescript/tree/974cd96097b33896aceeda12720899eedd6af014/internal/semanticlint/defaults), not the current defaults. Fifteen redundant or conflicting policies were removed and one switch policy renamed after this scan. Links below to deleted policy files no longer resolve in the working tree; read them at that revision. See the [current selector migration](../../docs/semantic-lint.md#default-policy-cutover). The matrix and scores were not recomputed.

## Vocabulary and method

- **Rule**: one embedded Markdown policy; see [`loadRules`](../../internal/semanticlint/rules.go) and [semantic lint behavior](../../docs/semantic-lint.md). Its glob limits where it runs. The semantic runner asks an independent Noul per rule and file/window; it does **not** see neighboring files or the repository ([contract](../../docs/semantic-lint.md)).
- **D**: duplicate *core* violation and remedy; wording, examples, or extra subclauses can differ. Not a claim that predicates are identical on every input.
- **O**: a concrete bad example is flagged by both and one corrective change addresses the shared fault, but one rule also covers other cases.
- **C**: the same valid scenario receives incompatible prescriptions. **—**: no shared fault was established, including mere common theme or different defects that happen to co-occur.

All 111 [source policies](../../internal/semanticlint/defaults/) were read. Initially, the 6,105 unordered pairs received grouped text screening, 290 candidates received a second comparison, and 168 were retained after source inspection. A subsequent live Jev scan and source review added six partial pairs, giving **174 nonempty pairs**. These counts are human-reviewed research judgments, not thresholded Jev outputs or a formal equivalence proof. File globs matter: 88 general JS/TS policies, 19 test-scoped policies, three TS/TSX-only contracts, one tsconfig JSON policy; the test-resource rule also covers package/config files ([source directory](../../internal/semanticlint/defaults/)).

## Decisions with highest impact

1. **Remove or scope `file-code-organization/eliminate-all-duplication`**: its unconditional ["Eliminate all duplication"](../../internal/semanticlint/defaults/file-code-organization/eliminate-all-duplication.md) conflicts with three rules that allow separate implementations of different concepts ([abstraction](../../internal/semanticlint/defaults/abstraction/abstract-shared-meaning-not-merely-similar-code.md), [modularity](../../internal/semanticlint/defaults/modularity/extract-shared-concepts-not-merely-similar-looking-code.md), [readability](../../internal/semanticlint/defaults/readability/abstract-shared-concepts-not-merely-similar-looking-code.md)).
2. **Resolve actual incompatible instructions**: [pure calculations](../../internal/semanticlint/defaults/effect/keep-pure-calculations-pure.md) vs [every application function returns Effect](../../internal/semanticlint/defaults/effect-errors.md); [mutable local accumulator builder](../../internal/semanticlint/defaults/performance/avoid-growing-accumulator-copies.md) vs [blanket immutable application state](../../internal/semanticlint/defaults/mutability.md); [prefer switch for multiple branches](../../internal/semanticlint/defaults/switch-case/prefer-switch-for-multiple-branches.md) vs deterministic [ban on every switch](../../docs/rules/no-switch-statements.md). The two semantic switch policies themselves are complementary: the [boolean-two-way exception](../../internal/semanticlint/defaults/switch-case/use-conditionals-for-boolean-branches.md) is narrower than multiple-way dispatch.
3. **Consolidate duplicate-core clusters** without dropping their useful exceptions: shared-concept extraction `001/030/050`, purposeful naming `061/079`, obvious code `062/080`, decision/effect split `038/081`, dependency visibility `054/076`, and function/module responsibility `032/051/071` ([individual source files linked in matrix](#complete-matrix)).
4. **Do not collapse distinct limits**: [active fan-out](../../internal/semanticlint/defaults/performance/bound-variable-input-fan-out.md) does not bound [pending backlog](../../internal/semanticlint/defaults/performance/bound-pending-work.md); [materialized data](../../internal/semanticlint/defaults/performance/bound-materialized-data.md) has a third byte/cardinality dimension. [Property sampling](../../internal/semanticlint/defaults/testing-enforcement/prevent-vacuous-property-sampling.md) and [general vacuous test success](../../internal/semanticlint/defaults/testing-enforcement/prevent-vacuous-test-success.md) overlap but cover different failure modes.

## Comparator coverage: existing tools

The matrix's **Tools** column lists a documented candidate, not equivalent enforcement or enabled project configuration. **BT** = this project's 156-rule [deterministic catalog](../../docs/rules.md), others are independent tools. Every code below links to its first-party rule definition. A dash means no documented candidate was established in these surveyed catalogs; it does **not** mean no rule exists anywhere. Availability and defaults vary by project configuration ([ESLint rule configuration](https://eslint.org/docs/latest/use/configure/rules), [Vitest plugin configuration](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/README.md), [Playwright plugin configuration](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/README.md)).

| Example | Overlap and necessary distinction |
| --- | --- |
| `028` vs `B1` | Nested `if` is shared; deterministic rule exempts a new nested function and handles `else` traversal specially ([source](../../docs/rules/no-nested-if-statements.md)). ESLint `E3` measures general nesting at its configured depth, not every nested `if` ([source](https://eslint.org/docs/latest/rules/max-depth)). |
| `042` vs `B2/B3/B4`, `E1/E2`, `X1/X2`, `M1/M2` | `var`, `let` and some writes overlap; ESLint/Oxlint/Biome `prefer-const`/`useConst` allow a reassigned `let` that the semantic policy bans ([policy](../../internal/semanticlint/defaults/mutability.md), [ESLint prefer-const](https://eslint.org/docs/latest/rules/prefer-const)). `T1` asks for a readonly *parameter type*, even without a mutation ([source](https://typescript-eslint.io/rules/prefer-readonly-parameter-types/)). |
| `023` vs `B10/E4/X3/M3` | Nesting depth > 2 across calls/operators is not a blanket ban on two nested calls or on one nested ternary ([policy](../../internal/semanticlint/defaults/expression-complexity.md), [BT](../../docs/rules/no-nested-calls.md), [ESLint](https://eslint.org/docs/latest/rules/no-nested-ternary)). |
| `015` vs `B5/B6` | Semantic rule covers *any named Effect-returning function* matching its exceptions; `prefer-effect-fn` only catches the synchronous wrapper around `Effect.gen` ([policy](../../internal/semanticlint/defaults/effect/define-effect-returning-functions-with-effect-fn.md), [BT](../../docs/rules/prefer-effect-fn.md)). `effect-fn-name` checks a **chosen builder's name**, not its use ([BT](../../docs/rules/effect-fn-name.md)). |
| `022` vs `B7/B8` | Typed expected errors and boundary-only execution exceed bans on `throw`/`try`; boundary catch is explicitly allowed in the semantic policy but `B8` bans it ([policy](../../internal/semanticlint/defaults/effect-errors.md), [BT](../../docs/rules/no-try-catch.md)). |
| `083` vs `B9` | **Direct conflict**: an `if`/`else if` chain is asked to become `switch`, which the built-in always rejects ([semantic](../../internal/semanticlint/defaults/switch-case/prefer-switch-for-multiple-branches.md), [built-in](../../docs/rules/no-switch-statements.md)). `084` is merely a subset of the switch ban. |
| `089` vs `V1/V2/P1/P2` | `.only` is shared; semantic policy permits specifically justified skip/todo cases but static disabled/skipped rules flag them ([policy](../../internal/semanticlint/defaults/testing-enforcement/do-not-focus-or-silently-exclude-tests.md), [Vitest disabled](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/no-disabled-tests.md), [Playwright focused](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/no-focused-test.md)). |
| `086/099/102` vs Playwright/Vitest lint | `P3` catches `page.waitForTimeout`, not every fixed wall sleep ([source](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/no-wait-for-timeout.md)); `V3` detects an `expect` call, not a meaningful executed assertion ([source](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/expect-expect.md)); `P5` proposes native selectors but accepts `getByTestId`, which may be an explicit test contract ([source](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/prefer-native-locators.md)). |
| `064` vs `E5/T2/X4/M4` | A domain threshold written as an unexplained numeric literal is shared; syntax-only magic-number rules also flag some obvious numbers and miss unexplained nonnumeric values ([policy](../../internal/semanticlint/defaults/readability/replace-unexplained-values-with-meaningful-names.md), [ESLint rule](https://eslint.org/docs/latest/rules/no-magic-numbers)). |
| `065/080/104` vs `B31/B30/B32` | Different-kind adjacent logical steps can need a blank line; syntax-kind spacing can also demand it where no logical step changes ([spacing rules](../../docs/rules/require-blank-lines-between-statement-kinds.md), [semantic rule](../../internal/semanticlint/defaults/readability/use-whitespace-to-separate-logical-steps.md)). A complicated inline `if (a && b)` overlaps `B30`, but `B30` also bans trivial conditions ([source](../../docs/rules/no-inline-boolean-expressions.md)). Explicit `Effect<..., any>` returns overlap `B32`, which covers all functions rather than intentional exported Effect contracts ([source](../../docs/rules/no-explicit-any-return.md)). |
| `089/097` vs test/typed linters | `P10` requires a reason on conditional skip/fixme annotations, not every skipped test ([source](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/require-annotation-reason.md)). `T4` catches floating Promise statements but by default allows `void promise`, which does not keep the test alive ([source](https://typescript-eslint.io/rules/no-floating-promises/)); `V7` specifically catches an unawaited `expect.poll` ([source](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/require-awaited-expect-poll.md)). `M5/M6` need applicable Biome type-aware configuration; these are not equivalent to test ownership. |
| `099/102` vs Playwright lint | `P11` reports a truthy locator assertion such as `expect(locator).toBeDefined()`, which has an `expect` but cannot fail ([source](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/no-unnecessary-assertions.md)). `P12` forbids raw selectors unless allowlisted, even when document structure is itself the [policy's explicit contract exception](../../internal/semanticlint/defaults/testing-enforcement/use-stable-user-facing-browser-locators.md) ([rule](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/no-raw-locators.md)). |
| `067` vs `@typescript-eslint/prefer-readonly` | **Not a match**: that rule checks class members; this policy asks for the `Readonly` **utility** around a wholly readonly type alias ([semantic](../../internal/semanticlint/defaults/readonly.md), [typed ESLint](https://typescript-eslint.io/rules/prefer-readonly/)). |

The current [Effect ESLint plugin registry](https://github.com/Effect-TS/eslint-plugin/blob/main/src/plugin.ts) exposes `dprint` and `no-import-from-barrel-package`, not a replacement for the Effect semantic policies; this says nothing about other Effect-related tools. Oxlint's [type-aware backend](https://oxc.rs/docs/guide/usage/linter/type-aware.html) and [untyped JavaScript-plugin limit](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) are distinct. [Biome plugins](https://biomejs.dev/linter/plugins/) can define new rules; plugin support does not prove a rule exists. [Vitest](https://vitest.dev/api/vi.html#vi-mock) and [Playwright](https://playwright.dev/docs/mock) runtime APIs supply test mechanisms, not lint diagnostics; their ESLint plugins above do.

## Should this use `jev-cli` Nouls?

[`andrueandersoncs/jev-cli`](https://github.com/andrueandersoncs/jev-cli/blob/main/README.md) has no pairwise-matrix subcommand. `jev noul` asks one question; its root command batches independent questions ([CLI usage](https://github.com/andrueandersoncs/jev-cli/blob/main/README.md#usage), [TypeSafe question independence](https://docs.typesafe.ai/primitives)). The initial matrix predated the API key; the live scan below used the CLI after `.env` became available.

### Live Jev method

The runner sorted all default-rule pairs and sent their **verbatim Markdown, globs included**, as pair-specific structured Noul instructions through the [CLI root command](https://github.com/andrueandersoncs/jev-cli/blob/main/README.md#multiple-questions). Each shared question asked whether one concrete defect violates both rules and one correction fixes both; each conflict question asked whether a valid, jointly applicable case receives incompatible instructions. Selected candidates also received a duplicate-core question. Complete question wording, ordered paths, SHA-256 source hashes, and every returned probability are in the [score artifact](./semanticlint-jev-scores.json).

The CLI batches independent questions with a small common state. Its actual run stayed below the current [64k combined-question and 32k longest-question model limits](https://docs.typesafe.ai/models.md), checked that every requested ID had a valid answer, and recorded the returned versioned model and token usage. The built-in sweep used a separate shared-fault Noul for each semantic policy versus each of the 156 [`docs/rules/`](../../docs/rules/) pages; no built-in conflict or duplicate-core score was requested. Noul answers are probabilities of yes, **not examples, proof, or correctness guarantees** ([Noul contract](https://docs.typesafe.ai/primitives/noul.md)). Keep human judgments grounded in the source definitions, not an arbitrary score cutoff.


### Live run: 2026-09-24

With the user-provided `.env` loaded by Bun, `@andrueandersoncs/jev-cli v0.3.0` returned model **`jev-1.13.0`** for every request. The [raw, pair-indexed scores and source hashes](./semanticlint-jev-scores.json) contain **6,105 internal pairs × two Nouls** (shared fault and conflict), **174 selected pairs × one duplicate-core Noul**, and **111 × 156 = 17,316** semantic-policy-versus-built-in-rule shared-fault Nouls. All **1,917 CLI batches** returned every requested answer: **12,616,048 input tokens**, **726,573 output tokens**. Batches used complete rule files and, for built-ins, complete [`docs/rules/`](../../docs/rules/) rule pages. Neither the API key nor `.env` is in the score artifact.

Calibration shows why Noul scores **did not replace the source-based matrix**. Known duplicate-core `001–050`: shared **0.67**, core **0.87**; narrower overlap `028–073`: shared **0.81**, core **0.32**. But the explicit pure-function-versus-all-Effect conflict `018–022` scored only **0.23** on the conflict question; mutable-builder conflict `042–043` scored **0.27**. At a hypothetical 0.75 shared threshold, only **6/17** prior duplicate-core pairs and **6/146** prior partial pairs pass; only **1/5** known conflicts reaches 0.75 on the conflict question. A previously unlisted `062–077` scored **0.76** shared, yet `077` only gives a broad cognitive-load goal, not an independently specified violation ([source](../../internal/semanticlint/defaults/simplicity/minimize-maintainer-cognitive-load.md)). Scores are candidate-ranking signals, not measured accuracy or diagnostic equivalence.

The exhaustive built-in sweep covers **availability in the 156 documented catalog rules**, not whether a project enabled them. Other-tool matches below remain a first-party-documented **subset** of ESLint, typescript-eslint, Oxlint, Biome, Vitest lint and Playwright lint—not a claim to have exhaustively scanned every external ecosystem. Source inspection added six partial internal pairs and several omitted external-tool candidates. No source rule, CLI code, or API key was changed.

## Complete matrix

Rows are lexically sorted policy paths (the embed loader sorts them: [`rules.go`](../../internal/semanticlint/rules.go)). Each row lists only **higher-numbered** neighbors. For `i < j`, read row `i`: `D`, `O`, `C` if `j` occurs there, otherwise **—**; mirror for `j,i`; each `i,i` is **self**. This is a lossless sparse 111×111 judgment matrix, separate from the complete [raw Jev probabilities](./semanticlint-jev-scores.json). **Tools** is the scoped catalog lookup below; each rule link includes its globs and exceptions.

| ID and default policy | D | O | C | Tools |
| --- | --- | --- | --- | --- |
| 001 [`abstraction/abstract-shared-meaning-not-merely-similar-code.md`](../../internal/semanticlint/defaults/abstraction/abstract-shared-meaning-not-merely-similar-code.md) | 030,050 | 009,011,071 | 024 | B24 |
| 002 [`abstraction/do-not-promise-interchangeability-you-cannot-deliver.md`](../../internal/semanticlint/defaults/abstraction/do-not-promise-interchangeability-you-cannot-deliver.md) | — | — | — | — |
| 003 [`abstraction/give-each-abstraction-one-coherent-responsibility.md`](../../internal/semanticlint/defaults/abstraction/give-each-abstraction-one-coherent-responsibility.md) | — | 032,051,071 | — | — |
| 004 [`abstraction/hide-implementation-decisions-not-important-consequences.md`](../../internal/semanticlint/defaults/abstraction/hide-implementation-decisions-not-important-consequences.md) | — | 029,033,054,076 | — | — |
| 005 [`abstraction/keep-dependencies-and-ownership-explicit.md`](../../internal/semanticlint/defaults/abstraction/keep-dependencies-and-ownership-explicit.md) | — | 016,035,054,076,111 | — | — |
| 006 [`abstraction/make-correct-use-straightforward-and-invalid-use-difficult.md`](../../internal/semanticlint/defaults/abstraction/make-correct-use-straightforward-and-invalid-use-difficult.md) | — | 034,036,057,070,074,106 | — | — |
| 007 [`abstraction/make-the-public-interface-as-small-as-the-contract-allows.md`](../../internal/semanticlint/defaults/abstraction/make-the-public-interface-as-small-as-the-contract-allows.md) | 033,074 | 029,034,063 | — | B22 |
| 008 [`abstraction/preserve-the-controls-callers-genuinely-need.md`](../../internal/semanticlint/defaults/abstraction/preserve-the-controls-callers-genuinely-need.md) | — | 016,020 | — | — |
| 009 [`abstraction/separate-stable-behavior-from-required-variation.md`](../../internal/semanticlint/defaults/abstraction/separate-stable-behavior-from-required-variation.md) | — | 030,050,074 | — | — |
| 010 [`abstraction/test-observable-guarantees-not-private-structure.md`](../../internal/semanticlint/defaults/abstraction/test-observable-guarantees-not-private-structure.md) | 040,082 | 085,092,099 | — | — |
| 011 [`avoid-repetition.md`](../../internal/semanticlint/defaults/avoid-repetition.md) | — | 024,030,050,078 | — | B24 |
| 012 [`effect/adapt-promises-once-at-integration-boundaries.md`](../../internal/semanticlint/defaults/effect/adapt-promises-once-at-integration-boundaries.md) | — | 014,019,022 | — | B14 |
| 013 [`effect/bound-retries-by-attempts-and-time.md`](../../internal/semanticlint/defaults/effect/bound-retries-by-attempts-and-time.md) | — | 017 | — | B12 |
| 014 [`effect/construct-effects-lazily.md`](../../internal/semanticlint/defaults/effect/construct-effects-lazily.md) | — | 022 | — | — |
| 015 [`effect/define-effect-returning-functions-with-effect-fn.md`](../../internal/semanticlint/defaults/effect/define-effect-returning-functions-with-effect-fn.md) | — | — | — | B5, B6 |
| 016 [`effect/give-runtimes-resources-and-background-tasks-an-owner.md`](../../internal/semanticlint/defaults/effect/give-runtimes-resources-and-background-tasks-an-owner.md) | — | 020,111 | — | B13 |
| 017 [`effect/keep-operational-policies-with-their-operations.md`](../../internal/semanticlint/defaults/effect/keep-operational-policies-with-their-operations.md) | — | — | — | B12 |
| 018 [`effect/keep-pure-calculations-pure.md`](../../internal/semanticlint/defaults/effect/keep-pure-calculations-pure.md) | — | 038,081 | 022 | — |
| 019 [`effect/model-expected-failures-with-specific-types.md`](../../internal/semanticlint/defaults/effect/model-expected-failures-with-specific-types.md) | — | 022,104 | — | B7, B8, B25 |
| 020 [`effect/propagate-interruption-to-underlying-work.md`](../../internal/semanticlint/defaults/effect/propagate-interruption-to-underlying-work.md) | — | — | — | B14 |
| 021 [`effect/separate-service-interfaces-from-layer-construction.md`](../../internal/semanticlint/defaults/effect/separate-service-interfaces-from-layer-construction.md) | — | 035,076,111 | — | — |
| 022 [`effect-errors.md`](../../internal/semanticlint/defaults/effect-errors.md) | — | 055,072,104,106 | — | B7, B8, B28, B25 |
| 023 [`expression-complexity.md`](../../internal/semanticlint/defaults/expression-complexity.md) | — | 060,062,080 | — | B10, E4, X3, M3 |
| 024 [`file-code-organization/eliminate-all-duplication.md`](../../internal/semanticlint/defaults/file-code-organization/eliminate-all-duplication.md) | — | 078 | 030,050 | — |
| 025 [`file-code-organization/group-similar-code-entities.md`](../../internal/semanticlint/defaults/file-code-organization/group-similar-code-entities.md) | — | — | — | — |
| 026 [`file-code-organization/simplify-code-organization.md`](../../internal/semanticlint/defaults/file-code-organization/simplify-code-organization.md) | — | — | — | — |
| 027 [`function-naming.md`](../../internal/semanticlint/defaults/function-naming.md) | — | 061,079 | — | B11 |
| 028 [`if-statements.md`](../../internal/semanticlint/defaults/if-statements.md) | — | 059,073 | — | B1, E3 |
| 029 [`modularity/do-not-expose-internal-representations-unnecessarily.md`](../../internal/semanticlint/defaults/modularity/do-not-expose-internal-representations-unnecessarily.md) | — | 031,033,105 | — | — |
| 030 [`modularity/extract-shared-concepts-not-merely-similar-looking-code.md`](../../internal/semanticlint/defaults/modularity/extract-shared-concepts-not-merely-similar-looking-code.md) | 050 | 032,071,078 | — | B24 |
| 031 [`modularity/give-each-piece-of-mutable-state-a-clear-owner.md`](../../internal/semanticlint/defaults/modularity/give-each-piece-of-mutable-state-a-clear-owner.md) | — | 042,078,108,111 | — | — |
| 032 [`modularity/give-every-module-one-clear-purpose.md`](../../internal/semanticlint/defaults/modularity/give-every-module-one-clear-purpose.md) | 071 | 039 | — | — |
| 033 [`modularity/keep-implementation-details-private-by-default.md`](../../internal/semanticlint/defaults/modularity/keep-implementation-details-private-by-default.md) | 074 | 040,105 | — | B22 |
| 034 [`modularity/keep-public-interfaces-small-explicit-and-task-focused.md`](../../internal/semanticlint/defaults/modularity/keep-public-interfaces-small-explicit-and-task-focused.md) | — | 036,057,074,110 | — | — |
| 035 [`modularity/make-dependencies-explicit-and-narrow.md`](../../internal/semanticlint/defaults/modularity/make-dependencies-explicit-and-narrow.md) | — | 054,076,111 | — | — |
| 036 [`modularity/minimize-back-and-forth-communication-between-modules.md`](../../internal/semanticlint/defaults/modularity/minimize-back-and-forth-communication-between-modules.md) | — | 110 | — | — |
| 037 [`modularity/prefer-composition-over-cross-module-inheritance.md`](../../internal/semanticlint/defaults/modularity/prefer-composition-over-cross-module-inheritance.md) | — | — | — | — |
| 038 [`modularity/separate-decision-making-from-external-effects.md`](../../internal/semanticlint/defaults/modularity/separate-decision-making-from-external-effects.md) | 081 | 054,071,076,110 | — | — |
| 039 [`modularity/split-or-merge-based-on-cohesion-and-coupling-not-line-counts.md`](../../internal/semanticlint/defaults/modularity/split-or-merge-based-on-cohesion-and-coupling-not-line-counts.md) | — | 071 | — | — |
| 040 [`modularity/test-modules-through-their-contracts.md`](../../internal/semanticlint/defaults/modularity/test-modules-through-their-contracts.md) | 082 | — | — | — |
| 041 [`modularity/use-abstractions-at-meaningful-boundaries-not-everywhere.md`](../../internal/semanticlint/defaults/modularity/use-abstractions-at-meaningful-boundaries-not-everywhere.md) | — | 063,075 | — | — |
| 042 [`mutability.md`](../../internal/semanticlint/defaults/mutability.md) | — | 054,076,078,111 | 043 | B2, B3, B4, E1, E2, T1, X1, X2, M1, M2 |
| 043 [`performance/avoid-growing-accumulator-copies.md`](../../internal/semanticlint/defaults/performance/avoid-growing-accumulator-copies.md) | — | — | — | B4 |
| 044 [`performance/avoid-repeated-linear-lookups.md`](../../internal/semanticlint/defaults/performance/avoid-repeated-linear-lookups.md) | — | — | — | — |
| 045 [`performance/bound-materialized-data.md`](../../internal/semanticlint/defaults/performance/bound-materialized-data.md) | — | — | — | B15 |
| 046 [`performance/bound-pending-work.md`](../../internal/semanticlint/defaults/performance/bound-pending-work.md) | — | — | — | B16 |
| 047 [`performance/bound-variable-input-fan-out.md`](../../internal/semanticlint/defaults/performance/bound-variable-input-fan-out.md) | — | — | — | — |
| 048 [`performance/reuse-invariant-expensive-setup.md`](../../internal/semanticlint/defaults/performance/reuse-invariant-expensive-setup.md) | — | 100 | — | — |
| 049 [`performance/run-independent-io-concurrently.md`](../../internal/semanticlint/defaults/performance/run-independent-io-concurrently.md) | — | — | — | — |
| 050 [`readability/abstract-shared-concepts-not-merely-similar-looking-code.md`](../../internal/semanticlint/defaults/readability/abstract-shared-concepts-not-merely-similar-looking-code.md) | — | 071 | — | B24 |
| 051 [`readability/give-each-function-one-coherent-responsibility.md`](../../internal/semanticlint/defaults/readability/give-each-function-one-coherent-responsibility.md) | 071 | 110 | — | — |
| 052 [`readability/keep-each-function-at-a-consistent-level-of-detail.md`](../../internal/semanticlint/defaults/readability/keep-each-function-at-a-consistent-level-of-detail.md) | — | 110 | — | — |
| 053 [`readability/keep-related-code-close-together.md`](../../internal/semanticlint/defaults/readability/keep-related-code-close-together.md) | — | — | — | — |
| 054 [`readability/make-dependencies-and-side-effects-visible.md`](../../internal/semanticlint/defaults/readability/make-dependencies-and-side-effects-visible.md) | 076 | — | — | — |
| 055 [`readability/make-failure-behavior-explicit.md`](../../internal/semanticlint/defaults/readability/make-failure-behavior-explicit.md) | 072 | 099 | — | B33 |
| 056 [`readability/make-important-distinctions-visible-in-names.md`](../../internal/semanticlint/defaults/readability/make-important-distinctions-visible-in-names.md) | — | 061,079 | — | — |
| 057 [`readability/make-interfaces-understandable-at-the-call-site.md`](../../internal/semanticlint/defaults/readability/make-interfaces-understandable-at-the-call-site.md) | — | 074 | — | — |
| 058 [`readability/make-tests-readable-examples-of-behavior.md`](../../internal/semanticlint/defaults/readability/make-tests-readable-examples-of-behavior.md) | — | 101 | — | — |
| 059 [`readability/make-the-normal-flow-easy-to-follow.md`](../../internal/semanticlint/defaults/readability/make-the-normal-flow-easy-to-follow.md) | 073 | — | — | — |
| 060 [`readability/name-complicated-conditions-and-intermediate-results.md`](../../internal/semanticlint/defaults/readability/name-complicated-conditions-and-intermediate-results.md) | — | 061,062,079,080 | — | — |
| 061 [`readability/name-things-by-their-purpose.md`](../../internal/semanticlint/defaults/readability/name-things-by-their-purpose.md) | 079 | — | — | — |
| 062 [`readability/prefer-straightforward-code-over-clever-code.md`](../../internal/semanticlint/defaults/readability/prefer-straightforward-code-over-clever-code.md) | 080 | — | — | — |
| 063 [`readability/remove-distractions.md`](../../internal/semanticlint/defaults/readability/remove-distractions.md) | — | 075 | — | B22, B23 |
| 064 [`readability/replace-unexplained-values-with-meaningful-names.md`](../../internal/semanticlint/defaults/readability/replace-unexplained-values-with-meaningful-names.md) | — | — | — | E5, T2, X4, M4 |
| 065 [`readability/use-whitespace-to-separate-logical-steps.md`](../../internal/semanticlint/defaults/readability/use-whitespace-to-separate-logical-steps.md) | — | — | — | B31 |
| 066 [`readability/write-comments-that-explain-what-the-code-cannot.md`](../../internal/semanticlint/defaults/readability/write-comments-that-explain-what-the-code-cannot.md) | — | — | — | B26 |
| 067 [`readonly.md`](../../internal/semanticlint/defaults/readonly.md) | — | — | — | — |
| 068 [`security/do-not-log-secrets.md`](../../internal/semanticlint/defaults/security/do-not-log-secrets.md) | — | — | — | B17 |
| 069 [`security/hide-database-details.md`](../../internal/semanticlint/defaults/security/hide-database-details.md) | — | — | — | — |
| 070 [`simplicity/choose-data-structures-that-reduce-special-cases.md`](../../internal/semanticlint/defaults/simplicity/choose-data-structures-that-reduce-special-cases.md) | — | 074,078 | — | — |
| 071 [`simplicity/give-each-function-or-module-one-coherent-responsibility.md`](../../internal/semanticlint/defaults/simplicity/give-each-function-or-module-one-coherent-responsibility.md) | — | 110 | — | — |
| 072 [`simplicity/handle-errors-explicitly-and-close-to-the-right-boundary.md`](../../internal/semanticlint/defaults/simplicity/handle-errors-explicitly-and-close-to-the-right-boundary.md) | — | 106,110 | — | B25, B33 |
| 073 [`simplicity/keep-control-flow-shallow.md`](../../internal/semanticlint/defaults/simplicity/keep-control-flow-shallow.md) | — | 080,083 | — | B1, E3 |
| 074 [`simplicity/keep-interfaces-small-and-predictable.md`](../../internal/semanticlint/defaults/simplicity/keep-interfaces-small-and-predictable.md) | — | 075 | — | — |
| 075 [`simplicity/let-abstractions-emerge-from-concrete-needs.md`](../../internal/semanticlint/defaults/simplicity/let-abstractions-emerge-from-concrete-needs.md) | — | 081 | — | — |
| 076 [`simplicity/make-inputs-dependencies-and-side-effects-explicit.md`](../../internal/semanticlint/defaults/simplicity/make-inputs-dependencies-and-side-effects-explicit.md) | — | 078,111 | — | — |
| 077 [`simplicity/minimize-maintainer-cognitive-load.md`](../../internal/semanticlint/defaults/simplicity/minimize-maintainer-cognitive-load.md) | — | — | — | — |
| 078 [`simplicity/minimize-mutable-and-duplicated-state.md`](../../internal/semanticlint/defaults/simplicity/minimize-mutable-and-duplicated-state.md) | — | 108,111 | — | — |
| 079 [`simplicity/name-things-so-their-purpose-is-clear.md`](../../internal/semanticlint/defaults/simplicity/name-things-so-their-purpose-is-clear.md) | — | — | — | — |
| 080 [`simplicity/prefer-obvious-code-over-clever-code.md`](../../internal/semanticlint/defaults/simplicity/prefer-obvious-code-over-clever-code.md) | — | — | — | B30 |
| 081 [`simplicity/separate-complicated-decision-making-from-external-operations.md`](../../internal/semanticlint/defaults/simplicity/separate-complicated-decision-making-from-external-operations.md) | — | 110 | — | — |
| 082 [`simplicity/test-behavior-rather-than-implementation-details.md`](../../internal/semanticlint/defaults/simplicity/test-behavior-rather-than-implementation-details.md) | — | 085,088,090,091,092,098,099,101,102,103 | — | V3, P6 |
| 083 [`switch-case/prefer-switch-for-multiple-branches.md`](../../internal/semanticlint/defaults/switch-case/prefer-switch-for-multiple-branches.md) | — | — | — | B9 |
| 084 [`switch-case/use-conditionals-for-boolean-branches.md`](../../internal/semanticlint/defaults/switch-case/use-conditionals-for-boolean-branches.md) | — | — | — | B9 |
| 085 [`testing-enforcement/assert-the-intended-effect-failure-channel.md`](../../internal/semanticlint/defaults/testing-enforcement/assert-the-intended-effect-failure-channel.md) | — | — | — | — |
| 086 [`testing-enforcement/avoid-fixed-test-waits.md`](../../internal/semanticlint/defaults/testing-enforcement/avoid-fixed-test-waits.md) | — | 087,103 | — | P3 |
| 087 [`testing-enforcement/control-test-nondeterminism.md`](../../internal/semanticlint/defaults/testing-enforcement/control-test-nondeterminism.md) | — | 093,094,096,103 | — | — |
| 088 [`testing-enforcement/derive-expected-results-independently.md`](../../internal/semanticlint/defaults/testing-enforcement/derive-expected-results-independently.md) | — | 101 | — | — |
| 089 [`testing-enforcement/do-not-focus-or-silently-exclude-tests.md`](../../internal/semanticlint/defaults/testing-enforcement/do-not-focus-or-silently-exclude-tests.md) | — | — | — | V1, V2, P1, P2, P10 |
| 090 [`testing-enforcement/execute-effects-created-by-tests.md`](../../internal/semanticlint/defaults/testing-enforcement/execute-effects-created-by-tests.md) | — | 091,097,099 | — | B19, B29 |
| 091 [`testing-enforcement/execute-properties-through-the-test-runner.md`](../../internal/semanticlint/defaults/testing-enforcement/execute-properties-through-the-test-runner.md) | — | 097,099 | — | — |
| 092 [`testing-enforcement/generate-the-domain-the-property-claims.md`](../../internal/semanticlint/defaults/testing-enforcement/generate-the-domain-the-property-claims.md) | — | 098,099 | — | — |
| 093 [`testing-enforcement/isolate-browser-sessions-and-data.md`](../../internal/semanticlint/defaults/testing-enforcement/isolate-browser-sessions-and-data.md) | — | 096 | — | — |
| 094 [`testing-enforcement/isolate-state-for-each-generated-case.md`](../../internal/semanticlint/defaults/testing-enforcement/isolate-state-for-each-generated-case.md) | — | — | — | — |
| 095 [`testing-enforcement/keep-test-fixtures-type-checked.md`](../../internal/semanticlint/defaults/testing-enforcement/keep-test-fixtures-type-checked.md) | — | — | — | B27, T3 |
| 096 [`testing-enforcement/keep-test-resources-hermetic.md`](../../internal/semanticlint/defaults/testing-enforcement/keep-test-resources-hermetic.md) | — | — | — | — |
| 097 [`testing-enforcement/own-asynchronous-test-work.md`](../../internal/semanticlint/defaults/testing-enforcement/own-asynchronous-test-work.md) | — | 099 | — | P7, T4, T5, X5, X6, M5, M6, V6, V7, V8, P9 |
| 098 [`testing-enforcement/prevent-vacuous-property-sampling.md`](../../internal/semanticlint/defaults/testing-enforcement/prevent-vacuous-property-sampling.md) | — | 099 | — | V4, P8 |
| 099 [`testing-enforcement/prevent-vacuous-test-success.md`](../../internal/semanticlint/defaults/testing-enforcement/prevent-vacuous-test-success.md) | — | 101 | — | V3, V4, V8, P6, P8, P11 |
| 100 [`testing-enforcement/reuse-expensive-test-setup.md`](../../internal/semanticlint/defaults/testing-enforcement/reuse-expensive-test-setup.md) | — | — | — | — |
| 101 [`testing-enforcement/state-the-law-property-tests-enforce.md`](../../internal/semanticlint/defaults/testing-enforcement/state-the-law-property-tests-enforce.md) | — | — | — | — |
| 102 [`testing-enforcement/use-stable-user-facing-browser-locators.md`](../../internal/semanticlint/defaults/testing-enforcement/use-stable-user-facing-browser-locators.md) | — | — | — | P4, P5, P12 |
| 103 [`testing-enforcement/use-test-layers-instead-of-global-module-mocks.md`](../../internal/semanticlint/defaults/testing-enforcement/use-test-layers-instead-of-global-module-mocks.md) | — | — | — | B18, V5 |
| 104 [`typescript-contracts/make-exported-effect-signatures-intentional.md`](../../internal/semanticlint/defaults/typescript-contracts/make-exported-effect-signatures-intentional.md) | — | — | — | B32 |
| 105 [`typescript-contracts/separate-storage-domain-and-api-representations.md`](../../internal/semanticlint/defaults/typescript-contracts/separate-storage-domain-and-api-representations.md) | — | 106 | — | — |
| 106 [`typescript-contracts/use-schemas-for-external-contracts.md`](../../internal/semanticlint/defaults/typescript-contracts/use-schemas-for-external-contracts.md) | — | 110 | — | B20, B21 |
| 107 [`typescript-contracts/use-strict-runtime-specific-tsconfig-files.md`](../../internal/semanticlint/defaults/typescript-contracts/use-strict-runtime-specific-tsconfig-files.md) | — | — | — | — |
| 108 [`web-boundaries/give-frontend-state-one-owner.md`](../../internal/semanticlint/defaults/web-boundaries/give-frontend-state-one-owner.md) | — | — | — | — |
| 109 [`web-boundaries/give-request-bodies-and-streams-one-consumption-owner.md`](../../internal/semanticlint/defaults/web-boundaries/give-request-bodies-and-streams-one-consumption-owner.md) | — | — | — | — |
| 110 [`web-boundaries/keep-route-handlers-and-ui-components-thin.md`](../../internal/semanticlint/defaults/web-boundaries/keep-route-handlers-and-ui-components-thin.md) | — | — | — | — |
| 111 [`web-boundaries/separate-application-dependencies-from-request-state.md`](../../internal/semanticlint/defaults/web-boundaries/separate-application-dependencies-from-request-state.md) | — | — | — | — |

### Comparator key

| Code | First-party documented comparator |
| --- | --- |
| B1 | Better TypeScript: [`no-nested-if-statements`](../../docs/rules/no-nested-if-statements.md) |
| B2 | Better TypeScript: [`no-mutable-variable-declarations`](../../docs/rules/no-mutable-variable-declarations.md) |
| B3 | Better TypeScript: [`no-mutation`](../../docs/rules/no-mutation.md) |
| B4 | Better TypeScript: [`no-mutable-array-methods`](../../docs/rules/no-mutable-array-methods.md) |
| B5 | Better TypeScript: [`prefer-effect-fn`](../../docs/rules/prefer-effect-fn.md) |
| B6 | Better TypeScript: [`service-method-effect-fn`](../../docs/rules/service-method-effect-fn.md) |
| B7 | Better TypeScript: [`no-throw`](../../docs/rules/no-throw.md) |
| B8 | Better TypeScript: [`no-try-catch`](../../docs/rules/no-try-catch.md) |
| B9 | Better TypeScript: [`no-switch-statements`](../../docs/rules/no-switch-statements.md) |
| B10 | Better TypeScript: [`no-nested-calls`](../../docs/rules/no-nested-calls.md) |
| B11 | Better TypeScript: [`prefer-specific-operation-names`](../../docs/rules/prefer-specific-operation-names.md) |
| B12 | Better TypeScript: [`bounded-retry-schedule`](../../docs/rules/bounded-retry-schedule.md) |
| B13 | Better TypeScript: [`scoped-background-work`](../../docs/rules/scoped-background-work.md) |
| B14 | Better TypeScript: [`raw-fetch-abort-signal`](../../docs/rules/raw-fetch-abort-signal.md) |
| B15 | Better TypeScript: [`unbounded-stream-collect`](../../docs/rules/unbounded-stream-collect.md) |
| B16 | Better TypeScript: [`unbounded-stream-buffer`](../../docs/rules/unbounded-stream-buffer.md) |
| B17 | Better TypeScript: [`no-redacted-value-in-logs`](../../docs/rules/no-redacted-value-in-logs.md) |
| B18 | Better TypeScript: [`no-module-mocking`](../../docs/rules/no-module-mocking.md) |
| B19 | Better TypeScript: [`effect-test-style`](../../docs/rules/effect-test-style.md) |
| B20 | Better TypeScript: [`boundary-schema-decode`](../../docs/rules/boundary-schema-decode.md) |
| B21 | Better TypeScript: [`http-response-validation`](../../docs/rules/http-response-validation.md) |
| B22 | Better TypeScript: [`speculative-export`](../../docs/rules/speculative-export.md) |
| B23 | Better TypeScript: [`no-unused`](../../docs/rules/no-unused.md) |
| B24 | Better TypeScript: [`prefer-function-for-repeated-shape`](../../docs/rules/prefer-function-for-repeated-shape.md) |
| B25 | Better TypeScript: [`typed-error-recovery`](../../docs/rules/typed-error-recovery.md) |
| B26 | Better TypeScript: [`require-because-in-comments`](../../docs/rules/require-because-in-comments.md) |
| B27 | Better TypeScript: [`unsafe-casts`](../../docs/rules/unsafe-casts.md) |
| B28 | Better TypeScript: [`no-error-type`](../../docs/rules/no-error-type.md) |
| B29 | Better TypeScript: [`discarded-effect-operation`](../../docs/rules/discarded-effect-operation.md) |
| B30 | Better TypeScript: [`no-inline-boolean-expressions`](../../docs/rules/no-inline-boolean-expressions.md) |
| B31 | Better TypeScript: [`require-blank-lines-between-statement-kinds`](../../docs/rules/require-blank-lines-between-statement-kinds.md) |
| B32 | Better TypeScript: [`no-explicit-any-return`](../../docs/rules/no-explicit-any-return.md) |
| B33 | Better TypeScript: [`observable-worker-failure`](../../docs/rules/observable-worker-failure.md) |
| E1 | ESLint: [`no-var`](https://eslint.org/docs/latest/rules/no-var) |
| E2 | ESLint: [`prefer-const`](https://eslint.org/docs/latest/rules/prefer-const) |
| E3 | ESLint: [`max-depth`](https://eslint.org/docs/latest/rules/max-depth) |
| E4 | ESLint: [`no-nested-ternary`](https://eslint.org/docs/latest/rules/no-nested-ternary) |
| E5 | ESLint: [`no-magic-numbers`](https://eslint.org/docs/latest/rules/no-magic-numbers) |
| T1 | TS-ESLint: [`prefer-readonly-parameter-types`](https://typescript-eslint.io/rules/prefer-readonly-parameter-types/) |
| T2 | TS-ESLint: [`no-magic-numbers`](https://typescript-eslint.io/rules/no-magic-numbers/) |
| T3 | TS-ESLint: [`no-unsafe-type-assertion`](https://typescript-eslint.io/rules/no-unsafe-type-assertion/) |
| T4 | TS-ESLint: [`no-floating-promises`](https://typescript-eslint.io/rules/no-floating-promises/) |
| T5 | TS-ESLint: [`no-misused-promises`](https://typescript-eslint.io/rules/no-misused-promises/) |
| X1 | Oxlint: [`eslint/no-var`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-var) |
| X2 | Oxlint: [`eslint/prefer-const`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/prefer-const) |
| X3 | Oxlint: [`eslint/no-nested-ternary`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-nested-ternary) |
| X4 | Oxlint: [`eslint/no-magic-numbers`](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-magic-numbers) |
| X5 | Oxlint type-aware: [`typescript/no-floating-promises`](https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-floating-promises) |
| X6 | Oxlint type-aware: [`typescript/no-misused-promises`](https://oxc.rs/docs/guide/usage/linter/rules/typescript/no-misused-promises) |
| M1 | Biome: [`noVar`](https://biomejs.dev/linter/rules/no-var/javascript/) |
| M2 | Biome: [`useConst`](https://biomejs.dev/linter/rules/use-const/javascript/) |
| M3 | Biome: [`noNestedTernary`](https://biomejs.dev/linter/rules/no-nested-ternary/javascript/) |
| M4 | Biome: [`noMagicNumbers`](https://biomejs.dev/linter/rules/no-magic-numbers/javascript/) |
| M5 | Biome: [`noFloatingPromises`](https://biomejs.dev/linter/rules/no-floating-promises/javascript/) |
| M6 | Biome: [`noMisusedPromises`](https://biomejs.dev/linter/rules/no-misused-promises/javascript/) |
| V1 | Vitest lint: [`no-focused-tests`](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/no-focused-tests.md) |
| V2 | Vitest lint: [`no-disabled-tests`](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/no-disabled-tests.md) |
| V3 | Vitest lint: [`expect-expect`](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/expect-expect.md) |
| V4 | Vitest lint: [`no-conditional-expect`](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/no-conditional-expect.md) |
| V5 | Vitest lint: [`no-restricted-vi-methods`](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/no-restricted-vi-methods.md) |
| V6 | Vitest lint: [`valid-expect-in-promise`](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/valid-expect-in-promise.md) |
| V7 | Vitest lint: [`require-awaited-expect-poll`](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/require-awaited-expect-poll.md) |
| V8 | Vitest lint: [`valid-expect`](https://github.com/vitest-dev/eslint-plugin-vitest/blob/main/docs/rules/valid-expect.md) |
| P1 | Playwright lint: [`no-focused-test`](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/no-focused-test.md) |
| P2 | Playwright lint: [`no-skipped-test`](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/no-skipped-test.md) |
| P3 | Playwright lint: [`no-wait-for-timeout`](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/no-wait-for-timeout.md) |
| P4 | Playwright lint: [`no-nth-methods`](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/no-nth-methods.md) |
| P5 | Playwright lint: [`prefer-native-locators`](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/prefer-native-locators.md) |
| P6 | Playwright lint: [`expect-expect`](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/expect-expect.md) |
| P7 | Playwright lint: [`missing-playwright-await`](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/missing-playwright-await.md) |
| P8 | Playwright lint: [`no-conditional-expect`](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/no-conditional-expect.md) |
| P9 | Playwright lint: [`valid-expect-in-promise`](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/valid-expect-in-promise.md) |
| P10 | Playwright lint: [`require-annotation-reason`](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/require-annotation-reason.md) |
| P11 | Playwright lint: [`no-unnecessary-assertions`](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/no-unnecessary-assertions.md) |
| P12 | Playwright lint: [`no-raw-locators`](https://github.com/playwright-community/eslint-plugin-playwright/blob/main/docs/rules/no-raw-locators.md) |

### Pair evidence (all nonempty cells)

The IDs link back to the complete original definitions in the matrix. Each note describes a shared bad example and remedy (or a directly incompatible instruction); it does not claim equal diagnostic behavior outside that case.

| Pair | Type | Shared example or conflict |
| --- | --- | --- |
| 001–009 | O | Flag-heavy sharing can obscure distinct workflows; remove the flags and isolate variation, while sharing only a genuinely common workflow. |
| 001–011 | O | Duplicated multi-step behavior that shares a contract and must change together should be extracted into a shared function. |
| 001–024 | C | Modest duplication between unrelated concepts is allowed under 001 and forbidden under 024. |
| 001–030 | D | Similar-looking code with different reasons to change is wrongly combined; separate the concepts. |
| 001–050 | D | Unrelated cases are combined behind confusing flags; keep them separate. |
| 001–071 | O | Unrelated algorithms are combined in a flag-filled function; split the responsibilities rather than forcing a shared abstraction. |
| 003–032 | O | Unrelated responsibilities share a module; separate them into modules with clear purposes. |
| 003–051 | O | A public function mixes unrelated tasks; split the tasks into coherent operations, though A addresses the abstraction and B the function. |
| 003–071 | O | A module exposes unrelated responsibilities; split it into coherent responsibilities. |
| 004–029 | O | Storage-specific rows leak through an interface; return caller-appropriate data that hides the representation. |
| 004–033 | O | A storage-independent interface exposes its database schema; keep that implementation detail private. |
| 004–054 | O | A calculation function hides a network request; make the external effect visible rather than presenting it as local calculation. |
| 004–076 | O | A harmless-looking function hides a database write; make the external effect apparent. |
| 005–016 | O | An acquired connection escapes cleanup; assign an owner that closes it. |
| 005–035 | O | A hidden service locator obscures a required collaborator; pass the collaborator explicitly. |
| 005–054 | O | An undisclosed global service makes behavior depend on hidden state; make the dependency explicit. |
| 005–076 | O | A global database connection is an implicit dependency; pass it explicitly. |
| 005–111 | O | Mutable current-user state in a shared service creates implicit request context; pass request-owned context to the operation. |
| 006–034 | O | Callers must know a required secret sequence; expose one meaningful operation that enforces it. |
| 006–036 | O | A mandatory cross-module call sequence burdens callers; move the cohesive workflow behind one operation. |
| 006–057 | O | Positional flags permit an invalid combination and obscure intent; expose operations or options that exclude it. |
| 006–070 | O | Independent status booleans permit contradictory states; represent status with one constrained value. |
| 006–074 | O | Optional flags create modes with invalid combinations; expose a smaller interface with valid operations. |
| 006–106 | O | unvalidated HTTP input is used by domain code; decode it at the boundary with a schema |
| 007–029 | O | an unneeded public getter leaks a mutable internal collection; remove the getter |
| 007–033 | D | an unneeded internal helper is publicly exposed; keep it private |
| 007–034 | O | unneeded low-level mutations are public; expose the task-focused operation instead |
| 007–063 | O | an unused public extension hook serves no current need; remove it |
| 007–074 | D | unneeded implementation details are public; keep them private |
| 008–016 | O | a long-lived resource lacks cleanup support and an owner; give it an owned cleanup lifecycle |
| 008–020 | O | an interruptible HTTP wrapper leaves the request running after interruption; propagate cancellation to the request |
| 009–030 | O | unrelated cases are combined in a flag-heavy workflow; separate them and share only genuinely common behavior |
| 009–050 | O | unrelated workflows are combined behind confusing flags; separate them and retain only genuinely shared behavior |
| 009–074 | O | boolean flags make one public workflow operation serve several modes; split the operations |
| 010–040 | D | Tests depend on private structure rather than the module’s contract; assert observable behavior instead. |
| 010–082 | D | Tests assert implementation details rather than observable outcomes; exercise the real subject and assert its public behavior. |
| 010–085 | O | A test accepts any thrown value despite a promised tagged Effect failure; assert the contract’s specific failure channel and variant. |
| 010–092 | O | A property claims rejection of malformed inputs but generates only valid ones; add malformed cases to test the claimed failure behavior. |
| 010–099 | O | A round-trip test can pass without checking equivalence; assert that the result equals the original under the documented contract. |
| 011–024 | O | A multi-step formatting algorithm is duplicated; extract shared logic, though B’s prohibition covers duplication more broadly. |
| 011–030 | O | The same business calculation is copied for the same reason; extract a shared function. |
| 011–050 | O | The same multi-step decision rule is duplicated; extract the shared rule. |
| 011–078 | O | Two copies of a business rule must change together; keep the rule in one authoritative shared implementation. |
| 012–014 | O | Constructing an Effect starts an SDK Promise early; start the call inside the lazy Effect adapter callback. |
| 012–019 | O | An expected SDK rejection becomes an untyped failure; map it to a specific tagged Effect failure while preserving its cause. |
| 012–022 | O | An expected SDK rejection escapes instead of becoming a typed Effect failure; adapt it at the boundary with `Effect.tryPromise`. |
| 013–017 | O | Per-attempt timeouts leave retries without an intended total deadline; impose an overall retry budget. |
| 014–022 | O | starting an SDK Promise before returning an Effect can let a synchronous throw escape; start it inside Effect.tryPromise |
| 016–020 | O | an interrupted subscription remains active because cleanup does not cancel it; make cleanup cancel the subscription |
| 016–111 | O | an application-wide pool is acquired for every request; share one application-lifetime pool |
| 018–022 | C | A pure application calculation should be ordinary under 018 but every application function must return Effect under 022. |
| 018–038 | O | deterministic pricing calculations are embedded in a database Effect; extract ordinary calculation functions separate from database access |
| 018–081 | O | complicated pure decisions are embedded in a network Effect; extract ordinary decision functions separate from the network call |
| 019–022 | O | an expected missing-record failure is thrown instead of returned as a tagged Effect error; return it through the typed error channel |
| 019–104 | O | An exported Effect uses `any` for expected failures; declare an explicit signature with specific tagged error types. |
| 021–035 | O | A service obtains its database client from a global registry; inject that dependency when constructing the service Layer. |
| 021–076 | O | A service secretly uses a global database client; declare and inject the dependency so the external effect is apparent. |
| 021–111 | O | A shared service captures request-owned user state; pass that context per request or operation instead. |
| 022–055 | O | An expected failure is silently replaced with a successful default; preserve it as a typed Effect failure unless an intentional recovery applies. |
| 022–072 | O | A failed operation is hidden by an empty success value; preserve the failure rather than silently falling back. |
| 022–104 | O | An exported Effect uses `any` instead of tagged expected failures; declare an explicit, typed error channel. |
| 022–106 | O | External JSON is cast without validation and parsing can throw; schema-decode it at the boundary into an Effect failure. |
| 023–060 | O | A difficult calculation exceeds the nesting limit; split it into meaningful named intermediate results. |
| 023–062 | O | A dense one-liner nests three calls; split it into straightforward intermediate steps. |
| 023–080 | O | Three nested calls make a transformation hard to read; split into straightforward named steps. |
| 024–030 | C | Duplication between concepts evolving separately must be removed by 024 yet may remain separate under 030. |
| 024–050 | C | Similar unrelated cases may stay duplicated under 050, but 024 bans all duplication. |
| 024–078 | O | A business-rule threshold is duplicated in configuration; keep one authoritative value. |
| 027–061 | O | B also covers non-function names; both reject a generic function name such as `process`; rename it for the value or effect it represents. |
| 027–079 | O | B covers additional naming defects; both reject a purposeless function name such as `handle`; rename it to communicate its result or effect. |
| 028–059 | O | A bans every nested `if`, while B targets deeply nested conditions that obscure normal flow; flatten such nested conditions with guard clauses. |
| 028–073 | O | A bans every nested `if`, while B targets deep or obscuring control flow; use guard clauses to flatten a deeply nested case. |
| 029–031 | O | A rejects exposing a mutable internal collection, while B rejects callers modifying state outside its owner; replace direct access with owner-controlled operations. |
| 029–033 | O | A rejects returned storage-specific records, while B rejects caller dependence on database schemas; return a caller-appropriate representation instead. |
| 029–105 | O | A rejects leaking storage records, while B additionally requires appropriate representation boundaries; map a database row to a selected API payload. |
| 030–032 | O | A rejects unrelated responsibilities in a `utils` dumping ground, while B rejects unclear module purposes generally; split the unrelated responsibilities into purposeful modules. |
| 030–050 | D | Both reject combining merely similar code that represents different concepts; keep it separate and share only a genuine common responsibility. |
| 030–071 | O | A rejects an unrelated `common`-module dumping ground, while B rejects mixed responsibilities in any function or module; split the unrelated responsibilities. |
| 030–078 | O | A calls for sharing a genuinely common behavior, while B calls for one authoritative copy of a duplicated rule; consolidate a duplicated business rule into one shared implementation. |
| 031–042 | O | Multiple modules mutate a shared global array; replace it with immutable values rather than retaining mutable global state. |
| 031–078 | O | Two modules both own mutable copies of one authoritative value; give it one owner and derive secondary state. |
| 031–108 | O | A component and an Effect store both authoritatively update one UI value; give that value one owner. |
| 031–111 | O | Mutable request-specific user state resides in a shared global service; keep it with the request or operation that owns it. |
| 032–039 | O | A module combines independently changing responsibilities; split them along those responsibilities. |
| 032–071 | D | A module mixes unrelated responsibilities; split it into coherent responsibilities. |
| 033–040 | O | A test imports another module’s internal file and depends on private details; test through its public contract. |
| 033–074 | D | A public interface exposes cache methods only its implementation needs; remove them from the public interface. |
| 033–105 | O | API callers receive database-row fields they do not need; expose a selected API payload instead. |
| 034–036 | O | A caller must make repeated cross-module calls in the correct order for one task; move the workflow behind one meaningful operation. |
| 034–057 | O | A public workflow selected by positional flags obscures the call; expose one named task operation. |
| 034–074 | O | Exposing low-level mutations instead of a focused operation; provide the operation and hide unneeded mutation methods. |
| 034–110 | O | A route coordinates low-level mutations instead of invoking an application operation; put the workflow behind one operation. |
| 035–054 | O | A hidden global clock dependency; pass the clock explicitly. |
| 035–076 | O | A database dependency hidden in a service locator; pass the dependency explicitly. |
| 035–111 | O | A shared service reads current-user state from global context; pass request-owned context to the operation instead. |
| 036–110 | O | A route assembles a workflow through repeated module calls; move the workflow behind one application operation. |
| 038–054 | O | `calculate_total()` silently writes a file while calculating; remove the write from the calculation. |
| 038–071 | O | business decisions mixed with database access also mix responsibilities; separate the decisions from the database operation |
| 038–076 | O | a calculation that unexpectedly writes to a database mixes decisions with an opaque effect; separate the write and make it explicit |
| 038–081 | D | complicated decisions interleaved with external operations; separate the decisions from those operations |
| 038–110 | O | business decisions in a route handler are mixed with HTTP handling; move the decisions into an application operation |
| 039–071 | O | a module contains independently changing responsibilities; split it by responsibility rather than line count |
| 040–082 | D | a test asserts a private helper instead of observable module behavior; test the module’s contract |
| 041–063 | O | an interface and factory serve only a hypothetical implementation; remove the speculative abstraction |
| 041–075 | O | forwarding interfaces and factories add no meaningful boundary or variation; remove them |
| 042–043 | C | An input-sized growing accumulator cannot use repeated spread copies; a mutable local builder is prescribed by one policy and prohibited by the other. |
| 042–054 | O | a function unexpectedly mutates global application state; replace the mutation with explicit immutable state handling |
| 042–076 | O | a function unexpectedly mutates an input parameter; construct a new value instead |
| 042–078 | O | modules mutate shared global state; give state a local owner and use immutable values |
| 042–111 | O | a shared service mutates the current user for each request; keep user state in immutable request-owned context |
| 048–100 | O | tests repeatedly build an equivalent expensive runtime; reuse it at the narrowest isolation-safe scope |
| 050–071 | O | a flag-driven helper combines unrelated responsibilities; separate the cases rather than forcing a shared helper |
| 051–071 | D | A function combines unrelated responsibilities; split it into coherent operations. |
| 051–110 | O | A route handler combines request coordination with pricing decisions; move pricing into an application operation. |
| 052–110 | O | A route handler mixes request coordination with low-level business-decision details; move the decision into an application operation. |
| 054–076 | D | A function hides a global dependency or unexpected mutation; make its inputs and effects explicit. |
| 055–072 | D | A failed database read is hidden by a silent fallback; expose the failure instead of returning an empty result. |
| 055–099 | O | A test swallows an exception and passes without asserting its intended condition; assert the failure rather than swallowing it. |
| 056–061 | O | A boolean called `flag` conceals its condition; use a name such as `is_valid`. |
| 056–079 | O | A boolean called `flag` conceals its condition; give it a purpose-revealing name. |
| 057–074 | O | Boolean arguments select different operations through an unclear interface; separate the operations. |
| 058–101 | O | A property test named `property1` without a nearby explanation obscures its outcome and law; name it to state the law, domain, and expected outcome. |
| 059–073 | D | Deeply nested invalid-input branches bury the main operation; use guards to keep the normal flow shallow. |
| 060–061 | O | A complex refund condition named `flag` hides its purpose; give the result a meaningful name. |
| 060–062 | O | A dense one-line refund condition hides its decision; split it into explicit steps with a meaningful intermediate. |
| 060–079 | O | A complex eligibility result named `tmp` hides its meaning; use a domain-meaningful name. |
| 060–080 | O | A clever nested condition hides its decision; use a meaningful intermediate result. |
| 061–079 | D | `data` hides that the records are unpaid invoices; name them `unpaid_invoices`. |
| 062–080 | D | A clever one-line transformation obscures its steps; write it as straightforward steps. |
| 063–075 | O | An unused interface and factory for hypothetical implementations lack a concrete need; remove them. |
| 070–074 | O | boolean status flags permit invalid combinations and complicate the interface; use one status value |
| 070–078 | O | multiple mutable flags represent one status and can disagree; store one status value |
| 071–110 | O | route handler mixes HTTP handling with business decisions; move the decisions into an application operation |
| 072–106 | O | unvalidated HTTP input reaches domain code; decode it against a schema at the boundary |
| 072–110 | O | route passes unvalidated input to an operation; decode it in the handler first |
| 073–080 | O | dense nested ternaries obscure branch selection; use straightforward conditions |
| 073–083 | O | an elaborate if/else-if chain obscures branches; replace it with a switch |
| 074–075 | O | an unneeded public forwarding method adds a purposeless wrapper; remove it |
| 075–081 | O | a forwarding wrapper around a trivial database read adds no useful separation; remove the wrapper |
| 076–078 | O | secret reliance on mutable global state; give the state a local owner and pass it explicitly |
| 076–111 | O | a service secretly reads global mutable user state; pass request-owned user context explicitly |
| 078–108 | O | query cache and component state both own server data; retain one authoritative owner |
| 078–111 | O | mutable current-user state has the wrong owner; move it to request or operation context |
| 081–110 | O | a route mixes authorization decisions with database operations; move the decisions into an application operation and separate them from external operations |
| 082–085 | O | an any-throw assertion misses the promised failure outcome; assert the tagged Effect failure |
| 082–088 | O | expected output copies the implementation; derive expectations independently |
| 082–090 | O | the test never executes its Effect or the subject inside it; run and await the Effect |
| 082–091 | O | an unrun property never tests the subject; execute it and propagate its result to the runner |
| 082–092 | O | a generator omits the malformed inputs the property claims to cover; generate those cases |
| 082–098 | O | Filtering out every case that exercises the claimed behavior leaves the outcome untested; retain meaningful cases and assert the observable result. |
| 082–099 | O | An early return before exercising or asserting the intended behavior lets the test pass vacuously; execute the subject and assert the outcome. |
| 082–101 | O | An implementation-detail property is not a justified behavioral law; replace it with a property over a stated contract and domain. |
| 082–102 | O | Asserting incidental DOM nesting depends on implementation structure; assert the user-facing result using a stable locator. |
| 082–103 | O | A global mock that replaces the subject prevents testing its real behavior; execute the real subject and use a controlled test Layer for dependencies. |
| 086–087 | O | A fixed sleep makes completion depend on wall-clock scheduling; wait for readiness or use a controlled clock. |
| 086–103 | O | A wall-clock sleep used in place of controlled test time makes timing unreliable; use virtual time. |
| 087–093 | O | A shared mutable browser session makes results depend on test order; give each test an isolated session and data. |
| 087–094 | O | Shared state across generated cases makes expectations depend on earlier cases; reset state for every case, including shrinking. |
| 087–096 | O | A shared mutable resource makes parallel-test results depend on scheduling; allocate isolated resources and clean them up. |
| 087–103 | O | A real-time sleep makes a clock-dependent expectation nondeterministic; use virtual time. |
| 088–101 | O | A property that copies the algorithm as its expected value lacks an independent, justified law; state and test a contract-based law over a defined domain. |
| 090–091 | O | An unexecuted Effect containing a property cannot propagate property failure; run and await it through the appropriate test boundary. |
| 090–097 | O | An unawaited `Effect.runPromise` can leave assertions unfinished when the test ends; await or return it so failures propagate. |
| 090–099 | O | Constructing an Effect containing the only assertion lets the test pass without that assertion running; execute it through an Effect-aware runner or awaited runtime boundary. |
| 091–097 | O | Unawaited asynchronous property work can finish after the test; await it and propagate failure, though B covers asynchronous test work generally. |
| 091–099 | O | Ignoring returned property failures lets a test pass without establishing its condition; inspect the result and fail the test, though B covers vacuous success generally. |
| 092–098 | O | Filtering out inputs the property claims to cover leaves no meaningful cases for that domain; retain those inputs and exercise the assertion, though B addresses sampling vacuity more broadly. |
| 092–099 | O | A test claiming malformed-input coverage can pass without testing malformed input; generate and assert on malformed cases, though B covers vacuous tests generally. |
| 093–096 | O | Mutable account data shared between browser tests can affect later tests; isolate the account data, though B also requires resource cleanup and broader hermeticity. |
| 097–099 | O | An unawaited assertion can let the test pass before its condition is checked; await it so its failure reaches the runner, though B covers vacuous success generally. |
| 098–099 | O | A conditional property assertion that never runs lets the test pass unchecked; ensure meaningful cases execute the assertion, though B applies to tests generally. |
| 099–101 | O | A property that merely returns true neither asserts its condition nor expresses a law; replace it with an assertion of a justified law over a defined domain, though B imposes additional contract clarity. |
| 105–106 | O | Casting a semantically different persisted row directly to a domain value skips boundary handling; decode the row with a schema and explicitly map it to the domain model, satisfying the distinct requirements. |
| 106–110 | O | Passing an undecoded request body to an application operation violates both; decode it at the route boundary using a schema, as A specifically requires. |

## Limits and what to do next

- **Next**: reconcile the five internal conflicts first; make `effect-errors` distinguish effectful operations from ordinary pure functions, and choose an explicit locally owned-builder exemption or an immutable linear-time alternative. Decide whether `switch` or Effect `Match` is the project rule before combining lint modes.
- Then merge or narrow duplicate-core clusters while preserving their exception text; keep backlog, fan-out, and materialization checks separate.
- Next: use the recorded scores to prioritize source-level counterexamples for borderline pairs, then test a representative enabled tool configuration. Without that, no global “any tool duplicates this” claim is supportable.
