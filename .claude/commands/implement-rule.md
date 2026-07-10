---
description: Implement a better-typescript rule in-repo or as an external config
argument-hint: <rule description or rule-name>
---

Implement the following Better TypeScript rule request, including focused
verification for the repository you are changing:

$ARGUMENTS

## What Better TypeScript is

`better-typescript` is an opinionated TypeScript analysis tool. A rule is a
`RuleCheck`: a stream transformer from the upstream AST-node stream to a stream
of `Detection` values with `location`, `message`, and `hint`. Each node element
carries the program context (`context`, `sourceFile`, `node`), so rules derive
everything from the AST and type checker.

Report wiring turns named rule streams into user-facing rule blocks. Advice
streams consume rule and helper signals to print broader architectural
guidance. Advice consumes signals; rules do not consume signals, advice, or
other rules.

Follow the surrounding code exactly: Effect `Option`, `pipe`, curried
data-last helpers, no `function` keyword unless an Effect generator requires it,
and no ad-hoc suppressions, severities, per-rule options, dynamic discovery, or
rule-to-rule dependencies.

## First choose the implementation path

- **In-repo path**: use this when you are modifying the analyzer package itself.
  Add the rule under `src/rules/`, export it, and wire it into the preset.
- **External-author path**: use this when you are in a consumer project. Do not
  modify the analyzer package, `node_modules`, or Better TypeScript source.
  Import the kernel and preset entrypoints and wire your rule in the consumer's
  `better-typescript.config.ts`.

## In-repo path

1. **Pick the rule name.** Derive the kebab-case report name and the camelCase
   source/export name from the request. Confirm no rule with that name already
   exists in `src/rules/`.

2. **Study precedent.** Read `src/detectors/rule.ts`,
   `src/detectors/location.ts`, `src/detectors/sources.ts`, and 2-3 existing
   rule modules whose detection shape is closest to the request.

3. **Write the rule** at `src/rules/<camelCaseName>.ts`. Export a `RuleCheck`
   built with `nodeCheck(...)`, `fileCheck(...)`, `combineAll(...)`, or
   `withProgramIndex(...)`. Use `locateNode` or `detection` to emit precise
   locations. Give every detection a clear `message` and actionable `hint`.

4. **Wire it into the preset.**
   - Export it from `src/rules/index.ts`.
   - Add `namedRuleCheck("<kebab-name>", <camelCaseName>)` to the preset
     `reportedRules` array in `src/preset/defaultWiring.ts`.
   - If the rule exists only to feed advice and should not render a rule block,
     add it to `helperRules` instead.
   - Do not add a registry, plugin loader, severity, suppression, or generated
     guide.

5. **Create the fixture** under `tests/fixtures/<kebab-name>/`:
   - `tsconfig.json` — copy an existing fixture's config.
   - `src/cases.ts` — code that should emit detections.
   - `src/allowed.ts` — similar code that should stay silent.

6. **Write the test** at `tests/<camelCaseName>.test.ts`, mirroring a current
   per-rule test. Use `runRuleCheckOnProject` through the shared harness in
   `tests/ruleTestAssertions.ts`. Assert each expected disallowed item with its
   exact `fileName`, `line`, `column`, `message`, and `hint`; assert the
   allowed fixture emits no detections.

7. **Verify, in order:**
   - Run the new targeted test and iterate until it passes. `line` and `column`
     are 1-based.
   - Run the repository typecheck.
   - Run the linter on this repo itself and fix the cause of any signal it
     prints. The command exits `0` when it successfully prints a report, even
     if the report contains signals.

## External-author path

1. **Work in the consumer project.** The config file must be located directly at
   `<project-directory>/better-typescript.config.ts`, where
   `<project-directory>` is the `--project` value or the current working
   directory. Do not add files to the analyzer package.

2. **Import public entrypoints only.**
   - From `better-typescript`, import kernel APIs such as `RuleCheck`,
     `nodeCheck`, `fileCheck`, `detection`, `namedRuleCheck`, `makeWiring`,
     `ruleSignal`, `AdviceElement`, and `withFallbackAdvice`.
   - From `better-typescript/preset`, import `defaultWiring`, `reportedRules`,
     `helperRules`, `defaultAdvice`, `rules`, or `advice` as needed.
   - Never import from `better-typescript/src/...`.

3. **Author the local rule** in the config file or a local module imported by
   the config. Build a `RuleCheck` from AST and type-checker context exactly as
   in in-repo rules. Emit detections with precise locations, a clear message,
   and an actionable hint.

4. **Wire the consumer fleet explicitly.**
   - To extend the preset, use
     `rules: [...defaultWiring.rules, namedRuleCheck("<name>", localRule)]`.
   - To cherry-pick, construct a new `rules` array from the preset exports and
     omit unwanted entries.
   - Keep helpers in `helpers`; helpers run like rules and feed advice, but do
     not render rule blocks.
   - Wrap the object in `makeWiring(...)`; duplicate names inside `rules` or
     inside `helpers` are config errors.

5. **Layer advice explicitly.** In the config `advice` function, use
   `ruleSignal(ruleSignals)("<prose-name>")` for rule signals and
   `ruleSignal(helperSignals)("<prose-name>")` for helper signals. Compose
   advice streams with Effect `Stream` combinators. Use
   `withFallbackAdvice(specific, fallback)` only when fallback file advice
   should be suppressed for files that already received file-level specific
   advice.

6. **Copyable external config skeleton:**

```ts
import { Stream, pipe } from "effect"
import {
  makeWiring,
  namedRuleCheck,
  ruleSignal
} from "better-typescript"
import { defaultWiring } from "better-typescript/preset"
import { localRule } from "./rules/localRule.js"
import { localAdvice } from "./rules/localAdvice.js"

const local = namedRuleCheck("acme/local-rule", localRule)

export default makeWiring({
  rules: [...defaultWiring.rules, local],
  helpers: defaultWiring.helpers,
  advice: (ruleSignals, helperSignals) => {
    const elementsOf = ruleSignal(ruleSignals)
    const presetAdvice = defaultWiring.advice(ruleSignals, helperSignals)
    const consumerAdvice = localAdvice(elementsOf("acme/local-rule"))

    return pipe(presetAdvice, Stream.concat(consumerAdvice))
  }
})
```

7. **Verify in the consumer project.** Add or update the consumer's local tests
   when it has a test harness. Run Better TypeScript against the consumer
   project and fix the causes of any emitted signals. Report the rule name,
   config file changed, verification performed, and what Better TypeScript
   printed.
