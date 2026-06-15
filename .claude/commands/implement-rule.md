---
description: Implement a better-typescript lint rule (with tests) and run the linter on this repo
argument-hint: <rule description or rule-id>
---

Implement the following lint rule for this project, including tests, then run the linter on the project itself via `npm run dev`:

$ARGUMENTS

## What this repo is

`better-typescript` is an opinionated TypeScript linter. Each rule walks the TypeScript AST and reports `RuleMatch`es. Rules are pure functions registered in a central list. Follow the existing conventions exactly — match the surrounding code's style, naming, and idioms (Effect's `Option`, curried context functions, no `function` keyword, etc.). Read 2-3 existing rules similar to the one requested before writing anything.

## Conventions to follow

Rule ids are kebab-case (e.g. `no-void-functions`). Source files and exports are camelCase of the id (e.g. `noVoidFunctions`). Fixture directories are the kebab-case id.

## Steps

1. **Pick the rule id and name.** Derive the kebab-case `ruleId` and the camelCase identifier from the request. Confirm no rule with that id/name already exists in `src/rules/`.

2. **Study precedent.** Read `src/rules/types.ts`, `src/rules/ruleCheck.ts`, `src/rules/ruleMatch.ts`, and the AST helpers in `src/rules/tsNode.ts` / `src/rules/tsType.ts`. Then read 2-3 existing rules whose detection shape is closest to the requested rule (e.g. type-checker-based vs. pure-syntax) and mirror their structure.

3. **Write the rule** at `src/rules/<camelCaseId>.ts`. Export a `new Rule({ id, description, check })`. Use `onNode(...)` from `ruleCheck.js` for the check, `createRuleMatch` for matches, and `namedNodeReportTarget` for the report node where appropriate. Give each match a clear `message` and an actionable `hint` (see `noVoidFunctions.ts` for the tone).

4. **Register it** in `src/rules/index.ts`: add the import (alphabetical with the others) and append it to the `rules` array.

5. **Create the fixture** under `tests/fixtures/<kebab-id>/`:
   - `tsconfig.json` — copy an existing fixture's tsconfig verbatim.
   - `src/cases.ts` — code that SHOULD be reported (the disallowed cases).
   - `src/allowed.ts` — similar code that should NOT be reported (guards against false positives).

6. **Write the test** at `tests/<camelCaseId>.test.ts`, mirroring `tests/noVoidFunctions.test.ts`: load the fixture with `loadProject`, run the rule with `runRules`, and assert with `assertDisallowedFixtureItems` / `assertAllowedFixtureItems` from `tests/ruleTestAssertions.ts`. List every expected disallowed match with its exact `fileName`, `line`, `column`, `message`, and `hint`, and every allowed item that must stay silent.

7. **Verify, in order:**
   - `npm test` — and iterate until the new test passes. (`line`/`column` are 1-based; adjust fixture or expectations until they line up.)
   - `npm run typecheck` — must be clean.
   - `npm run dev` — run the linter on this repo itself. Report what it finds. If the new rule flags real violations in `src/`, fix them so the codebase stays clean (this repo dogfoods its own rules); if a finding is a deliberate false positive, refine the rule.

Report a short summary at the end: the rule id, files added/changed, test result, and what `npm run dev` reported (and any fixes you made to the source as a result).
