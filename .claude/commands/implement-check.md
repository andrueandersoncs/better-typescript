---
description: Implement a better-typescript check in-repo or as an external config
argument-hint: <check description or check-name>
---

Implement the following Better TypeScript Check request, including focused verification for the
repository you are changing:

$ARGUMENTS

## What Better TypeScript is

`better-typescript` is an opinionated TypeScript analysis tool. A `Check` declares file and/or
syntax-node subscriptions and emits located `Detection` values with a clear `message` and actionable
`hint`. It reads source and type information, never other Signals.

A `NamedCheck` owns the stable name, reporting policy, executable Check, and lazy refactor examples.
Wiring selects `NamedCheck` values directly. The runner materializes each one as a completed
`Signal`; reported Signals render local blocks, while silent Signals still participate in equality
and feed `derive`. Derivation consumes the completed `Signal[]` and emits aggregate `Advice`.

Serialized report keys retain `_tag: "rule"` and `_tag: "advice"` for wire compatibility. Treat
those as output vocabulary only, not authoring concepts.

Follow the surrounding code exactly: Effect `Option`, `pipe`, curried data-last helpers, no
`function` keyword unless an Effect generator requires it, and no ad-hoc suppressions, severities,
per-Check options, dynamic discovery, or Check-to-Check dependencies.

## First choose the implementation path

- **In-repo path**: use this when modifying this monorepo's built-in fleet. Add one complete
  `NamedCheck` to `packages/checks`, its package-owned examples, its characterization corpus, and
  the direct preset list.
- **External-author path**: use this in a consumer project. Do not modify the analyzer package or
  `node_modules`; author a low-level core Check and compose it in `better-typescript.config.ts`.

## In-repo path

1. **Choose the identity.** Derive the kebab-case stable Check name and camelCase source/export
   name. Confirm neither already exists in `packages/checks/src/checks/`,
   `packages/checks/examples/`, or `tests/fixtures/`.

2. **Study the owning interfaces.** Read `packages/checks/src/defineCheck.ts`,
   `packages/core/src/engine/check/check.ts`, and two or three built-in modules with the closest
   subscription and detection shape. Read their characterization tests and package examples too.

3. **Export one complete NamedCheck.** Add `packages/checks/src/checks/<camelCaseName>.ts` and use
   the narrowest package authoring constructor:
   - `defineCheck(name, kinds, refine, detect)` for node subscriptions;
   - `defineFileCheck(name, detect)` for one file-level handler;
   - `definePlannedCheck(name, plan)` for a custom subscription plan; or
   - `defineSilentPlannedCheck(name, plan)` only for planned evidence that must not render a local
     block.

   Keep matching and detection helpers private. Emit precise locations and actionable prose. Export
   only the resulting `<camelCaseName>: NamedCheck`; do not export a separate raw Check or examples
   value, and do not wrap it again with `namedCheck` in the preset.

4. **Add package-owned refactor examples.** Create at least one numbered pair at
   `packages/checks/examples/<kebab-name>/<pair>/{bad,good}/`, where `<pair>` is `1`, `2`, and so
   on. Each side is a source tree and may contain multiple files or its own `tsconfig.json` when the
   remediation needs project context. The bad tree must trigger the Check and the good tree must be
   clean. The authoring constructor finds these examples by stable name, loads them only when a
   report needs them, and memoizes the result.

5. **Create the characterization corpus.** Add `tests/fixtures/<kebab-name>/tsconfig.json` and
   source files under `tests/fixtures/<kebab-name>/src/`. Put disallowed and allowed syntax in the
   same corpus as useful. Append `// ~detect <columns>` to every line that should report, for
   example `// ~detect 3` or `// ~detect 7,24`; every unmarked line is expected to remain clean.

   Use the exact-assertion escape only when adding the marker would change the Check's own input,
   such as a comment- or whitespace-sensitive Check. Do not keep hand-written line, column, message,
   and hint mirrors merely because an older test used them.

6. **Test through the exported NamedCheck.** Add `tests/<camelCaseName>.test.ts` using
   `assertCheckFixture(<camelCaseName>)` from `tests/ruleTestAssertions.ts`. The shared assertion
   compares marker locations, rejects detections on unmarked lines, and requires every detection to
   carry non-empty prose. For the syntax-sensitive escape, use the existing exact fixture assertion
   helper and explain through test shape—not a compatibility helper—why the marker cannot be
   present.

7. **Enroll it directly.** Import the `NamedCheck` from its defining module in
   `packages/checks/src/preset/defaultWiring.ts` and add that value to `defaultChecks` in the
   intended order. Do not repeat its name, reporting policy, or examples. Update `defaultDerive`
   only when the request requires aggregate Advice; obtain detections with
   `signalOf(signals)("<kebab-name>")` from `@better-typescript/core/engine/signal`.

8. **Keep the architecture closed.** Do not add a registry, generated barrel, plugin loader,
   severity, suppression, per-Check options, compatibility adapter, alternate config shape, or
   test-only production export.

9. **Verify in order.**
   - Run the targeted characterization test.
   - Run `tests/refactorExamples.test.ts` for the package-owned bad/good contract.
   - Run the repository typecheck.
   - Run the bounded self-hosting Check; the initial report must remain empty.

## External-author path

1. **Work only in the consumer project.** Its config lives directly at
   `<project-directory>/better-typescript.config.ts`, where `<project-directory>` is the `--project`
   value or current working directory.

2. **Import public package entrypoints.**
   - Build custom behavior with `nodeCheck`, `fileCheck`, or `checkFromSubscriptions` from
     `@better-typescript/core/engine/check` and types from its `data` subpath.
   - Create detections with `detection` or `locateNode` from the same Check module.
   - Wrap custom Checks with `namedCheck` or `silentCheck`, and construct/configure Wiring with
     `makeWiring`, `mergeWirings`, and `defineConfig`, all from
     `@better-typescript/core/engine/wiring`.
   - Select completed detections with `signalOf` from `@better-typescript/core/engine/signal`;
     import Advice rendering helpers from `@better-typescript/core/engine/report`.
   - Import `defaultWiring` or `defaultChecks` from
     `@better-typescript/checks/preset/defaultWiring`. An individual
     `@better-typescript/checks/<name>` import is already a `NamedCheck` and goes directly in
     `checks`.
   - Never import package `src/` or `internal/` paths.

3. **Author the custom Check.** Use AST and type-checker context only. Emit precise locations, clear
   messages, and actionable hints. Do not consume Signals inside a source Check; fan-in belongs in
   `derive`.

4. **Bind consumer-owned identity and examples once.** Use `namedCheck(name, check, examples)` for a
   locally reported Check or `silentCheck(name, check, examples?)` for evidence-only behavior.
   `examples` is a lazy thunk returning values built with `exampleSnippet`, `refactorExample`, or
   `refactorExampleTrees`.

5. **Compose complete Wiring values.** Put the local `NamedCheck` in one `makeWiring` value. Use
   `mergeWirings([defaultWiring, localWiring])` to extend the preset so both Checks and derive
   functions compose. To cherry-pick built-ins, import their `NamedCheck` values and place them
   directly in a new Wiring without renaming or re-registering them. Duplicate names anywhere in the
   complete `WiringConfig` are errors.

6. **Export a real WiringConfig.** Assign the composed Wiring to one or more workspace-relative
   globs with `defineConfig([{ files, wiring }])`; do not export a bare Wiring.

7. **Use this external config shape:**

```ts
import { Effect } from "effect"
import { exampleSnippet, refactorExample } from "@better-typescript/core/engine/example"
import {
  defineConfig,
  makeWiring,
  mergeWirings,
  namedCheck
} from "@better-typescript/core/engine/wiring"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { localCheck } from "./checks/localCheck.js"

const localExamples = () =>
  [
    refactorExample(
      exampleSnippet("src/main.ts", `/* bad */`),
      exampleSnippet("src/main.ts", `/* good */`)
    )
  ] as const

const localWiring = makeWiring({
  checks: [namedCheck("acme/local-check", localCheck, localExamples)],
  derive: () => Effect.succeed([])
})

const wiring = mergeWirings([defaultWiring, localWiring])

export default defineConfig([{ files: ["src/**/*.ts"], wiring }])
```

8. **Verify in the consumer project.** Run its focused tests, then run Better TypeScript against the
   consumer project. Report the stable Check name, config changed, verification performed, and
   emitted report result.
