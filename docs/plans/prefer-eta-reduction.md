# Plan: prefer-eta-reduction

Implemented on `main` (uncommitted unless asked to commit).

## Policy decision

**Proposed invariant:** A unary arrow whose expression body only forwards its parameter into a
free/already-applied function call must be eta-reduced to that function value instead of wrapping
it.

**Minimal disliked example** (live in
`packages/core/src/project/loadWiringConfig/loadWiringConfig.ts`):

```ts
const configExportFromFunction = (factory: ConfigFactory): ConfigExport =>
  defaultConfigExport(factory)
```

Also live:

```ts
Match.tag("signal", (signal) => Struct.get("text")(signal))
// and
(type: ts.Type): boolean => hasCallSignature(checker)(type)
```

**Desired shapes:**

```ts
const configExportFromFunction = defaultConfigExport

Match.tag("signal", Struct.get("text"))

const hasCallableType = (checker: ts.TypeChecker) => hasCallSignature(checker)
```

**Why undesirable:** maintainability / Effect idiom / consistency — the arrow adds no behavior; it
only reintroduces a named parameter that the callee already accepts. This is not a correctness bug.

**Closest allowed neighbors:**

- `(x) => [f(x)]` / `fileSubscriptions = (h) => [fileSubscription(h)]` — **out of scope for this
  check** (singleton `Array.of` / `flow(f, Array.of)` is a separate policy; maintainer chose
  eta-only)
- `(x) => fileName.includes(x)` and other **method receivers that need `this`** — must stay;
  eta-reducing to `fileName.includes` changes calling convention
- `(user) => user.name` — owned by `prefer-effect-property-accessors`
- `{ const x = f(a); return g(x) }` — owned by `prefer-function-composition`
- `{ return expr }` — owned by `prefer-implicit-return`
- Multi-arg calls, rest/default params, param used in the callee, control-flow / `Effect.gen`
  bodies, adapters like `(a) => Chunk.fromIterable(f(a))`
- Bodies that are already the function value (`const f = g`)

**Maintainer intent:** report via a new default check named `prefer-eta-reduction`. Remediation is
to use the function value directly (eta-reduce), or `flow(...steps)` for nested unary towers.
Method-receiver forms stay allowed.

## Evidence and boundaries

| Item                   | Result                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Branch / worktree      | `main` (ahead of `origin/main` by 9 after `prefer-function-composition`), clean for this proposal                                                                                                                                                                                                                                                                                                        |
| Self-host              | `timeout 10 npm run dev` → **`No signals`**                                                                                                                                                                                                                                                                                                                                                              |
| Seed eta sites present | `loadWiringConfig.ts` `configExportFromFunction`; `watch.ts` `Struct.get("text")` Match arms; several `deriveSignals(...)(signals)` / `hasCallSignature(checker)(type)` wrappers — **unreported today**                                                                                                                                                                                                  |
| Existing owner?        | **None.** `prefer-function-composition` only matches two-statement bind-then-thread blocks. `prefer-implicit-return` only drops braces. `prefer-effect-property-accessors` only property reads. `prefer-effect-function-constant` only zero-arg thunks. `no-single-use-callee` is about naming/call-count, not body shape.                                                                               |
| Rough self-host impact | ~18 expression-body unary eta candidates after excluding obvious method receivers; ~4 method-receiver skips (`includes` / `endsWith` / `startsWith`). Final count depends on checker-based `this` filtering (e.g. `checker.getTypeAtLocation` must skip).                                                                                                                                                |
| Effect idiom           | Library code passes `identity`, `Option.some`, `Array.of`, `Chunk.of` as callees; `flow` / `compose` / `flip` are the composition toolkit. Effect _website_ “Avoid Tacit” prefers `Effect.map((x) => fn(x))` over `Effect.map(fn)` because of overloads — Better TypeScript / this repo already prefer point-free `pipe`/`flow`, so this check follows **local** convention, not that website guideline. |

**Conflict to preserve:**

- `no-nested-calls`: remediation must be the callee value / outer partial application, never nest
  calls.
- `no-inline-closures`: after eta-reduction, keep a **named** binding when the arrow was named; do
  not invent an inline bare function in a disallowed position.
- Method/`this` safety: never suggest `obj.method` as a free function when the signature needs a
  receiver.

## Chosen remediation

**Add a narrowly scoped reported check:** `prefer-eta-reduction`.

**Why this row of the table:** the pattern is stable, mechanically recognizable, broadly useful in
Effect-style code, and has an actionable replacement; no existing check owns expression-body eta.
Widening `prefer-function-composition` would blur “compose a bind-thread block” with “delete an
identity wrapper.”

Not chosen:

- refactor-only (maintainer wants reporting)
- advice-only (local sites are the problem)
- project wiring-only (policy is general)
- merge into `prefer-function-composition` (different AST shape and remediation)
- include singleton-array wraps in v1 (maintainer chose eta-only)

## Planned changes

1. **`packages/checks/src/checks/preferEtaReduction.ts`**
   - `nodeCheck([ArrowFunction])` matcher
   - Match when:
     - exactly **one** required identifier parameter (no rest, no default)
     - body is an **expression** (not a block)
     - unwrap parentheses / `as` / `satisfies` / `!`
     - body is a `CallExpression` with **exactly one** argument, that argument is the parameter
       identifier
     - the parameter is **not** referenced in the callee expression
     - the callee is **not** a this-requiring method (use the type checker: skip signatures whose
       meaningful `this` parameter is not `void` / not a free function). Always allow callees that
       are already `CallExpression`s (e.g. `Struct.get("text")`, `hasCallSignature(checker)`).
   - Skip identity-looking cases that are not calls
   - Detection on the **arrow function** (or its body expression — prefer the arrow so the whole
     wrapper is the subject)
   - **Message:** `Avoid wrapping a function call that only forwards its argument.`
   - **Hint:**
     `Eta-reduce this arrow to the function value itself (pass f instead of (x) => f(x)). If the callee is already partially applied, use that partial directly. Do not nest calls.`
   - Export `preferEtaReduction` + `preferEtaReductionExamples` via
     `fixtureRefactorExamples("prefer-eta-reduction")`

2. **`packages/checks/src/preset/defaultWiring.ts`**
   - Import the check/examples
   - Add `namedCheck("prefer-eta-reduction", preferEtaReduction, preferEtaReductionExamples)` near
     the other `prefer-*` entries
   - **No** `defaultDerive` change in v1

3. **Package export**
   - Covered by existing `"./*": "./dist/checks/*.js"`

4. **Land with self-host cleanups** (required for `No signals`)
   - Rewrite matched sites to the callee value / partial
   - Typical targets: `defaultConfigExport`, `Struct.get("text")`, `Stream.fromIterable`,
     `deriveSignals(...)`, `hasCallSignature(checker)`, `Array.isArray`, safe namespace functions
     like `ts.isMethodDeclaration`
   - Leave method-receiver forms untouched

## Regression coverage

**Fixtures:** `tests/fixtures/prefer-eta-reduction/`

`src/cases.ts` must-report:

| Case                   | Shape                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| free function          | `(factory: A) => defaultConfigExport(factory)`                                 |
| already-applied callee | `(signal) => Struct.get("text")(signal)`                                       |
| curried outer          | `(type: T) => hasCallSignature(checker)(type)`                                 |
| namespace function     | `(node: ts.Node): node is X => ts.isThing(node)` only if checker marks it safe |

`src/allowed.ts` must-not-report:

| Case                                          | Why                                           |
| --------------------------------------------- | --------------------------------------------- |
| already eta-reduced (`const f = g`)           | desired end state                             |
| method receiver `(x) => fileName.includes(x)` | this-binding                                  |
| singleton array `(x) => [f(x)]`               | out of scope (separate policy)                |
| property read `(x) => x.name`                 | `prefer-effect-property-accessors`            |
| bind-thread block                             | `prefer-function-composition`                 |
| `{ return f(x) }`                             | `prefer-implicit-return` first; not this rule |
| multi-arg / rest / default param              | not unary eta                                 |
| param appears in callee                       | not a pure forward                            |
| adapter `(a) => Chunk.fromIterable(f(a))`     | not single-arg identity forward of `f`        |

Also add `example/1/{bad,good}/` (bad = `(x) => f(x)`; good = `f`).

**Test:** `tests/preferEtaReduction.test.ts` — assert the complete detection set (message + hint +
every `cases.ts` location); `allowed.ts` empty of detections.

## Compatibility and non-goals

- **New report identity:** rule `prefer-eta-reduction` + message/hint above — additive
- **Do not** widen `prefer-function-composition` to expression-body eta
- **Do not** teach nested calls as the fix
- **Do not** report `(x) => [f(x)]` / `fileSubscriptions` in this check
- **Do not** report this-requiring method receivers
- **Do not** add derive/advice wiring in v1
- **Includes:** multi-step `(x) => g(f(x))` → `flow(f, g)` (maintainer chose to ship this with v1)
- **Non-goals for v1:** dual/overload-sensitive Effect API tacit style debates; website “Avoid
  Tacit” as a counter-rule; singleton-array wraps
- Self-host cleanup of matched sites is part of the landing bar

## Verification

1. Focused `node --import tsx --test tests/preferEtaReduction.test.ts`
2. Fixture compilation
3. Affected report/CLI/watch / defaultDerive only if rule-list snapshots change
4. `npm test`
5. `npm run typecheck`
6. `npm run format:check`
7. `npm run build`
8. `timeout 10 npm run dev` → must begin at **`No signals`**
9. `npm run bench` if full bar / perf concern

Leave uncommitted on `main` unless asked to commit.

## Open decisions

1. **Checker-based `this` detection vs syntactic PropertyAccess skip?** **Resolved: checker-based.**
   Skip instance methods (`SymbolFlags.Method` on a non-constructor / non-namespace receiver). Allow
   constructor/static/namespace callees (`Array.isArray`, `Math.abs`, `ts.isMethodDeclaration`) and
   already applied callees (`Struct.get("text")`).
2. **Treat type-predicate rebinds (`const isX = (n): n is X => ts.isX(n)`) as hits?** **Resolved:
   yes.**
3. **Follow-up check for singleton-array wraps (`(x) => [f(x)]` → `flow(f, Array.of)`), covering
   `fileSubscriptions`?** **Resolved: separate plan later; out of scope here.**
4. **Extend to `(x) => g(f(x))` → `flow(f, g)`?** **Resolved: yes for this implementation.** Nested
   unary call towers are reported with a `flow(...steps)` hint (innermost callee first).
