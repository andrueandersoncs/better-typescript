---
description: Implement a better-typescript check in-repo or as an external config
argument-hint: <check description or check-name>
---

Implement the following Better TypeScript check request, including focused
verification for the repository you are changing:

$ARGUMENTS

## What Better TypeScript is

`better-typescript` is an opinionated TypeScript analysis tool. A `Check` is a
stream transformer from the upstream AST-node stream to a stream of `Detection`
values with `location`, `message`, and `hint`. Each node element carries the
program context (`context`, `sourceFile`, `node`), so source checks derive
everything from the AST and type checker.

The runner materializes each named check into one completed `Signal` for the
batch: `{ name, reported, detections }`. `reported` is only report visibility:
reported checks render local detection blocks, while silent checks still run,
still affect watch equivalence, and still feed derivation. `derive` consumes the
completed `Signal[]` and emits aggregate `Advice`.

Report rendering intentionally keeps the serialized report-key tags
`_tag: "rule"` and `_tag: "advice"` for wire compatibility. Treat those as
output vocabulary only, not as authoring or wiring concepts.

Follow the surrounding code exactly: Effect `Option`, `pipe`, curried
data-last helpers, no `function` keyword unless an Effect generator requires it,
and no ad-hoc suppressions, severities, per-check options, dynamic discovery, or
check-to-check dependencies.

## First choose the implementation path

- **In-repo path**: use this when you are modifying the analyzer package itself.
  Add the check under `src/checks/`, export it, and wire it into the preset.
- **External-author path**: use this when you are in a consumer project. Do not
  modify the analyzer package, `node_modules`, or Better TypeScript source.
  Import the kernel and preset entrypoints and wire your check in the consumer's
  `better-typescript.config.ts`.

## In-repo path

1. **Pick the check name.** Derive the kebab-case report name and the camelCase
   source/export name from the request. Confirm no check with that name already
   exists in `src/checks/`.

2. **Study precedent.** Read `src/engine/check.ts`,
   `src/engine/location.ts`, `src/engine/sources.ts`, and 2-3 existing check
   modules whose detection shape is closest to the request.

3. **Write the check** at `src/checks/<camelCaseName>.ts`. Export a `Check`
   built with `nodeCheck(...)`, `fileCheck(...)`, `combineAll(...)`, or
   `withProgramIndex(...)`. Use `locateNode` or `detection` to emit precise
   locations. Give every detection a clear `message` and actionable `hint`.
   Also export `<camelCaseName>Examples` as
   `fixtureRefactorExamples("<kebab-name>")` (a non-empty
   `NonEmptyRefactorExamples`). Do not embed inline example source in the check
   module for in-repo checks.

4. **Wire it into the preset.**
   - Import the check and its examples directly from
     `src/checks/<camelCaseName>.ts` in `src/preset/defaultWiring.ts` (no barrel
     `index.ts`).
   - Add `namedCheck("<kebab-name>", <camelCaseName>, <camelCaseName>Examples)`
     to `defaultChecks` in `src/preset/defaultWiring.ts` when the check should
     render local detection blocks (examples appear under the Hint).
   - Add `silentCheck("<kebab-name>", <camelCaseName>, <camelCaseName>Examples)`
     instead when the check exists only as evidence for `derive` and should not
     render a local block.
   - If aggregate guidance is required, update `defaultDerive(signals)` in
     `src/preset/defaultWiring.ts`. Use `signalOf(signals)("<kebab-name>")` to
     obtain the completed detection stream, compose with `deriveSignals(...)`
     and Effect `Stream` combinators, and keep fallback behavior in
     `withFallbackAdvice(...)` when file-level fallback suppression is needed.
   - Do not add a registry, plugin loader, severity, suppression, generated
     guide, compatibility adapter, or alternate config shape.

5. **Create the characterization fixture** under `tests/fixtures/<kebab-name>/`:
   - `tsconfig.json` — copy an existing fixture's config.
   - `src/cases.ts` — code that should emit detections (disallowed corpus).
   - `src/allowed.ts` — similar code that should stay silent (negative tests).
   - Do not treat `allowed.ts` as the "good" rewrite target; it only proves
     non-matches.

6. **Create paired refactor example trees** under
   `tests/fixtures/<kebab-name>/example/`:
   - Layout: `example/<n>/{bad,good}/` where `<n>` is `1`, `2`, …
   - Each of `bad` and `good` is a full mini-project: its own `tsconfig.json`
     plus one or more `.ts` files (multi-file trees and directory structure are
     allowed when the remediation needs them).
   - `bad` must be detected by the check; `good` must stay clean.
   - Reports print every file in each tree as `Bad (path):` / `Good (path):`
     with 4-space indented code under the Hint.
   - `tests/refactorExamples.test.ts` validates that every reported check has
     ≥1 pair and that bad/good sides detect/clean respectively.

7. **Write the test** at `tests/<camelCaseName>.test.ts`, mirroring a current
   per-check test. Use `runCheckOnProject` through the shared assertions in
   `tests/ruleTestAssertions.ts`. Assert each expected disallowed item with its
   exact `fileName`, `line`, `column`, `message`, and `hint`; assert the
   allowed fixture emits no detections. `ruleTestAssertions` does not load
   example trees — characterization expectations stay hardcoded.

8. **Verify, in order:**
   - Run the new targeted test and iterate until it passes. `line` and `column`
     are 1-based.
   - Confirm `tests/refactorExamples.test.ts` still passes for the new fixture.
   - Run the repository typecheck.
   - Run the bounded self-hosting check with `timeout 10 npm run dev`; the
     initial report must stay `No signals`. The command exits `0` when it
     successfully prints a report, even if the report contains signals.

## External-author path

1. **Work in the consumer project.** The config file must be located directly at
   `<project-directory>/better-typescript.config.ts`, where
   `<project-directory>` is the `--project` value or the current working
   directory. Do not add files to the analyzer package.

2. **Import public entrypoints only.**
   - Import defining modules directly:
     `better-typescript/engine/check`, `better-typescript/engine/location`,
     `better-typescript/engine/derive`, `better-typescript/engine/report`,
     and related engine entrypoints for kernel APIs such as `Check`, `Advice`,
     `Detection`, `nodeCheck`, `fileCheck`, `detection`, `locateNode`,
     `deriveSignals`, `namedCheck`, `silentCheck`, `signalOf`, `makeWiring`,
     and `withFallbackAdvice`.
   - From `better-typescript/preset/defaultWiring`, import `defaultChecks`,
     `defaultDerive`, or `defaultWiring`. Import individual checks from
     `better-typescript/checks/<name>` when needed.
   - Never import from `better-typescript/src/...`.

3. **Author the local check** in the config file or a local module imported by
   the config. Build a `Check` from AST and type-checker context exactly as in
   in-repo checks. Emit detections with precise locations, a clear message, and
   an actionable hint.

4. **Wire the consumer fleet explicitly.**
   - To extend the preset, use
     `checks: [...defaultChecks, namedCheck("<name>", localCheck, localExamples)]`.
   - To cherry-pick, construct a new `checks` array from the preset exports and
     omit unwanted entries.
   - Use `silentCheck("<name>", localCheck)` for evidence-only checks that feed
     derivation but must not render a local detection block.
   - Wrap the object in `makeWiring(...)`; duplicate names anywhere in `checks`
     are config errors.

5. **Layer derivation explicitly.** In the config `derive` function, use
   `signalOf(signals)("<prose-name>")` for completed check signals. Compose
   derived `Advice` streams with Effect `Stream` combinators. Use
   `withFallbackAdvice(specific, fallback)` only when fallback file advice should
   be suppressed for files that already received file-level specific advice.
   Source checks must not consume signals; signal fan-in belongs in `derive`.

6. **Author paired examples inline** with `exampleSnippet` /
   `refactorExample` (or `refactorExampleTrees` for multi-file pairs). External
   configs do not use `tests/fixtures/.../example/`; that layout is for the
   analyzer package's own checks via `fixtureRefactorExamples`.

7. **Copyable external config skeleton:**

```ts
import { Stream, pipe } from "effect"
import { Advice } from "better-typescript/engine/derive/data"
import {
  adviceLocation,
  deriveSignals,
  evidenceItem
} from "better-typescript/engine/derive"
import type { Detection } from "better-typescript/engine/location"
import {
  exampleSnippet,
  refactorExample
} from "better-typescript/engine/example"
import {
  makeWiring,
  namedCheck,
  signalOf
} from "better-typescript/engine/report"
import {
  defaultChecks,
  defaultDerive
} from "better-typescript/preset/defaultWiring"
import { localCheck } from "./checks/localCheck.js"

const localExamples = [
  refactorExample(
    exampleSnippet("src/main.ts", `/* bad */`),
    exampleSnippet("src/main.ts", `/* good */`)
  )
] as const

const local = namedCheck("acme/local-check", localCheck, localExamples)

const localAdvice = (
  detections: Stream.Stream<Detection, Error>
): Stream.Stream<Advice, Error> =>
  deriveSignals((elements) =>
    elements.length === 0
      ? []
      : [
          new Advice({
            location: adviceLocation("project"),
            level: "project",
            title: "local check findings",
            remediation: "Apply the local project convention.",
            evidence: [evidenceItem("detections", elements.length)]
          })
        ]
  )(detections)

export default makeWiring({
  checks: [...defaultChecks, local],
  derive: (signals) => {
    const elementsOf = signalOf(signals)
    const presetAdvice = defaultDerive(signals)
    const consumerAdvice = localAdvice(elementsOf("acme/local-check"))

    return pipe(presetAdvice, Stream.concat(consumerAdvice))
  }
})
```

7. **Verify in the consumer project.** Add or update the consumer's local tests
   when it has a test harness. Run Better TypeScript against the consumer
   project and fix the causes of any emitted signals. Report the check name,
   config file changed, verification performed, and what Better TypeScript
   printed.
