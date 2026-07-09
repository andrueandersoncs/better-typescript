# Extensibility Plan — user fleets as `ReportWiring`

## Context

ADR-0005 wanted the kernel as the product and detector fleets as user code. ADR-0006 deleted the registry/id/matcher machinery that ADR-0005's `Registry.make` hung on, but left the composition seam intact: a detector is a function producing an Effect `Stream`; the report graph is ordinary function application.

That seam already exists in-library:

- `ReportWiring = { rules, helpers, advice }`
- `reportFromWiring(wiring)` / `watchReportFromWiring(wiring)`
- tests already inject custom wirings (`helperInfluencedWiring`, `probeWiring`)

What is missing is the **product boundary**:

1. The CLI hard-closes over `defaultWiring` (`src/index.ts` → `watchReport`).
2. `package.json` is private/bin-only — no `exports`, no public authoring surface.
3. End users cannot import `RuleCheck` constructors, advice helpers, or the reference preset as a library.
4. There is no `better-typescript.config.ts` load path.

This plan opens the tool fully: end users write TypeScript that **implements** new signals (`RuleCheck` / advice derivations returning `Stream`s) and **consumes** existing signals by wiring those streams into a `ReportWiring`. All built-in rules, advice, and detectors remain consumable; the tool stays fully extensible without reviving ids, catalogs, or dynamic plugin discovery.

Settled with user:

- **Config surface**: `better-typescript.config.ts` at the project root (ADR-0005 shape), exporting a `ReportWiring`.
- **Depth**: rules + advice + wiring (full graph authorship).
- **Packaging**: single package with export paths (kernel + preset), not a package split.
- **Validation**: minimal — duplicate rule/helper names → exit 2; missing prose-name lookups stay silent `Stream.empty` (today's semantics).
- **Doc**: this plan at repo root; ADR-0009 when implementing.

## Target ontology (unchanged; newly published)

| Concept | Realized as | User-facing? |
| --- | --- | --- |
| Signal | `Stream.Stream<A, Error>` — used directly | yes (consume / produce) |
| Rule | `RuleCheck = Stream<AstNodeElement> => Stream<Detection>` | yes (author + wire) |
| Helper | `NamedRuleCheck` in `wiring.helpers` — runs, feeds advice, no rule leaf | yes |
| Advice | `(rules, helpers) => Stream<AdviceElement>` or smaller stream transformers composed inside | yes (author + wire) |
| Wiring | `ReportWiring` — the fleet | yes (the config export) |
| Leaf / report | `watchReportFromWiring` / `reportFromWiring` | yes (CLI uses loaded wiring; library keeps both) |
| Preset | today's `defaultWiring` + named rule/advice exports | yes (spread / cherry-pick / ignore) |

Terms that stay retired: detector ids, registry, matcher language, roles, severities, suppressions, dynamic plugin discovery, generated style guide.

Slogan (unchanged): **rules see the program, advice sees signals.** Composition is code.

## Constraints

### Must hold

1. **ADR-0006 ontology**: no invented `Detector`/`Signal` types; no ids/catalog; names are prose at wiring sites (`NamedRuleCheck.name`).
2. **ADR-0007 continuous product**: CLI stays watch-only; snapshot `report` remains library/test surface.
3. **ADR-0008 NDJSON default**: event schema unchanged; `--pretty` unchanged.
4. **No dynamic plugin discovery**: config is an explicit TypeScript module the repo owns and reviews (ADR-0005 security stance). No `extends` chains, no package-name resolution of rules.
5. **No suppressions / severities / per-rule options**: a check is present or absent in the wiring.
6. **Determinism**: same wiring + same programs → byte-identical events (wiring order is leaf order).
7. **Zero-config default**: absence of `better-typescript.config.ts` → today's `defaultWiring` (exit 0 path unchanged).
8. **Self-hosting**: this repo keeps no config (or an equivalent that equals `defaultWiring`); bounded `timeout 10 npm run dev` still prints `No signals`.
9. **Exit codes**: load/compile/validation failures → exit 2; successful watch stream → exit 0.
10. **ADRs 0001–0008 immutable**; ADR-0009 records this decision when implementing.

### Consciously not revived from ADR-0005

- `Registry.make`, mention DAG, orphan-signal checks, example-admission harness as load gates.
- Generated per-fleet style guide / `rules` subcommand.
- Finding-stream access restrictions as a typed wall — under ADR-0006, advice already sees signals by construction; rules still only see `AstNodeElement` streams.

## Contracts (normative — to ship)

### Package exports (single package)

```jsonc
// package.json (illustrative)
{
  "name": "better-typescript",
  "type": "module",
  "bin": { "better-typescript": "./dist/index.js" },
  "exports": {
    ".": "./dist/kernel.js",
    "./preset": "./dist/preset.js",
    "./package.json": "./package.json"
  },
  "peerDependencies": {
    "typescript": "^5.0.0 || ^6.0.0"
  },
  "dependencies": {
    "effect": "…",
    "@effect/cli": "…",
    "@effect/platform-node": "…",
    "jiti": "^2" // config .ts loader for the published bin
  }
}
```

- **`better-typescript` (kernel)**: authoring + composition types/helpers only — no built-in fleet constants required to author a custom wiring.
- **`better-typescript/preset`**: named `RuleCheck`s, named advice derivations, `defaultWiring`, and small wiring helpers (`namedRuleCheck`, `ruleSignal`, …).

Exact file split is an implementation detail; the public surface is the export map, not `src/` paths.

### Kernel surface (minimum)

```ts
// better-typescript — authoring + composition
export type {
  RuleCheck,
  RuleContext,
  ProgramContext,
  AstNodeElement,
  Subscription,
  NodeHandler,
  FileHandler
}
export {
  // rule authoring
  nodeCheck,
  fileCheck,
  nodeSubscriptions,
  fileSubscriptions,
  combineAll,
  withProgramIndex,
  checkFromSubscriptions,
  // domain data
  Location,
  Detection,
  detection,
  locateNode,
  // advice building blocks
  AdviceElement,
  NamedDetection,
  namedDetection,
  collectSignals,
  deriveSignals,
  byFile,
  countSummary,
  parentDirectories,
  evidenceItem,
  evidenceFromCounts,
  evidenceOrder,
  adviceLocation,
  collidingLines,
  dominantRuleEvidence,
  filterFallbackAdvice,
  // composition
  NamedRuleCheck,
  RuleSignals,
  ReportWiring,
  namedRuleCheck, // promote today's private ctor
  makeWiring, // smart constructor: reject duplicate names within rules / within helpers
  ruleSignal, // (signals) => (name) => Stream<Detection>  — today's ruleSignalElements
  // runners (library)
  reportFromWiring,
  watchReportFromWiring,
  runRuleCheckOnProject
}
```

Optional later (not required for v1 extensibility): re-export `ReportEvent` / key schemas for typed consumers of NDJSON.

### Preset surface (minimum)

```ts
// better-typescript/preset
export * as rules from "./rules" // or named exports of every RuleCheck
export * as advice from "./advice" // every advice derivation
export { preferCurriedDataLastFunctions } // helper
export { defaultWiring, defaultAdvice, reportedRules, helperRules }
```

Users compose:

```ts
// better-typescript.config.ts
import {
  makeWiring,
  namedRuleCheck,
  filterFallbackAdvice,
  ruleSignal
} from "better-typescript"
import { rules, advice, defaultWiring } from "better-typescript/preset"
import { Stream } from "effect"
import { myRule } from "./detectors/myRule.js"
import { myAdvice } from "./detectors/myAdvice.js"

const extra = namedRuleCheck("acme/no-raw-sql", myRule)

export default makeWiring({
  rules: [...defaultWiring.rules, extra],
  helpers: defaultWiring.helpers,
  advice: (ruleSignals, helperSignals) => {
    const elementsOf = ruleSignal(ruleSignals)
    const preset = defaultWiring.advice(ruleSignals, helperSignals)
    const mine = myAdvice({
      noThrow: elementsOf("no-throw"),
      mine: elementsOf("acme/no-raw-sql")
    })
    return Stream.merge(preset, mine) // or explicit concat / filterFallbackAdvice as needed
  }
})
```

Cherry-pick / replace = omit from the `rules` array and add your own — never shadow by duplicate name (`makeWiring` rejects duplicates).

### Config module contract

1. Resolve `better-typescript.config.ts` under `--project` (else cwd). Only that filename for v1 (no `package.json` field).
2. Load with **jiti** (`createJiti(import.meta.url).import(path, { default: true })`) so the published `node dist/index.js` bin can execute user TypeScript without requiring the user to run under `tsx`.
3. Accepted export shapes (first match):
   - `default` export is a `ReportWiring`, or
   - `default` export is a zero-arg function returning `ReportWiring`, or
   - named export `wiring` is either of the above.
4. Pass through `makeWiring` (duplicate-name check). Shape check is structural: `rules`/`helpers` arrays of `{ name: string, check: function }`, `advice` is a function — not a revived registry.
5. Absence → `defaultWiring`. Load/compile/validation errors → stderr + exit 2.
6. Threat model: config is reviewed user code (build-script equivalent). No sandbox.

### CLI change

```ts
// src/index.ts (conceptual)
const wiring = yield* loadWiring(options.project) // Option → defaultWiring
const events = watchReportFromWiring(wiring)(workspace, watchOptions)
```

`watchReport` / `report` remain as aliases over `defaultWiring` for tests and the preset.

### `makeWiring` law

```ts
export const makeWiring = (wiring: ReportWiring): ReportWiring => {
  // within wiring.rules: unique names
  // within wiring.helpers: unique names
  // same name in rules AND helpers is ALLOWED (separate lookups today) but
  // SHOULD be documented as a footgun; v1 does not reject cross-array overlap
  // missing advice lookups remain Stream.empty
}
```

Duplicate → throw / Effect fail with the colliding names listed → CLI exit 2.

## Approach

### Step 0 — Baseline

1. Read rule modules + `repos/effect/` Stream idioms (AGENTS.md).
2. Confirm current injectability: `tests/report.test.ts` / `tests/watch.test.ts` custom wirings still green.
3. Snapshot public intent: list every symbol Step 1 will export (this plan's Contracts).

### Step 1 — Publishable surface (no CLI behavior change yet)

1. Promote `namedRuleCheck` to an exported constructor.
2. Add `ruleSignal` (export of today's `ruleSignalElements`).
3. Add `makeWiring` with duplicate-name rejection + unit tests.
4. Introduce `src/kernel.ts` and `src/preset.ts` (or equivalent) that re-export the Contracts surface; keep `src/detectors/report.ts` as the composition home — avoid a second wiring implementation.
5. Move `defaultWiring` / `reportedRules` / `helperRules` / `defaultAdvice` behind the preset entry (they may physically stay in `report.ts` and be re-exported).
6. Wire `package.json` `exports`, `peerDependencies.typescript`, and ensure `tsc` emits the entrypoints into `dist/`.
7. Keep `private: true` until a deliberate publish; exports still enable local `file:` / workspace consumers and document the boundary.

### Step 2 — Config loading

1. Add `src/project/loadWiring.ts` (or `src/config/loadWiring.ts`): resolve path, jiti-import, normalize export, `makeWiring`.
2. Add `jiti` dependency.
3. Unit tests with fixture configs:
   - missing file → `defaultWiring`
   - default export wiring with one extra rule → that rule's leaf appears
   - duplicate names → error
   - syntax/throw in config → error
   - `default` as zero-arg factory works
4. Do not execute user configs against the real watch host in unit tests; feed the loaded wiring into `reportFromWiring` / `watchReportFromWiring` with existing harnesses.

### Step 3 — CLI cutover

1. `src/index.ts`: load wiring before `watchReportFromWiring`.
2. Keep stderr status lines; stdout event stream unchanged.
3. Smoke:
   - no config → identical to today's default fleet
   - config adding a probe rule on a fixture project → probe events
   - bad config → exit 2

### Step 4 — Authoring docs + examples

1. **README**: replace the non-goal "no custom third-party rules" framing with ADR-0005's corrected stance — no *dynamic* discovery; fleets are explicit config modules. Document:
   - kernel vs preset imports
   - config resolution
   - minimal custom-rule example
   - cherry-pick / extend preset example
   - advice that consumes preset signals by prose name
2. **Example config** in-repo (e.g. `examples/extend-preset/better-typescript.config.ts`) — not loaded by self-host unless copied; kept as documentation.
3. **`.claude/commands/implement-rule.md`**: add the external-author path (import from `better-typescript`, wire in *their* config) alongside the in-repo path (`src/rules` + preset arrays).
4. **ADR-0009** (`adrs/0009-user-fleets-are-report-wiring.md`): decision = publish kernel/preset exports + config module exporting `ReportWiring`; context = ADR-0005 intent under ADR-0006 ontology; consequences = jiti loader, `makeWiring` duplicates, silent missing lookups retained, no registry revival. Supersedes ADR-0005's `Registry`/`FindingOf` mechanics; preserves its "fleet is user code" and "no dynamic plugins" laws.

### Step 5 — Verification

1. `npm run typecheck` / `npm test`.
2. Bounded self-host: `timeout 10 npm run dev` → `No signals`.
3. Extensibility acceptance:
   - Fixture config that **only** wires `noThrow` → only that rule's signals (plus empty advice) on a throw fixture.
   - Fixture config that spreads `defaultWiring.rules` and appends a custom rule → custom leaf present; preset leaves unchanged.
   - Custom advice consuming `elementsOf("no-mutation")` fires on the mutation fixture.
   - Duplicate name in config → exit 2 with names in the error.
   - Invalid TS config → exit 2.
4. Grep guardrails (zero matches in public docs for revived concepts): `Registry.make`, `FindingOf`, `detectorId`, "plugin discovery".
5. Leave uncommitted on the current branch (AGENTS.md).

## Critical files & anchors

- `src/detectors/report.ts` — `ReportWiring`, `NamedRuleCheck`, `defaultWiring`, `defaultAdvice`, `ruleSignalElements` (private), `reportFromWiring`
- `src/detectors/watch.ts` — `watchReportFromWiring`, `watchReport = …(defaultWiring)`
- `src/index.ts` — CLI hard-wires `watchReport` today
- `src/rules/ruleCheck.ts` / `src/detectors/rule.ts` — rule authoring
- `src/detectors/summary.ts` / `src/detectors/location.ts` — advice/domain helpers
- `src/advice/*.ts` — preset advice derivations (stream in → stream out)
- `package.json` — bin-only; needs `exports` + `jiti` + `typescript` peer
- `tests/report.test.ts`, `tests/watch.test.ts` — existing custom-wiring proofs
- `adrs/0005-…` (intent), `0006-…` (ontology), `0007-…` / `0008-…` (product) — immutable; 0009 records the open

## Assumptions & contingencies

- **Prose names are the only identity.** Advice selects upstream signals by string (`"no-mutation"`). Renaming a preset rule is a breaking change for user advice that hard-codes that string — document it; do not add ids to "fix" it.
- **Silent empty streams on missing names stay.** Stricter static dependency declarations are a future opt-in, not v1.
- **Cross-array name overlap (rule vs helper) stays allowed** to avoid breaking the mental model of separate lookups; document the footgun. Revisit if real configs collide.
- **jiti is the config loader** (ESLint's pattern for `eslint.config.ts`). Native Node type-stripping may eventually replace it; keep the load behind `loadWiring` so the engine is swappable.
- **`typescript` peer dependency**: user rules call checker APIs; version skew is a support surface — document a supported range aligned with this repo (`^5 \|\| ^6` or whatever `package.json` pins at implement time).
- **Advice merge semantics** in user configs are ordinary Effect `Stream` combinators — the kernel does not invent an advice registry or auto-topo-sort. Users who need fallback suppression call `filterFallbackAdvice` explicitly (as `defaultAdvice` does).
- **Publishing** (`private: false`, npm release) is out of scope for the functional cutover; export paths and local consumption are in scope.
- **Performance** remains non-gating: every wired check still full-recomputes per batch (ADR-0007). Large user fleets are the user's cost.
- **Security**: no sandbox; config code runs in-process with the analyzer's privileges.

## Non-goals (v1)

- Dynamic plugin discovery / `extends` / config strings resolved to packages.
- Severities, suppressions, per-rule options.
- Reviving matcher language, strata scheduler, or `Registry`.
- Generated style guide for composed fleets.
- Multi-file config search paths beyond `better-typescript.config.ts` at the project root.
- Hot-reload of the config module itself (restart the CLI to pick up fleet edits).
- Separate `@better-typescript/kernel` npm package (single package with export paths only).
