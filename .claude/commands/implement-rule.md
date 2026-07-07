---
description: Implement a better-typescript RuleCheck with tests and self-hosting verification
argument-hint: <rule description or rule-name>
---

Implement the following lint rule for this project, including tests, then run the
linter on the project itself via `npm run dev`:

$ARGUMENTS

## What this repo is

`better-typescript` is an opinionated TypeScript analysis tool. A rule is a
`RuleCheck`: a stream transformer from the upstream AST-node stream to a
stream of `Detection` values with `location`, `message`, and `hint`. Each
node element carries the program context (`context`, `sourceFile`, `node`),
so rules derive everything from the stream. Report wiring in
`src/detectors/report.ts` turns those rule streams into user-facing text
through leaf streams; advice streams consume rule signals to print broader
architectural guidance.

Follow the surrounding code exactly: Effect `Option`, `pipe`, curried
data-last helpers, no `function` keyword unless an Effect generator requires it,
and no ad-hoc suppressions.

## Steps

1. **Pick the rule name.** Derive the kebab-case report name and the camelCase
   source/export name from the request. Confirm no rule with that name already
   exists in `src/rules/`.

2. **Study precedent.** Read `src/detectors/rule.ts`, `src/detectors/location.ts`,
   `src/detectors/sources.ts`, and 2-3 existing rule modules whose detection
   shape is closest to the request.

3. **Write the rule** at `src/rules/<camelCaseName>.ts`. Export a `RuleCheck`
   built with `nodeCheck(...)` or `fileCheck(...)`. Use `locateNode` or
   `detection` to emit precise locations. Give every detection a clear
   `message` and an actionable `hint`.

4. **Wire it for execution.**
   - Export it from `src/rules/index.ts`.
   - Add a `namedRuleCheck("<kebab-name>", <camelCaseName>)` entry to
     `reportedRules` in `src/detectors/report.ts`. The string there is the
     report's prose name; there is no separate registry or generated guide.

5. **Create the fixture** under `tests/fixtures/<kebab-name>/`:
   - `tsconfig.json` — copy an existing fixture's config.
   - `src/cases.ts` — code that should emit detections.
   - `src/allowed.ts` — similar code that should stay silent.

6. **Write the test** at `tests/<camelCaseName>.test.ts`, mirroring a current
   per-rule test. Use `runRuleCheckOnProject` through the shared harness in
   `tests/ruleTestAssertions.ts`. Assert each expected disallowed item with its
   exact `fileName`, `line`, `column`, `message`, and `hint`; assert the allowed
   fixture emits no detections.

7. **Verify, in order:**
   - `npm test` — iterate until the new test passes. `line` and `column` are
     1-based.
   - `npm run typecheck` — must be clean.
   - `npm run dev` — run the linter on this repo itself and fix the cause of
     any signal it prints. The command exits 0 when it successfully prints a
     report, even if the report contains signals.

Report a short summary at the end: the rule name, files added/changed, targeted
test result, typecheck result, and what `npm run dev` printed.
