# Effect repository ideas

## Source

- Original source URL: https://github.com/Effect-TS/effect/tree/main
- Canonical URL: https://github.com/Effect-TS/effect
- Source revision: [`145d8e1013220425b8edf34f7011c73f73e1cdcf`](https://github.com/Effect-TS/effect/commit/145d8e1013220425b8edf34f7011c73f73e1cdcf)
- Result: 3 recommended lint rules and 4 other ideas.

## Recommended lint rules

### 1. Disallow JS-family extensions in relative static specifiers when TypeScript rewrites them

**Recommendation**

When project compiler settings permit TypeScript source extensions, report `.js`, `.jsx`, `.mjs`, or `.cjs` on relative static imports and re-exports that resolve to TypeScript source. Fix only when resolution proves the matching TS-family file.

**Better TypeScript applicability**

This applies to Bun, Deno, source-executed monorepos, and projects using `allowImportingTsExtensions` or relative-extension rewriting. `typescript-go` exposes the import/re-export AST and project compiler options. Resolution is needed to avoid changing intentional emitted-JavaScript specifiers.

**Reasoning**

In the applicable project mode, the source-accurate suffix removes a second authoring convention and makes the checked source path explicit. It must be compiler-option-aware because Node-oriented output often needs `.js`.

**Novelty/overlap — `new`**

No current Better TypeScript rule checks import specifier suffixes. `no-reexports` checks export structure, not module-specifier extensions.

**Example links**

- Effect enables the policy: [`oxlintrc.json` lines 10–23](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/oxc/oxlintrc.json#L10-L23), while its compiler config enables relative-extension rewriting: [`tsconfig.base.json` lines 10–17](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/tsconfig.base.json#L10-L17).
- Its rule maps JS-family suffixes to TS-family suffixes and reports only relative paths: [`no-js-extension-imports.ts` lines 3–48](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/oxc/src/oxlint/rules/no-js-extension-imports.ts#L3-L48), with import and re-export listeners at [lines 51–69](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/oxc/src/oxlint/rules/no-js-extension-imports.ts#L51-L69).
- Focused tests exercise violating static imports/re-exports and package exemptions: [`no-js-extension-imports.test.ts` lines 24–117](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/oxc/test/no-js-extension-imports.test.ts#L24-L117).
- Real source imports use `.ts`: [`Plugin.ts` lines 5–9](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/doctest/src/Plugin.ts#L5-L9).

**Observed evidence**

Effect's custom rule is active. The scan counted 5,119 relative TS-extension matches across 566 production-source files and no JS-extension matches. The linked import is an actual declaration.

**Inference**

A mode-gated Better TypeScript rule can generalize the policy without imposing it on projects whose runtime contract needs emitted `.js` paths.

### 2. Prevent `@internal` types from leaking through public signatures

**Recommendation**

Report an exported public declaration whose resolved signature names a declaration tagged `@internal`, unless the containing public declaration is also internal. Keep unused-export and general re-export policy in existing rules.

**Better TypeScript applicability**

This applies to libraries that emit declarations or use `stripInternal`. A `typescript-go` checker can index symbols whose declarations have the JSDoc tag, resolve aliases, and inspect exported signatures. This is plausible but materially more complex than the relative-extension recommendation.

**Reasoning**

A public signature that depends on a stripped or intentionally unstable type contradicts the visibility boundary and can make declaration output unusable.

**Novelty/overlap — `partial/extension`**

The original candidate mixed three checks. Better TypeScript already covers general re-exports with `no-reexports`; `speculative-export` covers unconsumed exported interfaces, types, and classes; and `no-unused` intentionally does not report exports. The remaining credible gap is a public signature that exposes an `@internal` symbol. The accepted recommendation is narrowed to that gap.

**Example links**

- Effect's custom rule defines reports for unused internals, public re-exports, and public signature leaks: [`no-unused-internal.ts` lines 656–698](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/oxc/src/oxlint/rules/no-unused-internal.ts#L656-L698).
- Focused tests include an internal type exposed by a public signature: [`no-unused-internal.test.ts` lines 27–80](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/oxc/test/no-unused-internal.test.ts#L27-L80).
- A real exported internal type shows the active convention: [`Printer.ts` lines 17–25](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/docgen/src/Printer.ts#L17-L25).

**Observed evidence**

Effect enables the custom internal-hygiene rule and has 1,365 `@internal` matches across 150 production-source files. Its focused test supplies a concrete signature-leak case. The three closest Better TypeScript rules were inspected in production code, tests, fixtures, and docs.

**Inference**

The signature-leak subset adds a declaration-safety check that current Better TypeScript export rules do not provide. The other subsets should not become duplicate rules.

### 3. Make `boundary-schema-decode` precise for asserted `JSON.parse` results

**Recommendation**

Extend `boundary-schema-decode` to resolve the global `JSON.parse` symbol, report direct assertions to trusted domain types, allow `unknown` and deliberately shallow JSON-safe shapes, and require a recognized validator to consume the parsed value rather than merely appear elsewhere in the function.

**Better TypeScript applicability**

This applies to config readers, persistence, HTTP clients, CLIs, and other external-data boundaries. `typescript-go` can resolve the global call and inspect surrounding assertion types. Conservative same-expression or same-binding validator tracking is plausible; general data-flow should not be promised initially.

**Reasoning**

`JSON.parse` has no runtime knowledge of a domain interface. A direct domain assertion bypasses validation. Conversely, retaining `unknown` or asserting a shallow shape whose fields remain `unknown` can be a deliberate first step before explicit checks.

**Novelty/overlap — `partial/extension`**

`internal/rules/boundary_schema_decode/` already reports syntactic `JSON.parse` when no recognized decode name occurs anywhere in the function. Its code, test, fixture, and docs were inspected. The candidate is not a new rule: it is a precision extension that removes name-only and unrelated-decoder false positives and distinguishes unsafe domain assertions from deliberately untrusted results. The current fixture covers `request.json()`, not `JSON.parse`.

**Example links**

- An unsafe file-config assertion narrows directly to `JSDocConfig`: [`Jsdocs.ts` lines 3361–3370](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/jsdocs/src/Jsdocs.ts#L3361-L3370).
- A shallow asserted record keeps the property `unknown` and then checks it: [`no-unused-internal.ts` lines 84–94](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/oxc/src/oxlint/rules/no-unused-internal.ts#L84-L94).
- Another parser preserves the result as `unknown`: [`OpenApiPatch.ts` lines 349–360](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/openapi-generator/src/OpenApiPatch.ts#L349-L360).
- Effect's guidance requires validation of untrusted data: [`Schema` guide lines 1–7](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/ai-docs/src/01_effect/02_schema/index.md#L1-L7).

**Observed evidence**

The scan found 11 `JSON.parse(...) as ...` matches in 9 production-source files. The linked cases show an unsafe domain assertion and two intentionally untrusted alternatives. The existing Better TypeScript rule would report all three unless any recognized decode name appears anywhere in the function.

**Inference**

A symbol- and type-aware extension would preserve the existing boundary policy while making it more accurate and easier to trust.

## Other ideas

### 1. Execute selected rule-document examples in CI

**Recommendation**

Add an explicit marker to selected conformant and non-conformant fences under `docs/rules/*.md`. Run them through the real linter and compare normalized rule IDs and locations.

**Better TypeScript applicability**

At the scan baseline, Better TypeScript had 132 detail pages and separate rule fixtures. The live final-review workspace has 133 after the concurrent `prefer-effect-object` addition. A narrow documentation test would catch drift between public examples and actual diagnostics without importing Effect's full Vitest plugin.

**Reasoning**

Rule docs are executable claims. Testing only marked fences keeps setup and false failures bounded.

**Novelty/overlap — `new`**

`./scripts/check.sh` builds docs and runs Go tests, but no current code extracts or lints Markdown fences. Rule fixtures do not prove that copied public examples still match behavior.

**Example links**

- Effect's doctest purpose and marker: [`README.md` lines 1–29](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/doctest/README.md#L1-L29).
- Expected values and source-relative collection: [lines 31–79](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/doctest/README.md#L31-L79).
- A distinct CI job: [`check.yml` lines 167–178](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/.github/workflows/check.yml#L167-L178).

**Observed evidence**

Effect extracts marked examples and tests the transform, including malformed expectations and binding collisions. Better TypeScript currently builds Markdown but does not execute rule examples.

**Inference**

A small, opt-in extractor would prevent a high-value public surface from drifting while preserving the narrow existing fixture model.

### 2. Add a revision-aware linter performance harness

**Recommendation**

Compare the same representative TypeScript fixtures with binaries from base and head. Record both SHAs, compiler version, fixture hash, timing, allocations, and peak memory. Keep raw results and gate only a defined regression threshold.

**Better TypeScript applicability**

This protects the repository's one-listener-registration and one-traversal-per-file architecture. It can measure the real CLI, checker, and native binary rather than synthetic functions.

**Reasoning**

Absolute timings are noisy. A revision-paired protocol makes performance claims reproducible and catches regressions that correctness fixtures cannot.

**Novelty/overlap — `new`**

No current Better TypeScript script or test is a revision-aware performance comparator. `scripts/check.sh` runs correctness, build, and vulnerability gates only.

**Example links**

- Effect's isolated type-performance baseline: [`typeperf/README.md` lines 1–33](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/effect/typeperf/README.md#L1-L33).
- Its cross-revision protocol records SHAs, compiler version, and fixture hash: [lines 62–83](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/effect/typeperf/README.md#L62-L83).
- Runtime comparisons alternate order, retain raw results, and use paired statistics: [`runtimeperf/README.md` lines 122–141](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/effect/runtimeperf/README.md#L122-L141).

**Observed evidence**

Effect maintains both deterministic type-performance and paired runtime-performance protocols. Better TypeScript has no equivalent harness.

**Inference**

The same revision-aware shape can measure linter work and keep performance review evidence repeatable.

### 3. Compare packed npm and native binary size against the base revision

**Recommendation**

Use one local/CI comparator to build base and head, then report bytes and percentage changes for every `.tgz` and native executable. Publish the report as an artifact first; add a threshold only after collecting a baseline.

**Better TypeScript applicability**

The project ships four native binaries plus a launcher. These are the consumer-visible size units, not a JavaScript bundle.

**Reasoning**

A base/head comparison exposes accidental binary or payload growth and is reproducible locally.

**Novelty/overlap — `new`**

Existing npm tests assert the exact archive file set and executable mode, but do not compare artifact bytes across revisions.

**Example links**

- Effect builds both revisions and uploads a comparison: [`check.yml` lines 74–107](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/.github/workflows/check.yml#L74-L107).
- Its local wrapper uses a detached base worktree: [`bundle-compare.sh` lines 4–42](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/scripts/bundle-compare.sh#L4-L42).
- Its reporter computes byte and percentage deltas: [`Reporter.ts` lines 99–139](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/bundle/src/Reporter.ts#L99-L139).

**Observed evidence**

Effect uses the same comparison path locally and in CI. Better TypeScript explicitly packs and tests five archives but has no revision-size check.

**Inference**

A tarball-and-binary comparator would adapt the technique to Better TypeScript's actual distribution contract.

### 4. Automate a non-cancelable, provenance-enabled release with consumer-impact fragments

**Recommendation**

Keep the current resumable package publishing scripts, but orchestrate them from a non-cancelable release job with minimal OIDC/write permissions and npm provenance. Require a small checked-in fragment for user-visible rule, diagnostic, CLI, configuration, or package changes.

**Better TypeScript applicability**

The project has a documented manual five-package release and one published tag. Automation can preserve platform-first, launcher-last ordering while making release state and notes explicit.

**Reasoning**

Package publication should not be interrupted after some immutable versions exist. Consumer-impact fragments keep release notes tied to the changes that need them.

**Novelty/overlap — `partial/extension`**

`scripts/publish-npm-release.sh`, `publish-npm-package.sh`, `npm/npm_test.go`, and `docs/npm-distribution.md` already provide clean-worktree, pack/smoke, platform-first, launcher-last, and safe-resume behavior. Missing pieces are hosted non-cancelable orchestration, trusted publication, provenance, and a release-note input.

**Example links**

- Effect's change classification before requiring a fragment: [`changesets/SKILL.md` lines 6–30](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/.agents/skills/changesets/SKILL.md#L6-L30).
- Its release workflow is non-cancelable and grants explicit write/OIDC permissions: [`release.yml` lines 1–43](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/.github/workflows/release.yml#L1-L43).
- Published packages request npm provenance: [`package.json` lines 69–72](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/effect/package.json#L69-L72).

**Observed evidence**

Effect applies all three practices. Better TypeScript's release logic is already testable and resumable, but it is manual and has no release fragments or hosted publish workflow.

**Inference**

A thin workflow over the existing scripts would reduce partial-release and credential risk without rewriting packaging.

## Rejected and merged decisions

### Lint-rule candidates

| Scan candidate | Decision | Reason |
| --- | --- | --- |
| 1. TypeScript extensions | **Accepted: new** | Concrete enforced policy, strong source use, compiler-aware detector, and no current import-suffix rule. |
| 2. Barrel value imports | **Rejected/deferred: new but not a credible built-in today** | The source policy depends on configured package regexes. Better TypeScript passes `nil` options to built-ins, and `docs/project-local-custom-rules.md` says rule options are not configurable. An unconditional package-root/index ban is not sound because a root can be the intended API and subpaths may not be exported. Keep it project-local or revisit after typed rule options exist. |
| 3. `@internal` export hygiene | **Accepted in narrowed form: partial/extension** | Public signature leakage is uncovered. General re-exports and part of unused-export hygiene overlap existing rules. |
| 4. BigInt constructor compatibility | **Rejected: redundant with compiler** | TypeScript already emits TS2737 for bigint literal syntax below ES2020, while Effect itself targets ES2022. Above the target threshold, the claimed compatibility need disappears. The source fixer can also change large values by converting digits through a rounded Number before `BigInt`; a safe general fixer would need a string. The novel style policy is not credible enough for Better TypeScript. |
| 5. Suppression explanations | **Rejected: already covered** | `require-because-in-comments` scans every line/block comment and reports it unless it contains the standalone word `because`; bare `@ts-ignore` and `@ts-expect-error` comments therefore already fail under a stricter rationale policy. Its implementation, fixture, test, and docs were inspected. |
| 6. Double assertions | **Rejected: already covered** | The Effect scan found 103 `as unknown as` occurrences across 43 production-source files, including adapter casts in [`Transform.ts` lines 55–69](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/doctest/src/Transform.ts#L55-L69) and [`Plugins.ts` lines 155–172](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/packages/tools/bundle/src/Plugins.ts#L155-L172). In the live workspace, `internal/rules/unsafe_casts/unsafe_casts.go` reports a checker-resolved `unknown` source asserted to a concrete type, `internal/rules/unsafe_casts/testdata/semantic_violation.ts` includes `directValue as unknown as string`, `rule_test.go` expects that violation, and `docs/rules/unsafe-casts.md` documents the behavior. The cited pattern is already covered. |
| 7. Validate asserted `JSON.parse` | **Accepted in narrowed form: partial/extension** | The existing rule has the policy but uses name-only matching and accepts any decoder anywhere in the function. The accepted work improves symbol, type, and value relation and adds the missing focused fixture. |
| 8. Lookup non-null assertions | **Rejected: already covered** | `no-non-null-assertion` reports every `!`, including `Map.get(...)!` and indexed access. `prefer-effect-index-access` also reports direct array/tuple indexing before `!` is considered. Both implementations, tests, fixtures, and docs were inspected. |
| 9. Prefer `satisfies` | **Rejected: insufficient target evidence** | The linked evidence shows good `satisfies` uses, not an observed unsafe literal assertion that the proposed detector could safely replace. Repository searches found literal assertions that often intentionally widen an accumulator or add an index signature; `satisfies` would not preserve that behavior. The rule is plausible in theory but does not meet the concrete-observed-pattern contract here. |

### Other ideas

| Scan candidate | Decision | Reason |
| --- | --- | --- |
| 1. Revision-aware performance | **Accepted: new** | Clear architectural value and no current comparator. |
| 2. Documentation examples in CI | **Accepted: new** | Direct gap between the 132 baseline public pages and separate fixtures. The live final-review workspace has 133 pages after the concurrent addition. |
| 3. npm PR snapshots | **Rejected/deferred** | Better TypeScript has no normal PR check workflow or demonstrated preview-consumer demand. Five coordinated public preview packages add approval, retention, and supply-chain surface; current packed-tarball install tests already prove the local path. Reconsider after ordinary PR CI and concrete preview demand exist. |
| 4. Distribution size comparison | **Accepted: new** | Current archive-shape tests do not detect byte growth. |
| 5. Untrusted/privileged workflow split | **Merged into size reporting and release automation** | Better TypeScript has no PR commenter today. Treat the permission split, source validation, and bounded artifact parsing as required constraints if a size report gains comments or another workflow consumes untrusted artifacts, not as a standalone project. Effect's evidence is valid: [`check.yml` lines 9–25](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/.github/workflows/check.yml#L9-L25) and [`bundle-comment.yml` lines 1–69](https://github.com/Effect-TS/effect/blob/145d8e1013220425b8edf34f7011c73f73e1cdcf/.github/workflows/bundle-comment.yml#L1-L69). |
| 6. Release fragments/non-interruptible publish | **Accepted: partial/extension** | Existing local release logic is strong; hosted orchestration, provenance, and release-note inputs are novel. |
| 7. Packed payload contract | **Rejected: already covered** | `npm/npm_test.go` packs all packages, checks exact tar entries and executable modes, checks manifest relationships/notices, installs the launcher and host package, and launches the real linter. `scripts/test-npm-packages.sh` also smoke-tests an installed tarball. This is already an explicit tested contract. |
| 8. Generated shipped agent docs | **Rejected: weak incremental value** | Better TypeScript already has `skills/better-typescript/SKILL.md`, canonical per-rule docs, and an instruction to update skills after behavior changes. The Effect evidence proves its own package workflow, but no evidence shows Better TypeScript npm consumers need a generated duplicate catalog. Shipping it would add another public payload and freshness contract. |

## Coverage and limits

- The scan adjudicated all 9 lint candidates and all 8 non-rule candidates found by the two source scans.
- The source scans were targeted, not exhaustive. Pattern counts cover the production TypeScript files selected by each scan at the pinned revision.
- All 61 candidate links were commit-pinned, existed at the revision, and had valid line ranges. Accepted examples were read at the cited lines.
- Better TypeScript overlap started from the complete 132-rule baseline package, catalog, and public-doc inventory. The live final-review workspace has 133 rule packages and 133 detail pages after the concurrent `prefer-effect-object` addition. The concurrent `unsafe-casts` behavior was included when the double-assertion candidate was refreshed. The closest code, tests, fixtures, scripts, package files, and docs were read for each decision.
- The scan did not run Effect builds, tests, or benchmarks. It did not prototype the proposed Better TypeScript checks.
- The Effect checkout was read-only and clean. No source-repository file was changed.
