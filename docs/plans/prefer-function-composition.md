# Plan: prefer-function-composition

## Policy decision

**Proposed invariant:** An arrow-function block body that only binds one non-function `const` and
then returns a unary call-tower over that binding must be rewritten with `pipe`, `flow`, or another
Effect `Function` combinator (`compose`, `flip`, or domain `composeK`) instead of manual local
threading.

**Minimal disliked example** (live in `packages/core/src/engine/check/check.ts`):

```ts
export const fileCheck = (handler: (context: CheckContext) => ReadonlyArray<Detection>): Check => {
  const subscriptions = fileSubscriptions(handler)
  return checkFromSubscriptions(Function.constant(subscriptions))
}
```

Same shape also appears in `nodeCheck` and `combineAll`.

**Desired shapes** (either is fine; prefer the point-free one when parameters line up):

```ts
export const fileCheck = flow(fileSubscriptions, Function.constant, checkFromSubscriptions)

// or
export const fileCheck = (handler: (context: CheckContext) => ReadonlyArray<Detection>): Check =>
  pipe(fileSubscriptions(handler), Function.constant, checkFromSubscriptions)
```

**Why undesirable:** maintainability / Effect idiom / consistency — the block exists only to name a
temporary and hand it to the next function; Effect already provides the combinators (`Function.ts`
`flow` / `compose` / `pipe`). This is not a correctness bug.

**Closest allowed neighbors:**

- `{ return expr }` — owned by `prefer-implicit-return`
- `{ const x = expr; return x }` — identity binding; **out of scope** (keep `prefer-implicit-return`
  `allowed.ts` `multiStatement`)
- Named function bindings (`const handler = (ctx) => …; return fileSubscriptions(handler)`) —
  required by `no-inline-closures`
- Multi-statement bodies with control flow, reused locals, `Effect.gen` / `yield*`, or non-tower
  returns like `match({ node: name, … })`
- Multi-arg data-first calls (`Array.some(xs, pred)`) in v1
- Bodies that are already a single expression using `pipe` / `flow`

**Maintainer intent:** report via a new default check; remediation is `pipe` / `flow` / other Effect
`Function` combinators. Chosen name: `prefer-function-composition`.

## Evidence and boundaries

| Item                                            | Result                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch / worktree                               | `main` (ahead of `origin/main` by 8 at planning time), **clean**                                                                                                                                                                                                                                              |
| Self-host                                       | `timeout 10 npm run dev` → **`No signals`**                                                                                                                                                                                                                                                                   |
| Motivating sites still present                  | `nodeCheck` / `fileCheck` / `combineAll` / inner `withProgramIndex` plan in `packages/core/src/engine/check/check.ts` — **unreported today**                                                                                                                                                                  |
| Effect package run                              | `npm run start -- --project repos/effect/packages/effect` **crashed** (`RangeError` in `noMutation.ts` / TS `getNonNullableType`) — unrelated; do not treat as signal evidence for this proposal                                                                                                              |
| Existing owner?                                 | **None.** `prefer-implicit-return` explicitly allows the bind+return shape. `prefer-pipe-function`, `prefer-effect-function-constant`, `prefer-effect-fn`, `no-inline-closures`, `no-single-use-callee`, silent `prefer-curried-data-last-functions`, and `pipeline-hostile` advice all **miss** this pattern |
| Rough self-host impact under the narrow matcher | ~33 arrow bodies in `packages/**` (call-tower over one non-function `const`)                                                                                                                                                                                                                                  |

**Conflict to preserve in the hint:** `no-nested-calls` tells people to bind intermediates _or_ use
`pipe`. This rule’s remediation must be **combinators**, never `outer(inner(x))` nesting.

**Effect canonical style (from `@repos/effect/`):** prefer `pipe` / `flow` / `compose` / `flip` (and
Kleisli `composeK` where applicable) when a body is only bind-then-return of small function
composition. Keep curly blocks for real control flow, reusable named locals, loops/mutation, and
`Effect.gen`.

## Chosen remediation

**Add a narrowly scoped reported check:** `prefer-function-composition`.

**Why this row of the table:** the pattern is stable, mechanically recognizable, broadly useful in
Effect-style code, and has an actionable replacement; no existing check owns it (updating
`prefer-implicit-return` would blur two remediations: “drop braces” vs “compose with combinators”).

Not chosen:

- refactor-only (maintainer wants reporting)
- advice-only (local sites are the problem)
- project wiring-only (policy is general)
- merge/delete (no obsolete twin)

## Planned changes

1. **`packages/checks/src/checks/preferFunctionComposition.ts`**
   - `nodeCheck([ArrowFunction])` matcher
   - Match when body has **exactly two** statements:
     - `const name = <non-function initializer>` (single identifier)
     - `return <expr>` where `name` is referenced **once** and `<expr>` is a **unary call tower**
       over `name` (calls with exactly one argument, plus parentheses / `as` / `satisfies` / `!`)
   - Skip function-valued initializers (arrows / function expressions)
   - Skip identity `return name`
   - Detection on the **block body**
   - **Message:** `Avoid block bodies that only bind a value and thread it into a call.`
   - **Hint:**
     `Use pipe, flow, or Function.compose (or a related Function combinator) so the steps compose as an expression instead of a manually threaded local. Do not nest the calls.`
   - Export `preferFunctionComposition` + `preferFunctionCompositionExamples` via
     `fixtureRefactorExamples("prefer-function-composition")`

2. **`packages/checks/src/preset/defaultWiring.ts`**
   - Import the check/examples
   - Add
     `namedCheck("prefer-function-composition", preferFunctionComposition, preferFunctionCompositionExamples)`
     next to the other `prefer-*` entries
   - **No** `defaultDerive` change in v1 (no new silent evidence; local report is enough)

3. **Package export**
   - Covered by existing `"./*": "./dist/checks/*.js"` — no `package.json` edit unless tests import
     a subpath that needs an explicit export

4. **Land with self-host cleanups** (required for `No signals`)
   - Refactor motivating APIs in `packages/core/src/engine/check/check.ts` (`fileCheck`,
     `nodeCheck`, `combineAll`; consider inner `withProgramIndex` plan as
     `flow(build, subscriptions)`)
   - Refactor the other ~30 matched sites in `packages/**` the same way (typical
     `Option.fromNullishOr` / `Option.isSome` / `Effect.fail` / `Effect.forEach` threads → `pipe`
     / `flow`)

## Regression coverage

**Fixtures:** `tests/fixtures/prefer-function-composition/`

`src/cases.ts` must-report (exact locations asserted in the test):

| Case              | Shape                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| `fileCheck`-like  | `const xs = f(input); return g(Function.constant(xs))`                                                              |
| `combineAll`-like | `const xs = Array.flatten(groups); return g(Function.constant(xs))`                                                 |
| unary wrap        | `const symbol = getSymbol(node); return Option.fromNullishOr(symbol)`                                               |
| seed as callee    | `const run = makeRun(config); return run(input)` only if this still fits the unary-tower definition; otherwise drop |

`src/allowed.ts` must-not-report:

| Case                                           | Why                      |
| ---------------------------------------------- | ------------------------ |
| already `flow` / `pipe` expression body        | desired end state        |
| `{ return expr }`                              | `prefer-implicit-return` |
| `{ const x = expr; return x }`                 | identity binding         |
| named function binding then pass               | `no-inline-closures`     |
| object-literal embed (`match({ node: name })`) | not a call tower         |
| multi-arg call (`Array.some(xs, pred)`)        | v1 non-goal              |
| `if` / loops / multiple consts / `Effect.gen`  | real bodies              |

Also add `example/1/{bad,good}/` refactor trees (bad = bind+thread; good = `flow` or `pipe`).

**Test:** `tests/preferFunctionComposition.test.ts` — assert the **complete** detection set
(message + hint + every `cases.ts` location), and assert `allowed.ts` is empty of detections.

Keep `prefer-implicit-return` `allowed.ts` `multiStatement` unchanged (boundary twin).

## Compatibility and non-goals

- **New report identity:** rule `prefer-function-composition` + message/hint above — additive; no
  rename of existing rules
- **Do not** widen `prefer-implicit-return` or remove its `multiStatement` allow
- **Do not** teach nested calls as the fix (keeps peace with `no-nested-calls`)
- **Do not** add derive/advice wiring in v1
- **Do not** depend on other checks’ detections
- **Non-goals for v1:** multi-const pipelines; `let` / `var`; function declarations; multi-arg
  data-first calls; identity bindings; `composeK`-specific matcher
- Adding this to the default preset will flag ~33 current self-host sites — cleanup is part of the
  landing bar, not optional follow-up
- Effect-repo analysis remains blocked by the existing `noMutation` stack overflow until that is
  fixed separately

## Verification

1. Focused `node --import tsx --test tests/preferFunctionComposition.test.ts`
2. Fixture compilation (`tests/fixtures/prefer-function-composition` tsconfig)
3. Affected report/CLI/watch tests only if they snapshot full default rule lists; otherwise
   `tests/defaultDerive.test.ts` smoke
4. `npm test`
5. `npm run typecheck`
6. `npm run format:check`
7. `npm run build`
8. `timeout 10 npm run dev` → must begin at **`No signals`**
9. `npm run bench` if full bar requested / perf concern

Leave uncommitted on `main` unless asked to commit.

## Open decisions (resolved)

1. Multi-const linear pipelines: later revision only; v1 stays two-statement.
2. `pipe(binding, …)` after a prior `const` is a hit.
3. Allow either `flow` or `pipe` in fixtures/examples; hint names both.
4. Effect `noMutation` stack overflow tracked separately; not a blocker.
