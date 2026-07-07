# Concept Unification Plan — plain streams and functions (final)

## Context

Reorganize the project around its crystallized core: **detection is a function producing an Effect `Stream`; the stream is the signal; the tool's output is the direct output of the LEAF streams of the graph** — advice and violation hints are just text emitted by streams that consume the upstream streams they need in order to fire. No `Detector`/`Signal`/element/`Presentation` types, no roles, no exit-code gating, **no ids, no catalog, no generated style guide, no structured wire format**: a detector is named only in the prose its leaf chooses to print. Composition is ordinary function application in ordinary Effect code. The remaining custom data is domain data: `Location` and the small internal records advice folds use. Performance is NOT a gate (fused-dispatch benchmark contract retired); the correctness oracles are the per-rule fixture tests (structured detection sets), the advice threshold tests, and a fixture-level text-equivalence sweep.

This ships the **reactive-ready batch** product (snapshot streams; CLI collects the leaf text once and prints). The continuously-running product (watch sources; changed files re-emit; consumers subscribe to leaf streams over HTTP/stdout) is documented as direction, NOT built — needs separate alignment.

Settled with user: no invented types; no roles; no gating; **no ids/catalog/style guide** — output = leaf-stream text; AST nodes flow through streams; **delete the matcher language**; reactive-ready batch scope; "finding"/"violation" leave the prose — outputs are _signals_ and _advice_; test expectation field drops rule identity entirely.

### Amended during execution (settled in review)

1. **Literal streams throughout**: every detector's _type_ is a stream function, not merely its documented semantics. Rules and advice derivations return `Stream`s; the report is the concatenation of leaf streams; interior signals are replayable snapshot streams (a consumer shared by two derivations recomputes its pure fold).
2. **Rules are first-order stream transformers**: `RuleCheck = (nodes: Stream<AstNodeElement, Error>) => Stream<Detection, Error>`. The program context is NOT a curried argument — it is time-varying in the continuous product, and anything time-varying travels in the stream: every source element carries it as a product (`AstNodeElement = { context, sourceFile, node }`), and rules derive it from the elements (index plans memoized per context identity).
3. **Renames**: `onNode`/`onFile` → `nodeCheck`/`fileCheck` (noun constructors; the event-registration framing died with the dispatcher); `nodeListeners`/`fileListeners` → `nodeSubscriptions`/`fileSubscriptions` (completing listener → subscription); `RuleElement` → `Detection` (the plan's own oracle noun — "detection sets"; "element" named container membership, not meaning). `AdviceElement` stays: advice is a mass noun and "element" is its countifier.

The Contracts section below reflects the amended, shipped shapes. Steps 0–7 record the original execution route and keep their pre-amendment vocabulary.

## Target ontology (documented semantics, minimal types)

| Concept             | Realized as                                         | Notes                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Signal              | `Stream.Stream<A, Error>` — used directly, no alias | `A` is whatever the producing function says                                                                                                                                                                                                                                                                                                                                                             |
| Detector            | a function returning a Stream                       | Rules, advice, sources, formatters — all just functions, realized literally in the types; sources take no upstream streams                                                                                                                                                                                                                                                                              |
| The AST chain       | plain functions in `src/detectors/sources.ts`       | `checkableSourceFiles(project)` → `fileTexts(project)` → `astNodes(project): Stream<AstNodeElement>` where the element is the product `{ context: ProgramContext, sourceFile, node }` — the program context is born with the source stream and travels in it (traversal via `foldAst`; batch resolves from the loaded `Program`)                                                                        |
| Detection functions | stream transformers, internal                       | A rule is `Stream<AstNodeElement> => Stream<Detection>`; a `Detection` is `{ location: Location, message: string, hint: string, data?: … }`. An advice derivation consumes the upstream streams it needs and emits `Stream<AdviceElement>` where an element is `{ location, level: "file"\|"directory"\|"project", title, remediation, evidence }` — plain records, structurally typed, tested directly |
| Leaf nodes          | formatter streams in `src/detectors/report.ts`      | `Stream<string>`: each leaf formats one detection function's output into text blocks (a rule leaf prints its name line, locations, and hint; an advice leaf prints `<path> [<level>] — <title>`, remediation, and evidence lines). Names are PROSE the leaf prints, not data                                                                                                                            |
| The report          | `report(workspace): Stream.Stream<string, Error>`   | The merge of all leaves: advice leaves first (file, directory, project order), then rule leaves in wiring order. The CLI collects and prints; that is the whole product                                                                                                                                                                                                                                 |
| Composition         | function application in `src/detectors/report.ts`   | The dependency "graph" is the code; fallback suppression (`high signal density` fires only where no other file-level advice fired) is an explicit filter in the wiring                                                                                                                                                                                                                                  |
| Aggregation         | `summary.ts` pure folds                             | group by file/directory, counts, dominance, collisions — used inside advice derivations                                                                                                                                                                                                                                                                                                                 |

Terms eliminated: _finding, violation, role, gating, id/detectorId, catalog/registry/fleet-manifest, style guide, examples-as-data (`RuleExample`/`ExampleSnippet`), wire schema (`ReportEntry`), syndrome, diagnosis, interpretation, profile, host, sentence, recognizer, matcher (whole language), stratum, wave, stage, listener (→ subscription), engine/executor, dispatcher, element-for-detections (→ detection), `Detector`/`Signal`/`Presentation` as types_. ("detector"/"signal"/"advice" survive as prose; `ts.*Diagnostic*` API names exempt; `handler` stays; `AdviceElement` stays — countifier for a mass noun.)

## Constraints

### Consciously superseded (record in ADR-0006)

- ADR-0005 "code sees the program, never the finding stream" → plain function application over streams.
- ADR-0003 strata/scheduler; ADR-0002/0005 matcher language; ADR-0001/0003/0004 roles, gating, signal visibility → all retired. ADR-0004 wholly superseded.
- ADR-0003 unified `Finding`/wire format; ADR-0005 registry validation and "the guide is generated from the same definitions the linter enforces" → retired with ids/catalog/guide: output is leaf text; rule knowledge lives in the rule modules' own messages/hints; the `rules` subcommand is REMOVED.
- The fused single-traversal dispatcher AND its benchmark contract are retired; `bench/rules.bench.ts` becomes informational.

### Must hold after the refactor

1. **Determinism**: pure functions; `checkableSourceFiles` in `program.getSourceFiles()` order; `astNodes` in traversal order; leaves merged in wiring order (advice: file<directory<project, each sorted by path; rules: wiring order, elements in emission order). Two runs byte-identical.
2. **Detection sets byte-identical** for all 52 detection functions (51 reported rules + the pipeline-hostile helper): positions and message/hint strings per the per-rule fixture tests, which are the oracle (modulo the sanctioned finding→signal rewording inside advice prose).
3. Within one rule's stream, duplicate locations across workspace projects are deduped by `(path, line, column)` before formatting (replaces today's cross-project dedupe at `src/index.ts:149-152`, which keyed on detector id + position).
4. Advice thresholds and evidence content exactly as pinned in Step 3's table; advice text always includes its evidence lines (the advice module's own discipline, covered by its tests — no kernel check).
5. Exit codes: `0` = report produced (with or without signals); `2` = tool could not run (loading/config errors — today's `setErrorExitCode` semantics unchanged). Exit `1` disappears entirely with gating; errors keep their existing code to avoid a second gratuitous break. No result-based gating.
6. Self-hosting: `npm run dev` on this repo prints exactly `No signals in <root>.`.
7. ADRs 0001–0005 immutable; ADR-0006 records this decision; daemon direction documented, not decided.
8. CLI surface: `--project <dir>`, `--limit <n>`, `--offset <n>` (paging over emitted text BLOCKS — one block per advice emission or per rule group), truncation footer `Showing signals X-Y of Z. Use --offset <n> to see the next page.`; empty result prints `No signals in <root>.`. `--format`, `--detail`, `--signals`, and the `rules` subcommand are REMOVED.

## Contracts (normative — as amended and shipped)

Schema classes for constructed/validated data (the repo's own `prefer-effect-schema-class` rule enforces this under self-hosting); plain interfaces only for shapes never constructed here. Consult `repos/effect/` for `Stream`/`Chunk` idioms (AGENTS.md).

```ts
// src/detectors/sources.ts — the source chain; the program context is born here and travels in the stream
export class ProgramContext … ({ program, checker, projectRoot }) {}
export class AstNodeElement … ({ context: ProgramContext, sourceFile, node }) {}   // the product rules derive from
export const checkableSourceFiles: (project: LoadedProject) => Stream.Stream<ts.SourceFile, Error>
export const fileTexts: (project: LoadedProject) => Stream.Stream<SourceText, Error>
export const astNodes: (project: LoadedProject) => Stream.Stream<AstNodeElement, Error>   // stamps context onto every element

// src/detectors/location.ts — shared data + position math
export class Location … ({ path, line, column }) {}
export class Detection … ({ location, message, hint, data? }) {}   // one detection: what a rule's stream emits
export const locateNode: (context: RuleContext) => (node: ts.Node) => Location
export const detection: (context: RuleContext) => MakeDetection    // stamps location at emission
export const toRelativeFileName …

// src/detectors/rule.ts — a rule IS a stream transformer; authoring stays subscription-based behind one lift
export class RuleContext … ({ program, checker, projectRoot, sourceFile }) {}      // handler-facing, one per file
export class NodeSubscription … ("OnNode", { kinds, handler }) {}
export class FileSubscription … ("OnFile", { handler }) {}
export type Subscription = NodeSubscription | FileSubscription
export type RuleCheck = (nodes: Stream.Stream<AstNodeElement, Error>) => Stream.Stream<Detection, Error>
export const checkFromSubscriptions: (plan: (context: ProgramContext) => ReadonlyArray<Subscription>) => RuleCheck
// The lift derives the context from the elements (plan memoized per context identity — the once-per-context
// index stage), groups adjacently by sourceFile (one context stage per file; every checkable file emits at
// least its root SourceFile node), and applies file subscriptions before node subscriptions per file.
// A rule module exports ONLY its RuleCheck (e.g. `export const noThrow: RuleCheck = nodeCheck(…)`).
// src/rules/ruleCheck.ts authoring: nodeCheck / fileCheck / nodeSubscriptions / fileSubscriptions /
// combineAll (subscription groups) / withProgramIndex.

// src/advice/*.ts — each module exports one derivation: streams in, stream out
//   (inputs: { <name>: Stream<Detection, Error> … } or Stream<NamedDetection, Error>)
//     => Stream.Stream<AdviceElement, Error>
//   where AdviceElement = { location, level: "file" | "directory" | "project", title, remediation, evidence }.
// Internally: collect the upstream signals, apply the pure fold, emit (collectSignals / deriveSignals).
// title/remediation/level are constants closed over inside the module.

// src/detectors/report.ts — the graph: rule signals, leaves, and their concatenation
export class RuleSignals … ({ name, elements: Stream<Detection, Error> }) {}   // a rule's signal + its prose name
export const adviceLeaf: (advice: Stream<AdviceElement, Error>) => Stream.Stream<string, Error>
//   sorted file < directory < project, then path; `${path} [${level}] — ${title}` + fix + evidence lines
export const ruleLeaf: (name: string) => (elements: Stream<Detection, Error>) => Stream.Stream<string, Error>
//   one block per distinct message+hint group: name header, message, `  Hint:`, one `  path:line:column` per detection
export const filterFallbackAdvice: (specific, fallback) => Stream.Stream<AdviceElement, Error>   // fallback suppression
export const reportLeaves: (advice, rules: ReadonlyArray<RuleSignals>) => Stream.Stream<string, Error>
export const report: (workspace: LoadedWorkspace) => Stream.Stream<string, Error>
// Wiring: materialize astNodes ONCE per project into a Chunk (replay via Stream.fromChunk); run each rule's
// stream per project; dedupe on (path,line,column) across projects (constraint 3); rematerialize each rule's
// signal as a replayable snapshot stream. The advice graph consumes those streams by direct function
// application in data-dependency order (imperativeStateManager, sideEffectLaundering, pipelineHostile; then
// highSignalDensity filtered by filterFallbackAdvice; then hotSubsystem, ruleDominance; then systemicHotspots
// on hotSubsystem + FILTERED highSignalDensity) — shared consumption recomputes the pure fold. The report is
// the flatten of [adviceLeaf, ...ruleLeaves in wiring order]. One text block per stream element.

// src/detectors/summary.ts — pure folds + the collect/derive helpers advice is built from
export const byFile / countSummary / dominantRuleEvidence / collidingLines / parentDirectories / evidenceOrder …
export const collectSignals: (signals: Stream<A, Error>) => Effect<ReadonlyArray<A>, Error>
export const deriveSignals: (derive: (elements: ReadonlyArray<A>) => ReadonlyArray<B>) => (signals: Stream<A, Error>) => Stream<B, Error>
```

## Approach

### Step 0 — Prerequisites and baseline (AGENTS.md)

1. Run `npm run dev -- rules` and read the style guide before writing any TypeScript (the subcommand is deleted later, but its content is the last authoritative rule summary); consult `repos/effect/` for `Stream`/`Chunk` idioms.
2. Capture per-fixture baselines for the equivalence sweep (JSON while it still exists): `for d in tests/fixtures/*/; do npm run dev -- --project "$d" --format json > "/tmp/bt-baseline-$(basename "$d").json"; done` (an `eval` loop; ~52 runs).

### Step 1 — Foundations (new modules; old code untouched and still shipping)

Create `src/detectors/location.ts`, `sources.ts`, `rule.ts`, `report.ts`, new `summary.ts` per the contracts. Add `tests/report.test.ts`: the AST chain on a fixture project (element count > 0, order stable across two runs), rule application (probe check over a fixture), advice wiring incl. the fallback filter (reproduce today's `interpretFindings` scenarios: specific file advice suppresses density; `systemic-hotspots` sees the filtered set), leaf text shapes (advice block format; rule block format), block ordering, per-rule location dedupe, and one async source (a plain function returning `Stream.fromIterable` + `Effect.sleep` composed through report-style wiring in the test).

### Step 2 — Port the 52 detection functions (mechanical; fixture tests are the oracle)

- Every rule module `src/rules/<name>.ts` exports its `RuleCheck` directly (`export const noThrow: RuleCheck = onNode(…)`). Handlers keep building message/hint exactly as today, emitting `{ location: locateNode(context)(node), message, hint }` instead of calling `createFinding` (one-line change per emission site). DELETE per-rule `description` strings and `example`/`RuleExample`/`ExampleSnippet` blocks (retired with the guide; fixtures are the executable spec).
- 12 sentence rules (`noAbstractClasses`, `noArraySpread`, `noAsyncFunctions`, `noExplicitAnyReturn`, `noForInLoops`, `noForLoops`, `noForOfLoops`, `noNewError`, `noNonNullAssertion`, `noSwitchStatements`, `noThrow`, `noTryCatch`): rewrite each as a `RuleCheck` via `onNode([its Kind atoms' kinds])` with the predicate hand-inlined and the constant message/hint emitted by the handler — consult `src/rules/matcherRule.ts` `nodeSatisfies` :127-167 (`TextEquals`/`TextIncludes` compare `node.getText(sourceFile)`; `Parent` never satisfies at root; missing `Property` never satisfies; `AtLeast` counts satisfied descendants) BEFORE deleting it.
- `prefer-curried-data-last-functions`: move to `src/advice/preferCurriedDataLastFunctions.ts` (feeds `pipeline-hostile` only); its elements drop message/hint (never rendered).
- `no-mutation`: facets become `data: { target: "shared-state" | "local" | "builtin" }` (confirm exact strings in `src/rules/noMutation.ts`); `tests/noMutation.test.ts:142-147` facet assertions become `data.target` assertions.
- `src/rules/index.ts` shrinks to re-exports of the 51 reported checks in today's registration order (this order IS the rule-leaf wiring order in `report.ts`).

### Step 3 — Port the 7 advice derivations

Evidence content = the require-condition measurements plus any non-zero observations, in declaration order (today's `evaluateSummaryRecognizer` contract, `src/runner/evaluateMatcher.ts:298-301`); labels reproduce today's except `"findings"` → `"signals"`. Thresholds VERIFIED from today's specs — implement exactly these literals:

| Advice (level, title)                                                    | Inputs (wired in report.ts)                                                                            | Fires when                                                                                                                | Evidence lines                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| file, `imperative state manager`                                         | noMutation, preferHashMap, preferHashSet, noMutableArrayMethods, noMutableVariableDeclarations results | ≥8 `no-mutation` elements in the file with `data.target === "shared-state"`                                               | `no-mutation/shared-state` (count) first, then each non-zero observation in declaration order: `no-mutation`, `prefer-hash-map`, `prefer-hash-set`, `no-mutable-array-methods`, `no-mutable-variable-declarations` (`evidenceOrder` applies only inside breakdown/dominance helpers) |
| file, `colliding fixes on shared expressions`                            | all 51 rules' results                                                                                  | ≥2 lines in the file where ≥2 DISTINCT rules each have an element (port `evaluateCollidingLines` incl. per-line evidence) | collision measurements per today's `collisionEvidence`                                                                                                                                                                                                                               |
| file, `pipeline-hostile module`                                          | noNestedCalls results + the preferCurriedDataLastFunctions helper results                              | ≥5 nested-call elements AND ≥5 uncurried elements in the file                                                             | both counts (labels `no-nested-calls`, `prefer-curried-data-last-functions`)                                                                                                                                                                                                         |
| file, `high signal density` (fallback-wired; was `high finding density`) | all 51 rules' results + the other three file-level advice results (for the filter)                     | ≥10 rule elements in the file, emitted only where no other file-level advice fired                                        | `signals: <n>` + per-rule counts largest-first                                                                                                                                                                                                                                       |
| directory, `hot subsystem`                                               | all 51 rules' results                                                                                  | ≥25 rule elements in the directory AND ≥3 files with elements AND directory count × 5 ≥ project count × 3                 | counts, spread, share + per-rule breakdown                                                                                                                                                                                                                                           |
| project, `one rule dominates the run`                                    | all 51 rules' results                                                                                  | ≥25 rule elements project-wide AND some single rule holds ≥2/5 of them across ≥5 files (port `evaluateDominantRule`)      | run size + dominance measurement                                                                                                                                                                                                                                                     |
| project, `systemic hotspots`                                             | hotSubsystem results + FILTERED highSignalDensity results                                              | ≥1 hot-subsystem emission AND ≥2 high-signal-density emissions                                                            | both counts                                                                                                                                                                                                                                                                          |

Titles/remediation: copy verbatim from today's `src/advice/*.ts` (reword only "finding(s)" → signal vocabulary; `high finding density` → `high signal density`). Delete `AdviceSpec`/`advice()`/`adviceFallbackIds`; each module exports only its derivation function; `src/advice/index.ts` re-exports the seven in wiring order.

- Rewrite `tests/interpretFindings.test.ts` → `tests/advice.test.ts`: call each derivation DIRECTLY on constructed element arrays (same scenarios: thresholds above, level ordering, systemic-hotspots over advice); rename `diagnosisIds`→`adviceTitles` (assert on titles now — there are no ids), `directoryDiagnoses`→`directoryAdvice`, rewrite all diagnosis/syndrome titles. DROP the "signal findings never trigger density diagnoses" scenario — structurally impossible (density's inputs are exactly the 51 reported rules' results).

### Step 4 — Cutover: CLI on report; delete the old machinery

1. `src/index.ts`: `analyzeProject` = `loadProject` → `Stream.runCollect(report(workspace))` → paginate blocks (`--limit`/`--offset` over blocks; footer `Showing signals X-Y of Z. Use --offset <n> to see the next page.`) → print; empty → `No signals in <root>.`. DELETE `setFailureExitCode` (`src/index.ts:88-92`) and every result-based exit path; KEEP `setErrorExitCode` (exit 2) via the existing `reportError`. REMOVE `--format`, `--detail`, `--signals` options, the `rules` subcommand, and `runRulesGuideCommand` — the root command takes `{ project, limit, offset }` only.
2. DELETE (no shims): `src/matcher/` dir, `src/runner/` dir, `src/output/` dir ENTIRELY (`formatFindings.ts`, `paginateFindings.ts` — paging reimplements over blocks in index.ts or a small helper in report.ts, `formatRulesGuide.ts`), `src/rules/matcherRule.ts`, `src/rules/traverse.ts` (moved), `src/rules/createFinding.ts` (moved), `src/detectors/types.ts`, `src/detectors/index.ts` (old registry composition), `src/advice/types.ts`, old `summary.ts`, `tests/matcherLanguage.test.ts`, `tests/formatRulesGuide.test.ts`, `tests/ruleExamples.test.ts`, `tests/ruleExamplePrograms.ts`, `tests/rulesIndex.test.ts`, `tests/adviceIndex.test.ts` (registry/guide/example/governance machinery — retired with catalog and guide).
3. Vocabulary sweep: remaining `finding*`/`violation*`/role literals → signal vocabulary (`grep -n '"finding"\|"signal"\|finding\|violation' src tests` enumerates; case-insensitive pass).
4. `bench/rules.bench.ts`: rewrite to time `report` end-to-end over the bench fixtures (informational only). Keep `npm run bench` runnable (`package.json:18`).

### Step 5 — Tests

1. Per-rule tests (52 incl. the helper): each test calls its rule's `RuleCheck` through a small harness (`tests/ruleTestAssertions.ts` rewritten: load fixture → build ProgramContext/RuleContext → apply subscriptions → structured elements). Expected items keep `fileName/line/column/message/hint` and DROP the rule-identity field entirely (each test exercises exactly one function; `ast_edit` removes `ruleId: $V` rows across `tests/*.test.ts`). `tests/preferCurriedDataLastFunctions.test.ts` asserts locations only.
2. `tests/report.test.ts` (Step 1) covers wiring, fallback filter, leaf text, ordering, dedupe.
3. `tests/formatFindings.test.ts` → deleted with the JSON/text formatter; its still-relevant text assertions (advice-first ordering, block shapes, pagination footer) move into `tests/report.test.ts`.

### Step 6 — Docs

1. **README.md**: rewrite — the tool analyzes a TypeScript project and prints signals and advice: "a detector is any function producing an Effect Stream; the stream is its signal; rules see the program (streams of files and AST nodes), advice sees signals; the tool's output is the text emitted by the leaf streams; the CLI never gates (exit 0 = report produced, 2 = tool could not run)"; flags `--project/--limit/--offset`; remove the JSON/rules-subcommand/exit-1-on-findings/suppressions sections. Add **"Direction: continuous analysis"**: watch sources emit infinite streams; changed files re-emit and downstream streams re-derive; consumers subscribe to leaf streams over HTTP/stdout/any protocol; these contracts are that product's seam; building it requires separate alignment.
2. **AGENTS.md** (user-owned; update as part of complete work): the line "Always read the style guide printed by `npm run dev -- rules`…" must change — the subcommand no longer exists. Replace with: "Always read the rule modules in `src/rules/` (each module's emitted message/hint states the rule) before writing TypeScript; run `npm run dev` after changes and keep the output at `No signals`." Flag this edit to the user in the final summary.
3. **`adrs/0006-detection-is-streams-and-functions.md`** (read `skill://documentation-and-adrs` first; house format): decision = this ontology (streams/functions only; leaf-text output; no ids/catalog/guide/wire/roles/gating; matcher deletion; dispatcher+benchmark retirement; prose renames); context = vocabulary sprawl + the composition/stream reframe; consequences = superseded laws (incl. ADR-0005's guide-drift property and README's JSON contract — both retired), text-only CLI, informational bench, style-rule enforcement lives in fixture tests + self-hosting workflow; future = daemon direction, "not decided".
4. **`.claude/commands/implement-rule.md`**: rewrite — implement a `RuleCheck` in `src/rules/<name>.ts` emitting `{ location, message, hint }` via `onNode`/`onFile` + `locateNode`; wire it in `src/rules/index.ts` AND as a leaf in `src/detectors/report.ts` (name string at the wiring site); add fixture + test; verify with `npm test` and `npm run dev` (check OUTPUT; exit code is always 0 on success).
5. Comment sweep: `grep -rin "syndrome\|diagnosis\|diagnoses\|interpret\|stratum\|strata\|wave\|mention\|recognizer\|matcher\|sentence\|listener\|finding\|violation\|role\|catalog\|detectorId" src tests bench README.md .claude` — rewrite every remaining comment/title; slogan: **"rules see the program, advice sees signals"**.

### Step 7 — Verification

1. `npm run typecheck` and `npm test`.
2. `npm run dev` — output exactly `No signals in <repo root>.`, exit 0 (self-hosting; and exit stays 0 when signals exist).
3. **Fixture equivalence sweep** (detection sets survive the rewrite): for each `tests/fixtures/<name>/`, run `npm run dev -- --project tests/fixtures/<name>` (text) and assert every entry in `/tmp/bt-baseline-<name>.json` appears: the `path:line:column` string occurs, and the (case-aware `[Ff]inding→[Ss]ignal`-normalized) `message` occurs; total location-line count in the text equals the baseline finding-role entry count. Implement as one `eval` script looping the fixtures; any miss fails and the port is fixed, not the script. (Baseline advice entries: assert their normalized titles appear when present.)
4. New-behavior smoke:
   - `npm run dev -- --project tests/fixtures/no-throw; echo "exit=$?"` → text blocks with `no-throw` header, `Hint:` line, `src/...:<line>:<column>` locations; **exit=0 despite signals** (gating removed).
   - `npm run dev -- --project tests/fixtures/prefer-curried-data-last-functions` → NO `prefer-curried-data-last-functions` block (helper is unreported; other rule blocks appear, e.g. `no-function-keyword` — its `cases.ts` contains a function expression); exit 0.
   - `npm run dev -- rules` → fails: unknown subcommand. `npm run dev -- --format json` → fails: unknown option.
   - `npm run dev -- --project /nonexistent; echo "exit=$?"` → exit=2 (tool-error path unchanged).
5. Acceptance greps (zero matches): `grep -rin "syndrome\|diagnosis\|diagnoses" src tests bench README.md .claude` · `grep -rni "finding\|violation" src tests bench README.md .claude` · `grep -rn "\bDetector\b\|DetectorRegistry\|detectorId\|\bRoleLookup\b\|\bRuleRole\b\|\bDetectorRole\b\|isFindingDetector\|adviceFallbackIds\|setFailureExitCode\|\bPresentation\b\|NodeReport\|SummaryReport\|hostRule\|HostRuleSpec\|ProgramRecognizer\|SummaryRecognizer\|matcherRule\|MatcherRuleSpec\|FindingOf\|ConditionContext\|InterpretationState\|FileProfile\|interpretFindings\|createFinding\|paginateFindings\|formatFindings\|formatRulesGuide\|RuleExample\|ExampleSnippet\|RuleListener\|NodeListener\|FileListener\|compileRules\|runRules\|--signals\|--detail\|--format" src tests bench`.
6. `npm run bench` runs to completion (informational); `npm run format && npm run format:check`. Leave everything uncommitted on the current branch (AGENTS.md).

## Critical files & anchors

- `src/detectors/types.ts` — everything being replaced: `Detector` :253, `Finding` :89, recognizers :221/:231, listeners :126-137, roles :171-187, `hostRule` :301-321, registry/mentions/strata :323-461, examples :148-167.
- `src/runner/runRules.ts` (:39-43 skip predicate) + `src/rules/traverse.ts` (`foldAst`) — the pieces `sources.ts` absorbs; the rest of `src/runner/` and all of `src/output/` are deleted, not moved (formatAdvice :262-277 and formatGroup :236-260 in `src/output/formatFindings.ts` are the TEXT-SHAPE oracles for the leaves before deletion).
- `src/runner/evaluateMatcher.ts` + `src/runner/interpretFindings.ts` — semantics oracles for advice ports (`evaluateCollidingLines`, `evaluateDominantRule`, `evidenceOrder` :59-62, `parentDirectories` :51-57, fallback/`firedFiles` in `runWave`) before deletion.
- `src/rules/matcherRule.ts` — `nodeSatisfies` :127-167, oracle for the 12 sentence-rule rewrites before deletion.
- `tests/ruleTestAssertions.ts` — the per-rule harness to rewrite against RuleChecks (drop the rule-identity field).

## Assumptions & contingencies

- **Ids, catalog, style guide, wire format, `rules` subcommand, `--format`/`--detail`, examples-as-data, and governance/registry tests are removed** (user decision + direct consequences): output is leaf text; names are prose at wiring sites; fixtures are the executable spec; a forgotten wiring is caught by review and the fixture equivalence sweep, not by a manifest. If the user later wants machine-readable output again, that is a new leaf (a JSON-formatting stream), not a revival of ids.
- **Collapse behavior is dropped with `--detail`** (my decision, overridable): advice leads; rule blocks always list all locations. If collapse is wanted, it is wiring in `report.ts` (rule leaves take the advice results and elide covered files) — add later without new concepts.
- **AGENTS.md edit** (flagged to user): the `npm run dev -- rules` instruction must change because the subcommand is deleted; replacement text in Step 6.2.
- **"violation"/"finding" leave the prose** — outputs are signals and advice; `high finding density` title → `high signal density`.
- **Performance is not a gate**: `report` shares the traversal by materializing `astNodes` once per project. If batch self-lint becomes unusable (minutes), raise it with measurements; do NOT reintroduce a fused engine unilaterally.
- **Output shape changes on purpose** (text-only, no JSON, no descriptions/good-examples in blocks): equivalence is checked at the detection-set level (fixture sweep + per-rule tests), not byte-level report equality.
- Advice thresholds pinned in Step 3's table (verified against today's `src/advice/*.ts`); if a spec at HEAD disagrees, the source wins — update the table, then port.
- Batch `fileTexts`/`astNodes` read from the already-loaded `Program` (no re-parse); the documented chain (text → root → nodes) is the daemon's seam.
- No new production source; async is proven by a test-level stream function. The daemon is documentation-only and needs separate alignment.
- ADR numbering: next free is 0006; if taken, use the next free. Line numbers are pre-refactor hints; re-read before editing.
