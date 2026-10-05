# Label review

Human tiebreak for issue 04. For each row, set `label` in `internal/semanticlint/testdata/evals/cases/<policy>.jsonl` and add `"human": "<label>"` to `labels`. `ambiguous` cases are excluded from scoring until resolved.

## Policies below κ 0.6 (rewrite candidates, not prompt tuning)

| Policy | n | κ violates-vs-not | κ three-way | Disagreement |
| --- | --- | --- | --- | --- |
| `effect/keep-pure-calculations-pure` | 16 | 1.00 | 0.26 | `complies` vs `not-applicable`: unclear when the policy's subject is present. |
| `testing-enforcement/avoid-fixed-test-waits` | 17 | 1.00 | 0.42 | `complies` vs `not-applicable`: unclear whether any test with async work is in scope. |
| `testing-enforcement/control-test-nondeterminism` | 19 | 0.78 | 0.45 | Live timeouts and scheduler yields: whether they count as uncontrolled time. |
| `typescript-contracts/use-strict-runtime-specific-tsconfig-files` | 20 | 0.48 | 0.48 | Violations sit in the extended base file (`noUncheckedIndexedAccess` missing), invisible from the judged file. |

## Real cases: Claude vs GPT-6.1-Sol

Files: `internal/semanticlint/testdata/evals/real/`. The tsconfig base (`repos/effect/tsconfig.base.json`) lacks `noUncheckedIndexedAccess`.

### `effect/model-expected-failures-with-specific-types/real-toCodec-070a83`

`packages/effect/src/internal/schema/toCodec.ts`

- Claude `not-applicable` : This codec transformation module does not model expected failures with Effects.
- GPT `violates` [[29, 30], [273, 273]]: Unsupported property names and missing structural codecs are reported by throwing universal Error instances rather than modeling these failures with specific tagged types in the Effect error channel.

### `performance/avoid-growing-accumulator-copies/real-WorkflowProxy-00ee62`

`packages/effect/src/unstable/workflow/WorkflowProxy.ts`

- Claude `not-applicable` : The workflow loops use locally mutable arrays or group variables without rebuilding a growing accumulator by copying prior contents each iteration.
- GPT `violates` [[147, 163]]: The workflow loop repeatedly rebuilds the immutable HTTP API group with group.add, copying previously accumulated endpoints as the input grows without needing to preserve intermediate snapshots.

### `security/hide-database-details/real-regenerate-020d5c`

`packages/sql/pg/test/fixtures/regenerate.ts`

- Claude `violates` [[158, 158], [270, 270]]: The thrown errors embed complete PostgreSQL `ErrorResponse` fields, exposing database details.
- GPT `not-applicable` : The file is an internal fixture-regeneration maintenance tool, so its database error diagnostics are not user-facing error messages.

### `testing-enforcement/control-test-nondeterminism/real-HttpClient.test-02bf0e`

`packages/effect/test/HttpClient.test.ts`

- Claude `violates` [[175, 180]]: The interrupt test depends on a live wall-clock timeout to produce the asserted result rather than a controlled clock.
- GPT `complies` : The live-clock timeout always yields None because the interrupt route's stream never completes, so timing cannot change the assertion, and ephemeral ports only isolate server resources.

### `testing-enforcement/control-test-nondeterminism/real-AtomRpc.test-030a2f`

`packages/effect/test/reactivity/AtomRpc.test.ts`

- Claude `violates` [[153, 160], [180, 189], [225, 228]]: The atom tests use fixed scheduler yields and a live one-second timeout to make asynchronous state transitions observable before their assertions.
- GPT `complies` : The tests use fixed identifiers and inputs, explicit Effect yields to advance scheduled work, and a Deferred plus an awaited result promise to control the asynchronous failure before asserting its outcome.

### `typescript-contracts/use-strict-runtime-specific-tsconfig-files/real-tsconfig-06dd11`

`packages/ai/openai-compat/tsconfig.json`

- Claude `violates` [[2, 2]]: This configuration extends the shared base, which does not enable the required noUncheckedIndexedAccess option.
- GPT `complies` : The file extends the shared base configuration and introduces no runtime-specific libraries or ambient types that would leak into browser or runtime-neutral code.

### `typescript-contracts/use-strict-runtime-specific-tsconfig-files/real-tsconfig-038c9b`

`packages/platform/browser/tsconfig.json`

- Claude `violates` [[2, 2]]: This configuration extends the shared base, which does not enable the required noUncheckedIndexedAccess option.
- GPT `complies` : This browser-specific configuration extends the shared base and does not introduce Bun or Node ambient types into browser code.

### `typescript-contracts/use-strict-runtime-specific-tsconfig-files/real-tsconfig-1ba186`

`packages/tools/bundle/tsconfig.json`

- Claude `violates` [[2, 2]]: This configuration extends the shared base, which does not enable the required noUncheckedIndexedAccess option.
- GPT `complies` : This solution configuration extends the shared base, delegates compilation to referenced configurations, and exposes no runtime libraries or ambient types globally.

### `typescript-contracts/use-strict-runtime-specific-tsconfig-files/real-tsconfig-10a6b6`

`packages/tools/oxc/tsconfig.json`

- Claude `violates` [[2, 2]]: This configuration extends the shared base, which does not enable the required noUncheckedIndexedAccess option.
- GPT `complies` : The tooling configuration extends the shared base and scopes Node ambient types to itself, with no visible strictness override or exposure of Node types to browser or shared packages.

## Synthetic cases: author vs blind

| Case | Gold | Author | Blind |
| --- | --- | --- | --- |
| `effect/bound-retries-by-attempts-and-time/pair-5-violates` | violates | violates | complies |
| `effect/keep-pure-calculations-pure/na-1` | not-applicable | not-applicable | complies |
| `effect/keep-pure-calculations-pure/pair-1-complies` | complies | complies | not-applicable |
| `effect/keep-pure-calculations-pure/pair-3-complies` | complies | complies | not-applicable |
| `effect/keep-pure-calculations-pure/pair-4-complies` | complies | complies | not-applicable |
| `effect/keep-pure-calculations-pure/pair-5-complies` | complies | complies | not-applicable |
| `effect/model-expected-failures-with-specific-types/pair-4-complies` | ambiguous | complies | violates |
| `performance/avoid-growing-accumulator-copies/pair-1-complies` | complies | complies | not-applicable |
| `performance/avoid-growing-accumulator-copies/pair-2-complies` | complies | complies | not-applicable |
| `performance/avoid-growing-accumulator-copies/pair-3-complies` | complies | complies | not-applicable |
| `performance/avoid-repeated-linear-lookups/pair-1-complies` | complies | complies | not-applicable |
| `performance/avoid-repeated-linear-lookups/pair-2-complies` | complies | complies | not-applicable |
| `performance/avoid-repeated-linear-lookups/pair-3-complies` | complies | complies | not-applicable |
| `readability/name-things-by-their-purpose/na-2` | not-applicable | not-applicable | complies |
| `readability/name-things-by-their-purpose/pair-2-complies` | ambiguous | complies | violates |
| `readability/name-things-by-their-purpose/pair-4-complies` | ambiguous | complies | violates |
| `readability/replace-unexplained-values-with-meaningful-names/na-1` | not-applicable | not-applicable | complies |
| `readability/replace-unexplained-values-with-meaningful-names/na-2` | not-applicable | not-applicable | complies |
| `testing-enforcement/avoid-fixed-test-waits/pair-1-complies` | complies | complies | not-applicable |
| `testing-enforcement/avoid-fixed-test-waits/pair-2-complies` | complies | complies | not-applicable |
| `testing-enforcement/avoid-fixed-test-waits/pair-3-complies` | complies | complies | not-applicable |
| `testing-enforcement/avoid-fixed-test-waits/pair-4-complies` | complies | complies | not-applicable |
| `testing-enforcement/avoid-fixed-test-waits/pair-5-complies` | complies | complies | not-applicable |
| `testing-enforcement/control-test-nondeterminism/pair-2-complies` | complies | complies | not-applicable |
| `testing-enforcement/control-test-nondeterminism/pair-4-complies` | complies | complies | not-applicable |
| `testing-enforcement/do-not-focus-or-silently-exclude-tests/pair-1-complies` | complies | complies | not-applicable |
| `testing-enforcement/do-not-focus-or-silently-exclude-tests/pair-2-complies` | complies | complies | not-applicable |
| `testing-enforcement/prevent-vacuous-test-success/na-1` | not-applicable | not-applicable | complies |
| `testing-enforcement/prevent-vacuous-test-success/na-2` | not-applicable | not-applicable | complies |
| `typescript-contracts/use-strict-runtime-specific-tsconfig-files/na-1` | ambiguous | violates | ambiguous |
| `typescript-contracts/use-strict-runtime-specific-tsconfig-files/na-2` | ambiguous | violates | ambiguous |
