# Extensibility Plan — user fleets as `ReportWiring`

## Status

Implemented. Better TypeScript now exposes explicit user-authored report
wirings without adding a registry, dynamic plugin system, severities,
suppressions, per-rule options, or rule-to-rule dependencies.

The core law is unchanged:

> Rules see the TypeScript program. Advice sees signals. Composition is code.

## Implemented product boundary

The package has two public entrypoints:

| Entrypoint | Purpose |
| --- | --- |
| `better-typescript` | Kernel APIs for rule authoring, advice authoring, wiring composition, validation, and library runners. |
| `better-typescript/preset` | The built-in fleet: preset rules, preset advice, `reportedRules`, `helperRules`, `defaultAdvice`, `defaultWiring`, and preset `report` / `watchReport` runners. |

The physical split is intentional. Consumers import the kernel when authoring a
fleet and import the preset only when they want to extend, cherry-pick, or reuse
the built-in fleet. `src/` paths are not public API.

### Kernel surface

The kernel entrypoint exports the implemented authoring and composition surface:

- rule types and constructors: `RuleCheck`, `RuleContext`, `ProgramContext`,
  `AstNodeElement`, `Subscription`, `NodeHandler`, `FileHandler`,
  `nodeCheck`, `fileCheck`, `nodeSubscriptions`, `fileSubscriptions`,
  `combineAll`, `withProgramIndex`, and `checkFromSubscriptions`;
- detection and location data: `Location`, `Detection`, `detection`, and
  `locateNode`;
- advice data and helpers: `AdviceElement`, `NamedDetection`,
  `namedDetection`, `collectSignals`, `deriveSignals`, `byFile`,
  `countSummary`, `parentDirectories`, `evidenceItem`,
  `evidenceFromCounts`, `evidenceOrder`, `adviceLocation`,
  `collidingLines`, and `dominantRuleEvidence`;
- wiring and runners: `NamedRuleCheck`, `RuleSignals`, `ReportWiring`,
  `namedRuleCheck`, `makeWiring`, `ruleSignal`, `withFallbackAdvice`,
  `reportFromWiring`, `watchReportFromWiring`, and
  `runRuleCheckOnProject`.

### Preset surface

The preset entrypoint exports:

- `rules` namespace for built-in `RuleCheck` values;
- `advice` namespace for built-in advice derivations;
- `preferCurriedDataLastFunctions`, the preset helper rule;
- `reportedRules`, `helperRules`, `defaultAdvice`, and `defaultWiring`;
- `report` and `watchReport` aliases over the default preset wiring.

## Config module contract

The CLI resolves one config file:

```text
<project-directory>/better-typescript.config.ts
```

`<project-directory>` is the `--project` option when present, otherwise the
current working directory. Config resolution does not walk parent directories
and does not read package metadata.

The config module is loaded with `jiti`. Accepted export shapes are:

- default export of a wiring object;
- default export of a zero-argument factory returning a wiring object;
- named `wiring` export of a wiring object;
- named `wiring` export of a zero-argument factory returning a wiring object.

If the file is absent, the CLI uses `defaultWiring` from
`better-typescript/preset`. Load, compile, factory, shape, and validation
failures are startup errors and exit `2`.

The loader performs structural validation instead of introducing a registry:

```ts
{
  rules: ReadonlyArray<{ name: string; check: RuleCheck }>
  helpers: ReadonlyArray<{ name: string; check: RuleCheck }>
  advice: (rules: ReadonlyArray<RuleSignals>, helpers: ReadonlyArray<RuleSignals>) =>
    Stream.Stream<AdviceElement, Error>
}
```

`makeWiring` rejects duplicate names within `rules` and within `helpers`.
Rule/helper cross-array overlap is still allowed because advice receives rule
signals and helper signals as separate lists; configs should avoid overlap to
keep prose-name lookups obvious.

## Runtime model

The config and wiring model is shared by the one-shot and watch runners:

1. The CLI resolves the TypeScript workspace under the project directory.
2. It loads project wiring from `better-typescript.config.ts` or falls back to
   `defaultWiring`.
3. The default CLI mode runs one snapshot report, emits the initial
   `ReportEvent`s (`signal` events or one `empty` event), and exits `0`.
4. `--watch` uses the same wiring with `watchReportFromWiring`: it emits the
   initial report, keeps the process alive, then emits changed `signal` events
   and removed-block `cleared` events for later TypeScript rebuilds.
5. Every rule and helper runs over the current AST-node snapshot or watch batch.
6. Each rule/helper stream is materialized as `RuleSignals` under its prose
   name.
7. Advice receives the materialized rule and helper signal lists.
8. Advice blocks render first; rule blocks render after advice in wiring order.

Self-host verification uses the terminating default: `npm run dev` prints
`Analyzing <repo>.`, emits the initial report, and completes. Bounded watch
verification must pass `--watch` explicitly, for example
`timeout 10 npm run dev -- --watch`, and expect
`Watching <repo> for changes.` before the bound ends the watch process.

Rules and helpers are both `RuleCheck`s. The difference is report position:

- entries in `rules` feed advice and render rule report blocks;
- entries in `helpers` feed advice only and do not render rule report blocks.

Advice selects signals with `ruleSignal(ruleSignals)("prose-name")` or
`ruleSignal(helperSignals)("prose-name")`. Missing names return `Stream.empty`,
which preserves the existing silent-missing semantics.

## Detection deduplication

For each named rule or helper in each batch, collected detections are deduped
before they are exposed to advice or rendered as rule blocks. The dedupe key is
semantic report identity:

- location path;
- line;
- column;
- message;
- hint;
- `data` equality.

The first occurrence wins, preserving deterministic report order while removing
duplicate detections caused by multi-project or repeated upstream traversal.

## Advice layering

Higher-level advice is ordinary Effect stream composition over materialized
signals. The default preset uses this layering:

- specific file advice derives from selected rule/helper signals;
- fallback density advice is filtered through `withFallbackAdvice`;
- directory/project advice derives from named signal streams or from explicitly
  materialized advice streams inside `defaultAdvice`;
- systemic advice is composed explicitly from the preceding advice outputs.

`withFallbackAdvice(specific, fallback)` is the safe public fallback helper. It
collects the specific advice once, emits it first, then emits fallback advice
except file-level fallback for files already covered by file-level specific
advice. Consumers who want all advice streams to emit should compose them
directly with Effect `Stream` combinators.

Rules remain AST-only. Advice consumes signals. There is no rule-to-rule
dependency mechanism.

## Examples

### Minimal custom fleet

```ts
import { Stream } from "effect"
import { makeWiring, namedRuleCheck } from "better-typescript"
import { myRule } from "./rules/myRule.js"

export default makeWiring({
  rules: [namedRuleCheck("acme/my-rule", myRule)],
  helpers: [],
  advice: () => Stream.empty
})
```

### Extend the preset

```ts
import { Stream, pipe } from "effect"
import { makeWiring, namedRuleCheck, ruleSignal } from "better-typescript"
import { defaultWiring } from "better-typescript/preset"
import { myRule } from "./rules/myRule.js"
import { myAdvice } from "./rules/myAdvice.js"

const localRule = namedRuleCheck("acme/my-rule", myRule)

export default makeWiring({
  rules: [...defaultWiring.rules, localRule],
  helpers: defaultWiring.helpers,
  advice: (ruleSignals, helperSignals) => {
    const elementsOf = ruleSignal(ruleSignals)
    const presetAdvice = defaultWiring.advice(ruleSignals, helperSignals)
    const localAdvice = myAdvice(elementsOf("acme/my-rule"))

    return pipe(presetAdvice, Stream.concat(localAdvice))
  }
})
```

### Cherry-pick preset rules

Cherry-picking is explicit array construction. Omit the preset rules you do not
want, add local rules under new prose names, and pass the result to
`makeWiring`. Do not shadow a preset name with a duplicate entry.

## Non-goals

- Dynamic plugin discovery, package-name rule loading, config strings, or
  config inheritance.
- Severities, suppressions, per-rule options, or result-based exit gates.
- A registry, matcher language, scheduler strata, generated style guide, or
  rule catalog separate from the wired arrays.
- Multi-file config search paths beyond the direct project-root
  `better-typescript.config.ts`.
- Hot reload of the config module itself; restart the CLI after editing the
  fleet.
- A separate kernel npm package; the split is by package export path in the
  single package.
