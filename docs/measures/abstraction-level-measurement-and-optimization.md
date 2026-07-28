# Correct level of abstraction measurement and optimization

## Informal definition

A codebase sits at the correct level of abstraction when every named unit — a function, a type, an
interface, an Effect service, a layer — hides more than it shows, and no recurring idea is left
unnamed. The property degrades in two opposite directions, and both are observable in the code
itself.

**Too much abstraction** looks like: functions that forward every argument to another function and
add nothing; type parameters that only ever bind one concrete type; optional parameters nobody
passes; interfaces with exactly one realization; error classes that wrap an already-typed error and
only rename it; services that forward to other services. Each of these is a layer of indirection
whose interface costs the reader something and whose implementation returns nothing.

**Too little abstraction** looks like: the same three-call sequence pasted into several modules;
groups of primitive parameters (`street`, `city`, `zip`) traveling together through many
signatures without a name; raw `Error` or `unknown` in an Effect error channel where callers must
guess what can fail; type assertions that smuggle values across a module boundary the type system
was supposed to guard; public signatures that mention types the package never exports, forcing
callers to reach into internals; interfaces that bundle several unrelated concerns so each consumer
uses a disjoint slice.

When the property improves, the count of such concrete, locatable misfits goes down; when it
degrades, the count goes up. The property is therefore naturally expressed as a count — misfit
instances over the whole project — with zero as the ideal. It excludes naming taste, formatting,
runtime performance, and test coverage; those are separate properties with their own measurements.

The document below turns each misfit pattern into a mechanical classifier over the compiler's view
of the program, sums the classifier outputs into one deterministic metric, and pairs every pattern
with the smallest code transformation that removes it. The two degradation directions are
deliberately kept in tension: deleting a genuine abstraction to fix "too much" re-surfaces as
duplication ("too little"), and inventing an unneeded layer to fix duplication re-surfaces as
forwarding. That tension, plus a set of explicit anti-gaming invariants, is what makes the count
trustworthy.

## Definitions

### Measured program

The typed compilation the metric is a function of: the `ts.Program` produced from one pinned
`tsconfig.json`, using the project's pinned TypeScript compiler version. Its observable inputs are
the tsconfig text, the source files that config enumerates (including their transitive imports),
and the compiler version; nothing else contributes.

**Mechanical predicate:** Given a tsconfig path, parse it with `ts.readConfigFile` +
`ts.parseJsonConfigFileContent` and construct `ts.createProgram(fileNames, options)`. A file
belongs to the measured program iff it appears in `program.getSourceFiles()`.

**Predicate implementation:**

```ts
import path from "node:path"
import ts from "typescript"

/** Builds the measured program from a pinned tsconfig path. */
export function loadMeasuredProgram(tsconfigPath: string): ts.Program {
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
  if (configFile.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"))
  }
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(tsconfigPath))
  return ts.createProgram(parsed.fileNames, parsed.options)
}
```

Example (machine-readable input):

```jsonc
// tsconfig.json — the pinned input that defines the measured program
{
  "compilerOptions": {
    "strict": true, // compiler options are inputs: they change checker results
    "module": "esnext",
    "moduleResolution": "bundler"
  },
  // the file enumeration is an input: adding/removing entries changes membership
  "include": ["src/**/*.ts", "tests/**/*.ts"]
}
```

### Module

A source file of the [measured program](#measured-program) that is neither a declaration file nor
a file the compiler classifies as belonging to an external library. Modules are the granularity at
which the metric attributes defects.

#### Related terms

| Term                  | Relation         | Deciding distinction                            | Why it is not interchangeable here                                    |
| --------------------- | ---------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| Source file           | superset         | includes `.d.ts` and library files              | defects must attach to code the maintainer can edit                   |
| Declaration file      | excluded sibling | `file.isDeclarationFile === true`               | has no bodies; most classifiers are vacuous or misleading on it       |
| External library file | excluded sibling | `program.isSourceFileFromExternalLibrary(file)` | third-party abstraction levels are not this project's property        |
| Package               | coarser grouping | a `package.json` subtree with many modules      | too coarse for attribution; the composition law needs per-file owners |

```ts
// module-comparison.ts — comparison example set
import ts from "typescript"

declare const program: ts.Program

// Module: a compiled project file with a body the maintainer edits.
const moduleFile = program.getSourceFile("src/user.ts")
// Source file (related term, superset): the same API also returns declaration/library files.
const anySourceFile = program.getSourceFiles()[0]
// Declaration file (related term, excluded): isDeclarationFile is true, so not a Module.
const declarationFile = program.getSourceFiles().find((f) => f.isDeclarationFile)
// External library file (related term, excluded): resolved from node_modules, not project code.
const libraryFile = program.getSourceFiles().find((f) => program.isSourceFileFromExternalLibrary(f))
```

**Mechanical predicate:** Given the [measured program](#measured-program) and a `ts.SourceFile`,
return `!file.isDeclarationFile && !program.isSourceFileFromExternalLibrary(file)`.

**Predicate implementation:**

```ts
import ts from "typescript"

export function isModule(program: ts.Program, file: ts.SourceFile): boolean {
  return !file.isDeclarationFile && !program.isSourceFileFromExternalLibrary(file)
}
```

### Exported declaration

A declaration in a [module](#module) whose symbol is among the module's exports as resolved by the
checker. Membership is symbol-based, so it covers each of: a declaration with an `export`
modifier, a name listed in an `export { … }` clause, and a re-export whose alias resolves to the
declaration.

**Mechanical predicate:** For a [module](#module) `file`, take
`checker.getExportsOfModule(checker.getSymbolAtLocation(file))`; resolve alias symbols with
`checker.getAliasedSymbol`; the exported declarations are the union of `getDeclarations()` over
the resolved symbols.

**Predicate implementation:**

```ts
import ts from "typescript"

export function exportedDeclarations(program: ts.Program, file: ts.SourceFile): ts.Declaration[] {
  const checker = program.getTypeChecker()
  const moduleSymbol = checker.getSymbolAtLocation(file)
  if (moduleSymbol === undefined) return []
  const out: ts.Declaration[] = []
  for (const exportSymbol of checker.getExportsOfModule(moduleSymbol)) {
    const resolved =
      (exportSymbol.flags & ts.SymbolFlags.Alias) !== 0
        ? checker.getAliasedSymbol(exportSymbol)
        : exportSymbol
    for (const declaration of resolved.getDeclarations() ?? []) out.push(declaration)
  }
  return out
}
```

Example:

```ts
// file: src/exports-demo.ts

// export modifier: exported declaration
export function parse(input: string): number {
  return Number(input)
}

// export clause: `format` becomes an exported declaration via `export { format }`
function format(n: number): string {
  return n.toFixed(2)
}
export { format }

// Not exported: module-local; not an exported declaration
function helper(): void {}

// file: src/reexport-demo.ts
// re-export: the alias resolves back to `parse`, so `parse` is exported here too
export { parse } from "./exports-demo.js"
```

### Package entry

The [module](#module)(s) a `package.json` designates as the package's importable root: every file
resolved from its `main` field and from every string leaf of its `exports` field. This is a
physical-file rule derived from existing project configuration; it carries no semantic
classification of the entry's contents.

**Mechanical predicate:** Parse `package.json`; collect `main` and all string leaves under
`exports`; resolve each to a file with `ts.resolveModuleName` against the project's compiler
options; the resulting files are the package entries.

**Predicate implementation:**

```ts
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

/** Entry module files declared by a package.json (main + all string leaves of exports). */
export function packageEntries(packageJsonPath: string, options: ts.CompilerOptions): string[] {
  const manifest = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as {
    main?: string
    exports?: unknown
  }
  const dir = path.dirname(packageJsonPath)
  const candidates: string[] = []
  if (typeof manifest.main === "string") candidates.push(path.resolve(dir, manifest.main))
  const collect = (value: unknown): void => {
    if (typeof value === "string") candidates.push(path.resolve(dir, value))
    else if (typeof value === "object" && value !== null) {
      for (const child of Object.values(value)) collect(child)
    }
  }
  collect(manifest.exports)
  // Entries pointing at emitted output are mapped back to sources by module resolution.
  return candidates.map((candidate) => {
    const resolved = ts.resolveModuleName(candidate, packageJsonPath, options, ts.sys).resolvedModule
    return resolved?.resolvedFileName ?? candidate
  })
}
```

Example (machine-readable input):

```jsonc
// package.json — both entry-declaring fields demonstrated
{
  "name": "@acme/geo",
  "main": "./src/index.ts", // `main` field: one package entry
  "exports": {
    ".": "./src/index.ts", // string leaf of `exports`: a package entry
    "./schema": "./src/schema.ts" // second string leaf: another package entry
  }
}
```

### Entry surface

The set of symbols exported, directly or by re-export, from a package's
[package entries](#package-entry). This is the observable public API boundary: a type or value is
publicly reachable iff its resolved symbol is in the entry surface.

#### Related terms

| Term                                          | Relation    | Deciding distinction                               | Why it is not interchangeable here                             |
| --------------------------------------------- | ----------- | -------------------------------------------------- | --------------------------------------------------------------- |
| [Exported declaration](#exported-declaration) | per-module  | exported from *some* module, not necessarily entry | leakage is about the *package* boundary, not module boundaries  |
| Deep import                                   | consequence | an import path targeting a non-entry module        | a symptom of a missing entry-surface member, not the set itself |
| Ambient global                                | unrelated   | declared without any import                        | not reached through the entry at all                            |

```ts
// entry-surface-comparison.ts — comparison example set
// file: src/internal/codec.ts
export interface Codec {
  // Exported declaration (related term, module-level): exported from this module,
  // but NOT on the entry surface unless the entry re-exports it.
  readonly decode: (raw: string) => number
}

// file: src/index.ts  (the package entry)
// Entry surface: `publicParse` is re-exported from the entry, so it is on the surface.
export { publicParse } from "./parse.js"

// file: src/parse.ts
export function publicParse(raw: string): number {
  return Number(raw)
}

// file: consumer.ts
// Deep import (related term): reaches a module that is not the package entry.
import type { Codec } from "@acme/geo/src/internal/codec.js"
export type UsesDeepImport = Codec
```

**Mechanical predicate:** For each [package entry](#package-entry) file, take the checker's
exports of that module symbol, resolve aliases, and union the resolved symbols. A symbol is on the
entry surface iff it is in that union.

**Predicate implementation:**

```ts
import ts from "typescript"

/** Symbols exported (directly or via re-export) from the given entry modules. */
export function entrySurface(program: ts.Program, entryFiles: readonly string[]): Set<ts.Symbol> {
  const checker = program.getTypeChecker()
  const surface = new Set<ts.Symbol>()
  for (const fileName of entryFiles) {
    const file = program.getSourceFile(fileName)
    const moduleSymbol = file === undefined ? undefined : checker.getSymbolAtLocation(file)
    if (moduleSymbol === undefined) continue
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      surface.add(
        (exported.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(exported) : exported
      )
    }
  }
  return surface
}
```

### Internal declaration

A declaration inside a [module](#module) whose resolved symbol is **not** on the
[entry surface](#entry-surface). Internal declarations are implementation detail by definition;
their appearance inside public signatures is what the leakage classifiers detect.

**Mechanical predicate:** Given a symbol, the [entry surface](#entry-surface) set, and the
[measured program](#measured-program): the symbol has at least one declaration whose source file
satisfies [module](#module), and the symbol is not a member of the entry-surface set.

**Predicate implementation:**

```ts
import ts from "typescript"

export function isInternalDeclaration(
  program: ts.Program,
  surface: ReadonlySet<ts.Symbol>,
  symbol: ts.Symbol
): boolean {
  const declaredInModule = (symbol.getDeclarations() ?? []).some((declaration) => {
    const file = declaration.getSourceFile()
    return !file.isDeclarationFile && !program.isSourceFileFromExternalLibrary(file)
  })
  return declaredInModule && !surface.has(symbol)
}
```

Example:

```ts
// file: src/internal/row.ts
// Internal declaration: lives in a module, never re-exported from the entry.
export interface Row {
  readonly id: string
}

// file: src/index.ts  (package entry)
// `Row` is intentionally absent here, which is what makes it internal.
export { listIds } from "./store.js"

// file: src/store.ts
import type { Row } from "./internal/row.js"
export function listIds(rows: readonly Row[]): string[] {
  return rows.map((row) => row.id)
}
```

### Function-like declaration

A syntactic function with a body: a function declaration, function expression, arrow function,
method declaration, accessor, or constructor whose `body` is present. Signature-only forms
(overload signatures, interface method signatures) are excluded because they have no behavior to
classify.

**Mechanical predicate:** `node` is one of the seven function-like syntax kinds and
`node.body !== undefined`.

**Predicate implementation:**

```ts
import ts from "typescript"

export function isImplementedFunctionLike(node: ts.Node): node is ts.FunctionLikeDeclaration {
  return (
    (ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node) ||
      ts.isConstructorDeclaration(node)) &&
    node.body !== undefined
  )
}
```

Example:

```ts
// This: function declaration with a body — function-like declaration
export function area(w: number, h: number): number {
  return w * h
}
// This: arrow function — function-like declaration
export const perimeter = (w: number, h: number): number => 2 * (w + h)
// This: method declaration with a body — function-like declaration
export class Shape {
  describe(): string {
    return "shape"
  }
}

// Not this: overload signature — no body, excluded
export function scale(factor: number): number
export function scale(factor: number, base?: number): number {
  return factor * (base ?? 1)
}
// Not this: interface method signature — no body, excluded
export interface Sized {
  size(): number
}
```

### Call site

A `ts.CallExpression` or `ts.NewExpression` occurring inside a [module](#module). Call sites are
where generality is exercised, options are supplied, and sequences of operations become
observable.

**Mechanical predicate:** `ts.isCallExpression(node) || ts.isNewExpression(node)`, with
`node.getSourceFile()` satisfying [module](#module).

**Predicate implementation:**

```ts
import ts from "typescript"

export function collectCallSites(program: ts.Program): Array<ts.CallExpression | ts.NewExpression> {
  const sites: Array<ts.CallExpression | ts.NewExpression> = []
  for (const file of program.getSourceFiles()) {
    if (file.isDeclarationFile || program.isSourceFileFromExternalLibrary(file)) continue
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) || ts.isNewExpression(node)) sites.push(node)
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  return sites
}
```

Example:

```ts
function total(values: readonly number[]): number {
  // call site: a CallExpression
  const sum = values.reduce((a, b) => a + b, 0)
  // call site: a NewExpression
  const formatter = new Intl.NumberFormat("en-US")
  return Number(formatter.format(sum))
}
```

### Resolved callee

The declaration the checker binds a [call site](#call-site)'s signature to. Calls through
`any`-typed values have no resolved callee and are excluded from sequence and forwarding analysis.

**Mechanical predicate:** `checker.getResolvedSignature(call)?.declaration`, discarding JSDoc
signatures; the result, when present, is the resolved callee.

**Predicate implementation:**

```ts
import ts from "typescript"

export function resolvedCallee(
  checker: ts.TypeChecker,
  call: ts.CallLikeExpression
): ts.SignatureDeclaration | undefined {
  const declaration = checker.getResolvedSignature(call)?.declaration
  return declaration !== undefined && !ts.isJSDocSignature(declaration) ? declaration : undefined
}
```

Example:

```ts
function double(n: number): number {
  return n * 2
}
// This: the checker resolves this call site to the `double` declaration above.
const eight = double(4)

declare const dynamic: any
// Not this: a call through `any` — no resolved callee.
dynamic(4)
```

### Pass-through function

A [function-like declaration](#function-like-declaration) whose entire observable behavior is one
call to its [resolved callee](#resolved-callee) and which adds no contract of its own. Membership
requires all of: (a) the body is a single returned [call site](#call-site), optionally preceded
only by `const` statements that alias parameters; (b) every argument of that call is a parameter
of the wrapper, forwarded unmodified (alias chains through single-initializer `const` locals are
followed); (c) the argument count equals the wrapper's parameter count; and (d) the wrapper's
parameter types and return type are each mutually assignable with the callee's corresponding
types, so the wrapper neither narrows nor widens anything.

#### Related terms

| Term                | Relation           | Deciding distinction                                       | Why it is not interchangeable here                             |
| ------------------- | ------------------ | ---------------------------------------------------------- | --------------------------------------------------------------- |
| Adapter             | near-miss          | narrows or converts a type: fails mutual assignability (d) | an adapter adds a contract; deleting it would lose information  |
| Partial application | near-miss          | fixes or drops an argument: fails forwarding (b)/(c)       | it encodes a decision (the fixed argument), i.e. real behavior  |
| Re-export           | different artifact | `export { f } from "./m.js"` has no function body at all   | re-exports are namespace plumbing, not a runtime layer          |
| Memoizing wrapper   | near-miss          | body contains cache branching: fails single-call shape (a) | it changes evaluation count, an observable behavior             |

```ts
// pass-through-comparison.ts — comparison example set
function fetchRow(id: string, limit: number): string {
  return `${id}:${limit}`
}

// Pass-through function: single forwarding call, identical parameter and return types.
export function loadRow(id: string, limit: number): string {
  return fetchRow(id, limit)
}

// Adapter (related term): narrows `unknown` to `string` before delegating — adds a contract.
export function loadRowFromUnknown(id: unknown, limit: number): string {
  if (typeof id !== "string") throw new TypeError("id must be a string")
  return fetchRow(id, limit)
}

// Partial application (related term): fixes `limit`, dropping a parameter — a real decision.
export function loadFirstRow(id: string): string {
  return fetchRow(id, 1)
}

// Memoizing wrapper (related term): branches on a cache — changes evaluation count.
const cache = new Map<string, string>()
export function loadRowCached(id: string, limit: number): string {
  const hit = cache.get(id)
  if (hit !== undefined) return hit
  const value = fetchRow(id, limit)
  cache.set(id, value)
  return value
}
```

**Mechanical predicate:** Given the checker and a
[function-like declaration](#function-like-declaration): locate the single returned call after
skipping leading parameter-alias `const` statements; verify every argument unaliases to a wrapper
parameter, argument count equals parameter count, and wrapper/callee parameter and return types
are mutually assignable. Return the conjunction.

**Predicate implementation:**

```ts
import ts from "typescript"

/** Follows chains of single-initializer `const` locals back to the aliased expression. */
function unalias(checker: ts.TypeChecker, expression: ts.Expression): ts.Expression {
  let current = expression
  for (let step = 0; step < 32 && ts.isIdentifier(current); step++) {
    const declaration = checker.getSymbolAtLocation(current)?.valueDeclaration
    if (
      declaration === undefined ||
      !ts.isVariableDeclaration(declaration) ||
      declaration.initializer === undefined ||
      (ts.getCombinedNodeFlags(declaration) & ts.NodeFlags.Const) === 0
    ) {
      return current
    }
    current = declaration.initializer
  }
  return current
}

function mutuallyAssignable(checker: ts.TypeChecker, a: ts.Type, b: ts.Type): boolean {
  return checker.isTypeAssignableTo(a, b) && checker.isTypeAssignableTo(b, a)
}

export function isPassThroughFunction(
  checker: ts.TypeChecker,
  fn: ts.FunctionLikeDeclaration
): boolean {
  if (fn.body === undefined || fn.parameters.length === 0) return false
  // (a) single returned call, allowing only leading const aliases of identifiers
  let returned: ts.Expression | undefined
  if (ts.isBlock(fn.body)) {
    const statements = fn.body.statements
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]!
      if (i === statements.length - 1 && ts.isReturnStatement(statement)) {
        returned = statement.expression
      } else if (
        !ts.isVariableStatement(statement) ||
        statement.declarationList.declarations.some(
          (d) => d.initializer === undefined || !ts.isIdentifier(unalias(checker, d.initializer))
        )
      ) {
        return false
      }
    }
  } else {
    returned = fn.body
  }
  if (returned === undefined || !ts.isCallExpression(returned)) return false
  // (b) every argument unaliases to a wrapper parameter
  const parameterSymbols = new Set(
    fn.parameters
      .map((parameter) => checker.getSymbolAtLocation(parameter.name))
      .filter((symbol): symbol is ts.Symbol => symbol !== undefined)
  )
  const forwarded: ts.Symbol[] = []
  for (const argument of returned.arguments) {
    const source = unalias(checker, argument)
    if (!ts.isIdentifier(source)) return false
    const symbol = checker.getSymbolAtLocation(source)
    if (symbol === undefined || !parameterSymbols.has(symbol)) return false
    forwarded.push(symbol)
  }
  // (c) argument count equals parameter count
  if (forwarded.length !== fn.parameters.length) return false
  // (d) wrapper adds no contract: mutually assignable parameter and return types
  const callee = checker.getResolvedSignature(returned)
  const wrapper = checker.getSignatureFromDeclaration(fn)
  if (callee === undefined || wrapper === undefined) return false
  if (!mutuallyAssignable(checker, wrapper.getReturnType(), callee.getReturnType())) return false
  const calleeParameters = callee.getParameters()
  if (calleeParameters.length !== forwarded.length) return false
  for (let i = 0; i < forwarded.length; i++) {
    const wrapperType = checker.getTypeOfSymbolAtLocation(forwarded[i]!, returned)
    const calleeType = checker.getTypeOfSymbolAtLocation(calleeParameters[i]!, returned)
    if (!mutuallyAssignable(checker, wrapperType, calleeType)) return false
  }
  return true
}
```

Example:

```ts
function persist(key: string, value: string): boolean {
  return key.length > 0 && value.length > 0
}

// This: pass-through function.
export function save(key: string, value: string): boolean {
  // (a) single returned call; a leading const alias of a parameter is permitted
  const k = key
  // (b) both arguments unalias to wrapper parameters, unmodified
  // (c) two arguments for two parameters
  // (d) parameter and return types are identical to the callee's
  return persist(k, value)
}

// Not this: transforms an argument — fails (b).
export function saveUpper(key: string, value: string): boolean {
  return persist(key.toUpperCase(), value)
}
```

### Effect-returning declaration

An [exported declaration](#exported-declaration) whose declared type — for a
[function-like declaration](#function-like-declaration), its return type — is the `Effect` type
declared by the `effect` package as resolved from the
[measured program](#measured-program)'s own module resolution. Identification is by resolved
declaration origin, not by identifier text.

**Mechanical predicate:** Resolve the module specifier `"effect"` from the declaring file with
`ts.resolveModuleName`; compute the resolved package directory; the declaration's type (or return
type) has an alias or type symbol named `Effect` with at least one declaration under that
directory.

**Predicate implementation:**

```ts
import path from "node:path"
import ts from "typescript"

/** Root directory of the `effect` package as resolved from `fromFile`. */
export function effectPackageDirectory(
  fromFile: string,
  options: ts.CompilerOptions
): string | undefined {
  const resolved = ts.resolveModuleName("effect", fromFile, options, ts.sys).resolvedModule
  if (resolved === undefined) return undefined
  const marker = `${path.sep}effect${path.sep}`
  const index = resolved.resolvedFileName.lastIndexOf(marker)
  return index === -1
    ? path.dirname(resolved.resolvedFileName)
    : resolved.resolvedFileName.slice(0, index + marker.length)
}

/** True when `type` is `Effect.Effect` declared by the resolved effect package. */
export function isEffectType(type: ts.Type, effectDir: string): boolean {
  const symbol = type.aliasSymbol ?? type.getSymbol()
  if (symbol === undefined || symbol.getName() !== "Effect") return false
  return (symbol.getDeclarations() ?? []).some((declaration) =>
    declaration.getSourceFile().fileName.startsWith(effectDir)
  )
}
```

Example:

```ts
import { Effect } from "effect"

// This: Effect-returning declaration — return type is the effect package's Effect.
export const countUsers = (): Effect.Effect<number> => Effect.succeed(42)

// Not this: Promise-returning — a different asynchrony abstraction, excluded.
export const countUsersAsync = async (): Promise<number> => 42
```

### Effect channels

The three type arguments of an `Effect.Effect<A, E, R>` type on an
[Effect-returning declaration](#effect-returning-declaration): the **success channel** `A` (the
produced value), the **error channel** `E` (the expected, typed failures), and the
**requirement channel** `R` (the services the effect needs before it can run).

#### Related terms

| Term                  | Relation        | Deciding distinction                                | Why it is not interchangeable here                                  |
| --------------------- | --------------- | --------------------------------------------------- | -------------------------------------------------------------------- |
| Defect (`Cause`)      | neighbor of `E` | lives outside `E`; produced by `Effect.die`/`orDie` | defects bypass the typed failure contract the error channel measures |
| Thrown exception      | neighbor of `E` | escapes the type system entirely                    | invisible to the checker, so no classifier can price it              |
| Constructor injection | neighbor of `R` | dependencies passed as ordinary parameters          | shows up in signatures, not in `R`; priced by other classifiers      |

```ts
// channels-comparison.ts — comparison example set
import { Context, Effect } from "effect"

class Clock extends Context.Service<Clock, { readonly now: () => number }>()("Clock") {}

class Stale extends Error {}

export const timestamps: Effect.Effect<
  number, // success channel A: the value produced
  Stale, //  error channel E: the expected typed failure
  Clock //   requirement channel R: the service needed to run
> = Effect.gen(function* () {
  const clock = yield* Clock
  return clock.now()
})

// Defect (related term): `orDie` moves the failure OUT of the error channel into the Cause.
export const timestampsOrDie: Effect.Effect<number, never, Clock> = Effect.orDie(timestamps)

// Constructor injection (related term): the dependency is a parameter, not in R.
export const timestampsWith = (clock: { readonly now: () => number }): number => clock.now()
```

**Mechanical predicate:** Given an Effect type: if it has `aliasTypeArguments`, those are
`[A, E, R]`; otherwise, if it is an object type reference, `checker.getTypeArguments` yields
them. Return the triple (missing members default to the declaration's defaults).

**Predicate implementation:**

```ts
import ts from "typescript"

/** The [A, E, R] type arguments of an Effect type. */
export function effectChannels(checker: ts.TypeChecker, type: ts.Type): readonly ts.Type[] {
  if (type.aliasSymbol !== undefined && type.aliasTypeArguments !== undefined) {
    return type.aliasTypeArguments
  }
  if (
    (type.flags & ts.TypeFlags.Object) !== 0 &&
    ((type as ts.ObjectType).objectFlags & ts.ObjectFlags.Reference) !== 0
  ) {
    return checker.getTypeArguments(type as ts.TypeReference)
  }
  return []
}
```

### Tagged failure

A type every union constituent of which carries a `_tag` property of string-literal type — the
discriminant that lets callers handle failures exhaustively with `Effect.catchTag`. The idiomatic
constructor is `Schema.TaggedErrorClass`.

#### Related terms

| Term         | Relation  | Deciding distinction                                            | Why it is not interchangeable here                              |
| ------------ | --------- | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| `Error`      | near-miss | no `_tag`; only `name: string` (non-literal)                    | not discriminable: callers cannot branch exhaustively on it      |
| Defect       | neighbor  | lives in the `Cause`, not the [error channel](#effect-channels) | represents unrecoverable bugs, not part of the failure contract  |
| String error | near-miss | `E = string` has no `_tag` property at all                      | carries no structure; catching requires parsing text             |

```ts
// tagged-failure-comparison.ts — comparison example set
import { Effect, Schema } from "effect"

// Tagged failure: `_tag` is the string literal "NotFound".
class NotFound extends Schema.TaggedErrorClass<NotFound>()("NotFound", {
  id: Schema.String
}) {}

export const find = (id: string): Effect.Effect<string, NotFound> =>
  id === "" ? Effect.fail(new NotFound({ id })) : Effect.succeed(id)

// Error (related term): `name` is a plain string, not a literal — not discriminable.
export const findError = (id: string): Effect.Effect<string, Error> =>
  id === "" ? Effect.fail(new Error("not found")) : Effect.succeed(id)

// String error (related term): no structure at all.
export const findString = (id: string): Effect.Effect<string, string> =>
  id === "" ? Effect.fail("not found") : Effect.succeed(id)
```

**Mechanical predicate:** For each union constituent of the type: `getProperty("_tag")` exists
and `checker.getTypeOfSymbolAtLocation` at its declaration `isStringLiteral()`. Return the
conjunction over all constituents.

**Predicate implementation:**

```ts
import ts from "typescript"

export function isTaggedFailure(checker: ts.TypeChecker, type: ts.Type): boolean {
  const constituents = type.isUnion() ? type.types : [type]
  return constituents.every((constituent) => {
    const tag = constituent.getProperty("_tag")
    const location = tag?.valueDeclaration ?? tag?.getDeclarations()?.[0]
    if (tag === undefined || location === undefined) return false
    return checker.getTypeOfSymbolAtLocation(tag, location).isStringLiteral()
  })
}
```

### Service tag

A class declaration extending `Context.Service` from the resolved `effect` package — the v4 idiom
`class X extends Context.Service<X, Shape>()("X") {}`. The **service shape** is the second type
argument: the object type of the service's members. Identification is by resolution of the
heritage expression's base symbol into the effect package, never by class or file name.

#### Related terms

| Term        | Relation  | Deciding distinction                                       | Why it is not interchangeable here                        |
| ----------- | --------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| Interface   | near-miss | no heritage into `Context.Service`; no runtime identity    | an interface cannot be yielded or provided by a `Layer`     |
| `Layer`     | neighbor  | a *constructor* of the service value, not its identity     | layers implement tags; pricing them is a separate classifier |
| Plain class | near-miss | heritage (if any) does not resolve into the effect package | has no requirement-channel semantics                         |

```ts
// service-tag-comparison.ts — comparison example set
import { Context, Effect, Layer } from "effect"

// Service tag: heritage resolves to Context.Service in the effect package.
class Database extends Context.Service<Database, {
  readonly query: (sql: string) => Effect.Effect<string>
}>()("Database") {}

// Layer (related term): constructs the service value for the tag; not itself a tag.
export const DatabaseLive = Layer.succeed(Database, {
  query: (sql: string) => Effect.succeed(`result:${sql}`)
})

// Interface (related term): a shape with no runtime identity; cannot be provided.
export interface DatabaseShape {
  readonly query: (sql: string) => Effect.Effect<string>
}

// Plain class (related term): no effect-package heritage; not a service tag.
export class DatabaseClient {
  query(sql: string): string {
    return sql
  }
}
```

**Mechanical predicate:** The class has an `extends` heritage whose expression is a call; peeling
nested calls reaches a base expression whose (alias-resolved) symbol is named `Service` and has a
declaration under the resolved effect package directory. The service shape node is
`inner.typeArguments[1]` of the inner call.

**Predicate implementation:**

```ts
import ts from "typescript"

export function isServiceTag(
  checker: ts.TypeChecker,
  node: ts.ClassDeclaration,
  effectDir: string
): boolean {
  const heritage = node.heritageClauses?.find((c) => c.token === ts.SyntaxKind.ExtendsKeyword)
  const expression = heritage?.types[0]?.expression
  if (expression === undefined || !ts.isCallExpression(expression)) return false
  let base: ts.Expression = expression
  while (ts.isCallExpression(base)) base = base.expression
  const tail = ts.isPropertyAccessExpression(base) ? base.name : base
  const symbol = checker.getSymbolAtLocation(tail)
  const resolved =
    symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0
      ? checker.getAliasedSymbol(symbol)
      : symbol
  if (resolved === undefined || resolved.getName() !== "Service") return false
  return (resolved.getDeclarations() ?? []).some((declaration) =>
    declaration.getSourceFile().fileName.startsWith(effectDir)
  )
}

/** The service shape type node: second type argument of `Context.Service<Self, Shape>`. */
export function serviceShapeNode(node: ts.ClassDeclaration): ts.TypeNode | undefined {
  const heritage = node.heritageClauses?.find((c) => c.token === ts.SyntaxKind.ExtendsKeyword)
  const expression = heritage?.types[0]?.expression
  if (expression === undefined || !ts.isCallExpression(expression)) return undefined
  const inner = expression.expression
  return ts.isCallExpression(inner) ? inner.typeArguments?.[1] : undefined
}
```

### Pass-through service member

A [function-like declaration](#function-like-declaration) that (a) is the initializer of a
property inside an object literal contextually typed by some [service tag](#service-tag)'s shape
(i.e., a layer implementation), (b) satisfies
[pass-through function](#pass-through-function), and (c) whose returned call's callee is a
property access on a value typed as a **different** service shape. It is the Effect-specific form
of a layer that exists but abstracts nothing: a facade service forwarding to the service it wraps.

**Mechanical predicate:** For every object literal whose contextual type is mutually assignable
with a registered service shape type: for each property whose initializer satisfies
[function-like declaration](#function-like-declaration) and
[pass-through function](#pass-through-function), take the returned call's callee; it must be a
property access whose object's type is mutually assignable with a different registered service
shape type.

**Predicate implementation:**

```ts
import ts from "typescript"

export interface ShapeRegistry {
  /** Service shape types keyed by tag class name, collected via serviceShapeNode. */
  readonly shapes: ReadonlyMap<string, ts.Type>
}

export function passThroughServiceMembers(
  program: ts.Program,
  registry: ShapeRegistry,
  isPassThrough: (checker: ts.TypeChecker, fn: ts.FunctionLikeDeclaration) => boolean
): ts.FunctionLikeDeclaration[] {
  const checker = program.getTypeChecker()
  const both = (a: ts.Type, b: ts.Type): boolean =>
    checker.isTypeAssignableTo(a, b) && checker.isTypeAssignableTo(b, a)
  const shapeOf = (type: ts.Type): string | undefined => {
    for (const [name, shape] of registry.shapes) if (both(type, shape)) return name
    return undefined
  }
  const found: ts.FunctionLikeDeclaration[] = []
  for (const file of program.getSourceFiles()) {
    if (file.isDeclarationFile || program.isSourceFileFromExternalLibrary(file)) continue
    const visit = (node: ts.Node): void => {
      if (ts.isObjectLiteralExpression(node)) {
        const contextual = checker.getContextualType(node)
        const owner = contextual === undefined ? undefined : shapeOf(contextual)
        if (owner !== undefined) {
          for (const property of node.properties) {
            const fn =
              ts.isPropertyAssignment(property) &&
              (ts.isArrowFunction(property.initializer) ||
                ts.isFunctionExpression(property.initializer))
                ? property.initializer
                : ts.isMethodDeclaration(property)
                  ? property
                  : undefined
            if (fn === undefined || fn.body === undefined || !isPassThrough(checker, fn)) continue
            const returned = ts.isBlock(fn.body)
              ? (fn.body.statements.find(ts.isReturnStatement)?.expression ?? undefined)
              : fn.body
            if (returned === undefined || !ts.isCallExpression(returned)) continue
            const callee = returned.expression
            if (!ts.isPropertyAccessExpression(callee)) continue
            const target = shapeOf(checker.getTypeAtLocation(callee.expression))
            if (target !== undefined && target !== owner) found.push(fn)
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  return found
}
```

Example:

```ts
import { Context, Effect, Layer } from "effect"

class UserStore extends Context.Service<UserStore, {
  readonly get: (id: string) => Effect.Effect<string>
}>()("UserStore") {}

class UserFacade extends Context.Service<UserFacade, {
  readonly get: (id: string) => Effect.Effect<string>
}>()("UserFacade") {}

export const UserFacadeLive = (store: Context.Service.Shape<typeof UserStore>) =>
  Layer.succeed(UserFacade, {
    // This: pass-through service member — (a) inside a layer object literal,
    // (b) single forwarding call, (c) delegating to a different service's member.
    get: (id: string) => store.get(id)
  })

export const UserStoreLive = Layer.succeed(UserStore, {
  // Not this: a member with its own behavior — not a pass-through.
  get: (id: string) => Effect.succeed(`user:${id}`)
})
```

### Instantiation

The concrete type a type parameter is bound to at one [call site](#call-site) or type reference,
identified by the checker's canonical string rendering under fixed format flags. Two
instantiations are **distinct** iff their renderings differ. The classifier reads a binding only
where it is directly observable: from an explicit type-argument list, or from the inferred type of
an argument whose declared parameter type is exactly the type parameter; bindings observable only
through nested positions are conservatively not counted.

**Mechanical predicate:** For a generic declaration's type parameter `T` and a
[call site](#call-site) resolving to that declaration: if the call has explicit type arguments,
render the one at `T`'s index; otherwise, for each parameter whose declared type node is an
identifier-reference to `T`, render `checker.getTypeAtLocation(argument)` for the corresponding
argument. Rendering uses `checker.typeToString(type, undefined, NoTruncation)`.

**Predicate implementation:**

```ts
import ts from "typescript"

/** Distinct rendered instantiations of each type parameter of `declaration` across `calls`. */
export function instantiationsOf(
  checker: ts.TypeChecker,
  declaration: ts.SignatureDeclaration,
  calls: readonly ts.CallExpression[]
): Map<string, Set<string>> {
  const flags = ts.TypeFormatFlags.NoTruncation
  const result = new Map<string, Set<string>>()
  const typeParameters = declaration.typeParameters ?? ts.factory.createNodeArray()
  for (const typeParameter of typeParameters) result.set(typeParameter.name.text, new Set())
  for (const call of calls) {
    if (checker.getResolvedSignature(call)?.declaration !== declaration) continue
    typeParameters.forEach((typeParameter, index) => {
      const bucket = result.get(typeParameter.name.text)!
      const explicit = call.typeArguments?.[index]
      if (explicit !== undefined) {
        bucket.add(checker.typeToString(checker.getTypeFromTypeNode(explicit), undefined, flags))
        return
      }
      declaration.parameters.forEach((parameter, parameterIndex) => {
        const typeNode = parameter.type
        const argument = call.arguments[parameterIndex]
        if (
          typeNode !== undefined &&
          argument !== undefined &&
          ts.isTypeReferenceNode(typeNode) &&
          ts.isIdentifier(typeNode.typeName) &&
          typeNode.typeName.text === typeParameter.name.text
        ) {
          bucket.add(checker.typeToString(checker.getTypeAtLocation(argument), undefined, flags))
        }
      })
    })
  }
  return result
}
```

Example:

```ts
export function first<T>(items: readonly T[], fallback: T): T {
  return items[0] ?? fallback
}

// instantiation of T as `string` — inferred from the argument bound to `fallback: T`
const a = first(["x"], "y")
// instantiation of T as `number` — explicit type-argument list
const b = first<number>([1], 2)
// T now has two distinct instantiations: "string" and "number"
```

### Speculative type parameter

A type parameter of an [exported declaration](#exported-declaration) whose set of distinct
[instantiations](#instantiation) across every [call site](#call-site) in the
[measured program](#measured-program) has size ≤ 1, and which is referenced in more than one
position of its own signature or body (so it is not a phantom brand). Generality that only one
concrete type ever exercises is indirection with no return.

#### Related terms

| Term                   | Relation  | Deciding distinction                                                                | Why it is not interchangeable here                             |
| ---------------------- | --------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Phantom type parameter | near-miss | appears in ≤ 1 position; exists to brand, not to generalize                         | brands are an intentional identity device, not unused generality |
| Unused export          | neighbor  | the whole declaration has zero references, not just one binding of a type parameter | a dead-code property, priced by a different measurement          |

```ts
// speculative-comparison.ts — comparison example set

// Speculative type parameter: T is referenced in two positions (parameter and return),
// but every call in the program binds it to `string` only.
export function firstOnlyStrings<T>(items: readonly T[]): T | undefined {
  return items[0]
}
const onlyUse = firstOnlyStrings(["a", "b"])

// Phantom type parameter (related term): `Brand` appears in exactly one position —
// an identity device, deliberately excluded from the classifier.
export type Branded<A, Brand extends string> = A & { readonly __brand: Brand }
export type UserId = Branded<string, "UserId">
```

**Mechanical predicate:** For each type parameter of an
[exported declaration](#exported-declaration): count identifier references to it inside the
declaration (excluding its own declaration site); if the count ≥ 2, compute its distinct
[instantiations](#instantiation) over all program [call sites](#call-site); the type parameter is
speculative iff that set's size ≤ 1.

**Predicate implementation:**

```ts
import ts from "typescript"

/** Counts identifier references to `typeParameter` within `declaration`. */
function referenceCount(declaration: ts.SignatureDeclaration, name: string): number {
  let count = 0
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && node.text === name && node.parent !== undefined) {
      if (!ts.isTypeParameterDeclaration(node.parent) || node.parent.name !== node) count++
    }
    ts.forEachChild(node, visit)
  }
  visit(declaration)
  return count
}

export function speculativeTypeParameters(
  declaration: ts.SignatureDeclaration,
  instantiations: ReadonlyMap<string, ReadonlySet<string>>
): string[] {
  const speculative: string[] = []
  for (const typeParameter of declaration.typeParameters ?? []) {
    const name = typeParameter.name.text
    if (referenceCount(declaration, name) < 2) continue // phantom brand: excluded
    if ((instantiations.get(name)?.size ?? 0) <= 1) speculative.push(name)
  }
  return speculative
}
```

### Speculative option

An optional parameter of an exported [function-like declaration](#function-like-declaration), or
an optional property of an exported interface or of a [service tag](#service-tag)'s shape, that
is never supplied at any [call site](#call-site) or conforming object literal in the
[measured program](#measured-program). It is configurability nobody configures: every reader must
consider a branch that never runs.

**Mechanical predicate:** For an optional parameter at index `i` of an exported
[function-like declaration](#function-like-declaration): the parameter is speculative iff no
[call site](#call-site) resolving to that declaration passes an argument at index `i`. For an
optional property `p` of an exported interface: speculative iff no object literal whose
contextual type is that interface contains a property assignment named `p`.

**Predicate implementation:**

```ts
import ts from "typescript"

/** Optional parameters of `declaration` never supplied by any call in `calls`. */
export function speculativeOptionalParameters(
  checker: ts.TypeChecker,
  declaration: ts.FunctionLikeDeclaration,
  calls: readonly ts.CallExpression[]
): ts.ParameterDeclaration[] {
  const supplied = new Set<number>()
  for (const call of calls) {
    if (checker.getResolvedSignature(call)?.declaration !== declaration) continue
    call.arguments.forEach((_, index) => supplied.add(index))
  }
  return declaration.parameters.filter(
    (parameter, index) =>
      (parameter.questionToken !== undefined || parameter.initializer !== undefined) &&
      !supplied.has(index)
  )
}

/** Optional properties of `iface` never present in any conforming object literal. */
export function speculativeOptionalProperties(
  checker: ts.TypeChecker,
  iface: ts.InterfaceDeclaration,
  literals: readonly ts.ObjectLiteralExpression[]
): string[] {
  const interfaceType = checker.getTypeAtLocation(iface.name)
  const present = new Set<string>()
  for (const literal of literals) {
    const contextual = checker.getContextualType(literal)
    if (contextual === undefined) continue
    if (
      !checker.isTypeAssignableTo(contextual, interfaceType) ||
      !checker.isTypeAssignableTo(interfaceType, contextual)
    ) {
      continue
    }
    for (const property of literal.properties) {
      if (property.name !== undefined && ts.isIdentifier(property.name)) present.add(property.name.text)
    }
  }
  return iface.members.flatMap((member) =>
    ts.isPropertySignature(member) &&
    member.questionToken !== undefined &&
    ts.isIdentifier(member.name) &&
    !present.has(member.name.text)
      ? [member.name.text]
      : []
  )
}
```

Example:

```ts
// This: speculative option — optional parameter never supplied anywhere.
export function render(text: string, theme?: string): string {
  return theme === undefined ? text : `[${theme}] ${text}`
}
render("a")
render("b")

// Not this: the optional parameter is supplied at one call site — exercised, not speculative.
export function pad(text: string, width?: number): string {
  return text.padStart(width ?? 0)
}
pad("x", 4)
```

### Conformance site

A location that realizes an interface with a concrete value: a class declaration with an
`implements` clause naming the interface, a variable declaration whose type annotation is the
interface, or an object literal whose contextual type is the interface. Conformance sites are how
the metric decides whether an interface abstracts over genuine variation.

**Mechanical predicate:** For an exported interface symbol `I`: a node is a conformance site iff
it is (1) a class declaration one of whose `implements` heritage types resolves to `I`, (2) a
variable declaration whose type annotation resolves to `I`, or (3) an object literal whose
contextual type's symbol is `I`.

**Predicate implementation:**

```ts
import ts from "typescript"

export function conformanceSites(program: ts.Program, iface: ts.InterfaceDeclaration): ts.Node[] {
  const checker = program.getTypeChecker()
  const target = checker.getSymbolAtLocation(iface.name)
  const sites: ts.Node[] = []
  const resolves = (node: ts.Node): boolean => {
    const symbol = checker.getSymbolAtLocation(node)
    const resolved =
      symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0
        ? checker.getAliasedSymbol(symbol)
        : symbol
    return resolved !== undefined && resolved === target
  }
  for (const file of program.getSourceFiles()) {
    if (file.isDeclarationFile || program.isSourceFileFromExternalLibrary(file)) continue
    const visit = (node: ts.Node): void => {
      // (1) class with `implements I`
      if (ts.isClassDeclaration(node)) {
        const clause = node.heritageClauses?.find((c) => c.token === ts.SyntaxKind.ImplementsKeyword)
        if (clause?.types.some((t) => resolves(t.expression))) sites.push(node)
      }
      // (2) variable annotated `: I`
      if (
        ts.isVariableDeclaration(node) &&
        node.type !== undefined &&
        ts.isTypeReferenceNode(node.type) &&
        resolves(node.type.typeName)
      ) {
        sites.push(node)
      }
      // (3) object literal contextually typed by I
      if (ts.isObjectLiteralExpression(node)) {
        const contextual = checker.getContextualType(node)
        if (contextual?.getSymbol() === target && target !== undefined) sites.push(node)
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  return sites
}
```

Example:

```ts
export interface Codec {
  decode(raw: string): number
}

// conformance site (1): class with an `implements` clause naming the interface
export class JsonCodec implements Codec {
  decode(raw: string): number {
    return JSON.parse(raw) as number
  }
}

// conformance site (2): variable declaration annotated with the interface
export const csvCodec: Codec = {
  decode: (raw) => Number(raw.split(",")[0])
}

export function useCodec(codec: Codec): number {
  return codec.decode("1")
}
// conformance site (3): object literal contextually typed by the interface
useCodec({ decode: (raw) => raw.length })
```

### Single-conformance interface

An exported interface that is not a [service tag](#service-tag) shape and has exactly one
[conformance site](#conformance-site) in the whole [measured program](#measured-program), tests
included. The interface promises variation that does not exist: the indirection has one
realization, so callers gain nothing the concrete type would not give them. Interfaces with zero
conformance sites are pure data shapes used only in type positions and are excluded — describing
data is not indirection.

**Mechanical predicate:** For each exported interface declaration: not referenced by any
[service tag](#service-tag)'s shape node, and `conformanceSites(program, iface).length === 1`.

**Predicate implementation:**

```ts
import ts from "typescript"

export function isSingleConformanceInterface(
  iface: ts.InterfaceDeclaration,
  conformances: readonly ts.Node[],
  serviceShapeInterfaceNames: ReadonlySet<string>
): boolean {
  return conformances.length === 1 && !serviceShapeInterfaceNames.has(iface.name.text)
}
```

Example:

```ts
import { Effect } from "effect"

// This: single-conformance interface — one realization, no service involvement.
export interface Mailer {
  send(to: string): Effect.Effect<void>
}
export const smtpMailer: Mailer = {
  send: (to) => Effect.sync(() => console.log(`mail to ${to}`))
}

// Not this: two conformance sites — the interface abstracts over real variation.
export interface Hasher {
  hash(input: string): string
}
export const fastHasher: Hasher = { hash: (input) => input.slice(0, 8) }
export const safeHasher: Hasher = { hash: (input) => `${input.length}:${input}` }
```

### Normalized call sequence

The ordered list of [resolved callee](#resolved-callee) identities produced by the top-level
statements of one [function-like declaration](#function-like-declaration)'s body. Each identity is
the callee declaration's file name plus its start offset — stable across runs over identical
inputs — and local identifier names do not participate, so renaming locals cannot change the
sequence.

**Mechanical predicate:** For each top-level statement of the body, in order: if the statement is
an expression statement, return statement, or variable statement whose (single) expression or
initializer is a [call site](#call-site) (unwrapping one level of `await` and `yield`), emit
`"<calleeFile>#<calleeStart>"` for its [resolved callee](#resolved-callee); statements without a
resolvable top-level call emit nothing.

**Predicate implementation:**

```ts
import ts from "typescript"

export function normalizedCallSequence(
  checker: ts.TypeChecker,
  body: ts.Block | ts.ConciseBody
): string[] {
  const unwrap = (expression: ts.Expression): ts.Expression =>
    ts.isAwaitExpression(expression) || ts.isYieldExpression(expression)
      ? (expression.expression ?? expression)
      : expression
  const identityOf = (expression: ts.Expression): string | undefined => {
    const unwrapped = unwrap(expression)
    if (!ts.isCallExpression(unwrapped)) return undefined
    const declaration = checker.getResolvedSignature(unwrapped)?.declaration
    if (declaration === undefined || ts.isJSDocSignature(declaration)) return undefined
    return `${declaration.getSourceFile().fileName}#${declaration.getStart()}`
  }
  if (!ts.isBlock(body)) {
    const single = identityOf(body)
    return single === undefined ? [] : [single]
  }
  const sequence: string[] = []
  for (const statement of body.statements) {
    let expression: ts.Expression | undefined
    if (ts.isExpressionStatement(statement)) expression = statement.expression
    else if (ts.isReturnStatement(statement)) expression = statement.expression
    else if (
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.length === 1
    ) {
      expression = statement.declarationList.declarations[0]!.initializer
    }
    const identity = expression === undefined ? undefined : identityOf(expression)
    if (identity !== undefined) sequence.push(identity)
  }
  return sequence
}
```

Example:

```ts
function open(name: string): number {
  return name.length
}
function readAll(handle: number): string {
  return String(handle)
}
function close(handle: number): void {}

export function loadConfig(name: string): string {
  // emits identity of `open`   (variable statement with a call initializer)
  const handle = open(name)
  // emits identity of `readAll` (variable statement with a call initializer)
  const text = readAll(handle)
  // emits identity of `close`  (expression statement that is a call)
  close(handle)
  // emits nothing: return of a non-call expression
  return text
}
// normalized call sequence of loadConfig: [open, readAll, close] (as file#offset identities)
```

### Duplicated call sequence

A window of ≥ 3 consecutive identities that occurs in the
[normalized call sequences](#normalized-call-sequence) of
[function-like declarations](#function-like-declaration) in ≥ 2 distinct [modules](#module). It
is the observable footprint of a missing abstraction: several modules re-perform the same
multi-step operation instead of calling a named one.

#### Related terms

| Term                 | Relation  | Deciding distinction                                        | Why it is not interchangeable here                                   |
| -------------------- | --------- | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Textual clone        | near-miss | compares raw text, so renamed locals defeat it              | the property is about repeated *operations*, not repeated characters   |
| Repeated single call | near-miss | window length 1; calling a utility twice is normal reuse    | one shared step is reuse; a shared *sequence* is an unnamed operation  |
| Intra-module repeat  | near-miss | both occurrences in one [module](#module)                   | a local helper fixes it locally; no cross-module abstraction is missing |

```ts
// duplication-comparison.ts — comparison example set
function connect(): number {
  return 1
}
function authenticate(session: number): number {
  return session + 1
}
function fetchProfile(session: number): string {
  return `p${session}`
}

// file: src/a.ts — first occurrence of the window [connect, authenticate, fetchProfile]
export function showProfile(): string {
  const session = connect()
  const authed = authenticate(session)
  return fetchProfile(authed)
}

// file: src/b.ts — second occurrence in a DIFFERENT module: duplicated call sequence.
// Renamed locals (s, a) do not matter: identities come from resolved callees.
export function exportProfile(): string {
  const s = connect()
  const a = authenticate(s)
  return fetchProfile(a)
}

// Repeated single call (related term): window length 1 — ordinary reuse, not a defect.
export function twoSessions(): number {
  return connect() + connect()
}
```

**Mechanical predicate:** Compute every length-3 window of every
[normalized call sequence](#normalized-call-sequence); group windows by their joined identity
string; a group is a duplicated call sequence iff the set of containing [module](#module) file
names has size ≥ 2. The defect count for a group is (number of containing modules − 1).

**Predicate implementation:**

```ts
export interface SequenceOccurrence {
  readonly moduleFileName: string
  readonly sequence: readonly string[]
}

export interface DuplicatedWindow {
  readonly window: string
  readonly modules: readonly string[]
}

export function duplicatedCallSequences(
  occurrences: readonly SequenceOccurrence[]
): DuplicatedWindow[] {
  const byWindow = new Map<string, Set<string>>()
  for (const occurrence of occurrences) {
    for (let start = 0; start + 3 <= occurrence.sequence.length; start++) {
      const window = occurrence.sequence.slice(start, start + 3).join("|")
      const modules = byWindow.get(window) ?? new Set<string>()
      modules.add(occurrence.moduleFileName)
      byWindow.set(window, modules)
    }
  }
  return [...byWindow.entries()]
    .filter(([, modules]) => modules.size >= 2)
    .map(([window, modules]) => ({ window, modules: [...modules].sort() }))
    .sort((a, b) => (a.window < b.window ? -1 : 1))
}
```

### Primitive parameter

A parameter of an exported [function-like declaration](#function-like-declaration) whose declared
type is one of `string`, `number`, `boolean`, or `bigint`, identified as the pair
`(name, typeText)` under the checker's canonical rendering.

**Mechanical predicate:** The parameter's checker type has one of the flags `String`, `Number`,
`Boolean`/`BooleanLike`, or `BigInt`; the pair is `(parameterName, typeToString(type))`.

**Predicate implementation:**

```ts
import ts from "typescript"

export interface PrimitiveParameter {
  readonly name: string
  readonly typeText: string
}

export function primitiveParameters(
  checker: ts.TypeChecker,
  fn: ts.FunctionLikeDeclaration
): PrimitiveParameter[] {
  const primitiveFlags =
    ts.TypeFlags.String | ts.TypeFlags.Number | ts.TypeFlags.BooleanLike | ts.TypeFlags.BigInt
  return fn.parameters.flatMap((parameter) => {
    if (!ts.isIdentifier(parameter.name)) return []
    const type = checker.getTypeAtLocation(parameter.name)
    return (type.flags & primitiveFlags) !== 0
      ? [{ name: parameter.name.text, typeText: checker.typeToString(type) }]
      : []
  })
}
```

Example:

```ts
export function label(
  street: string, // primitive parameter ("street", "string")
  count: number, //  primitive parameter ("count", "number")
  point: { x: number } // not primitive: object type, excluded
): string {
  return `${street} x${count} @${point.x}`
}
```

### Primitive parameter cluster

A set of ≥ 3 [primitive parameter](#primitive-parameter) pairs that co-occur in the signatures of
≥ 3 exported [function-like declarations](#function-like-declaration). The same primitives
traveling together through many signatures are a domain concept the type system has not been told
about.

**Mechanical predicate:** For each exported [function-like declaration](#function-like-declaration),
form its set of [primitive parameter](#primitive-parameter) pairs; enumerate every 3-element
subset; count, per subset, the number of declarations containing it; a subset with count ≥ 3 is a
cluster. Report one defect per distinct supporting-declaration set (merging subsets supported by
identical declaration sets).

**Predicate implementation:**

```ts
export interface SignaturePrimitives {
  readonly declarationId: string
  readonly pairs: readonly string[] // "name:typeText", sorted, unique
}

export interface PrimitiveCluster {
  readonly pairs: readonly string[]
  readonly declarations: readonly string[]
}

export function primitiveParameterClusters(
  signatures: readonly SignaturePrimitives[]
): PrimitiveCluster[] {
  const support = new Map<string, Set<string>>()
  for (const signature of signatures) {
    const pairs = [...signature.pairs].sort()
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        for (let k = j + 1; k < pairs.length; k++) {
          const key = `${pairs[i]}|${pairs[j]}|${pairs[k]}`
          const set = support.get(key) ?? new Set<string>()
          set.add(signature.declarationId)
          support.set(key, set)
        }
      }
    }
  }
  // Merge subsets with identical supporting declaration sets into one cluster.
  const bySupport = new Map<string, { pairs: Set<string>; declarations: string[] }>()
  for (const [key, declarations] of support) {
    if (declarations.size < 3) continue
    const supportKey = [...declarations].sort().join(",")
    const entry = bySupport.get(supportKey) ?? { pairs: new Set<string>(), declarations: [...declarations].sort() }
    for (const pair of key.split("|")) entry.pairs.add(pair)
    bySupport.set(supportKey, entry)
  }
  return [...bySupport.values()]
    .map((entry) => ({ pairs: [...entry.pairs].sort(), declarations: entry.declarations }))
    .sort((a, b) => (a.pairs.join() < b.pairs.join() ? -1 : 1))
}
```

Example:

```ts
// The pairs (street:string, city:string, zip:string) co-occur in three exported
// signatures — a primitive parameter cluster naming an unexpressed `Address` concept.
export function geocode(street: string, city: string, zip: string): string {
  return `${street},${city},${zip}`
}
export function validateAddress(street: string, city: string, zip: string): boolean {
  return street !== "" && city !== "" && zip.length === 5
}
export function printLabel(name: string, street: string, city: string, zip: string): string {
  return `${name}\n${street}\n${city} ${zip}`
}
```

### Interface consumer

A [module](#module) containing at least one property access whose object expression's type
resolves to a given exported interface or [service tag](#service-tag) shape. The consumer's
**used member set** is the set of member names it accesses that way.

**Mechanical predicate:** For every property access expression in every [module](#module): if the
object expression's type symbol is the interface's symbol (or the type is mutually assignable
with the service shape), record `(moduleFileName, memberName)`. The consumers are the distinct
module file names; each one's used member set is its recorded member names.

**Predicate implementation:**

```ts
import ts from "typescript"

/** moduleFileName -> set of member names accessed on values of `target`'s type. */
export function interfaceConsumers(
  program: ts.Program,
  target: ts.InterfaceDeclaration
): Map<string, Set<string>> {
  const checker = program.getTypeChecker()
  const targetSymbol = checker.getSymbolAtLocation(target.name)
  const consumers = new Map<string, Set<string>>()
  for (const file of program.getSourceFiles()) {
    if (file.isDeclarationFile || program.isSourceFileFromExternalLibrary(file)) continue
    const visit = (node: ts.Node): void => {
      if (ts.isPropertyAccessExpression(node)) {
        const objectType = checker.getTypeAtLocation(node.expression)
        if (objectType.getSymbol() === targetSymbol && targetSymbol !== undefined) {
          const used = consumers.get(file.fileName) ?? new Set<string>()
          used.add(node.name.text)
          consumers.set(file.fileName, used)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  return consumers
}
```

Example:

```ts
// file: src/report.ts
export interface Store {
  read(key: string): string
  write(key: string, value: string): void
}

// file: src/reader.ts — interface consumer with used member set {read}
import type { Store } from "./report.js"
export function dump(store: Store): string {
  return store.read("all")
}
```

### Fragmented interface

An exported interface or [service tag](#service-tag) shape with ≥ 4 members and ≥ 2
[interface consumers](#interface-consumer), whose consumer–member bipartite graph has ≥ 2
connected components. No consumer connects the components, so the interface bundles independent
concerns — two or more abstractions sharing one name.

**Mechanical predicate:** Build a graph whose vertices are the interface's member names plus its
[interface consumers](#interface-consumer)' file names, with an edge for each (consumer, used
member) pair; members used by no consumer attach to no edge and are ignored for connectivity.
Count connected components over vertices with ≥ 1 edge; the interface is fragmented iff the count
is ≥ 2, membership requiring ≥ 4 members and ≥ 2 consumers.

**Predicate implementation:**

```ts
export function usageComponentCount(consumers: ReadonlyMap<string, ReadonlySet<string>>): number {
  const adjacency = new Map<string, Set<string>>()
  const link = (a: string, b: string): void => {
    const set = adjacency.get(a) ?? new Set<string>()
    set.add(b)
    adjacency.set(a, set)
  }
  for (const [consumer, members] of consumers) {
    for (const member of members) {
      link(`c:${consumer}`, `m:${member}`)
      link(`m:${member}`, `c:${consumer}`)
    }
  }
  const seen = new Set<string>()
  let components = 0
  for (const vertex of adjacency.keys()) {
    if (seen.has(vertex)) continue
    components++
    const stack = [vertex]
    while (stack.length > 0) {
      const current = stack.pop()!
      if (seen.has(current)) continue
      seen.add(current)
      for (const next of adjacency.get(current) ?? []) stack.push(next)
    }
  }
  return components
}

export function isFragmentedInterface(
  memberCount: number,
  consumers: ReadonlyMap<string, ReadonlySet<string>>
): boolean {
  return memberCount >= 4 && consumers.size >= 2 && usageComponentCount(consumers) >= 2
}
```

Example:

```ts
import { Effect } from "effect"

// This: fragmented interface — 4 members, and the two consumers below use
// disjoint halves, so the bipartite graph has 2 components.
export interface Platform {
  readFile(path: string): Effect.Effect<string>
  writeFile(path: string, data: string): Effect.Effect<void>
  getEnv(name: string): Effect.Effect<string>
  setEnv(name: string, value: string): Effect.Effect<void>
}

// consumer 1 uses only {readFile, writeFile}
export const copy = (platform: Platform, from: string, to: string): Effect.Effect<void> =>
  Effect.flatMap(platform.readFile(from), (data) => platform.writeFile(to, data))

// consumer 2 uses only {getEnv, setEnv} — no member links the two consumers
export const promoteEnv = (platform: Platform, name: string): Effect.Effect<void> =>
  Effect.flatMap(platform.getEnv(name), (value) => platform.setEnv(`${name}_COPY`, value))
```

### Signature surface

The set of named type symbols reachable from an [exported declaration](#exported-declaration)'s
declared signature nodes — parameter type annotations, return type annotation, type parameter
constraints and defaults, and property type annotations — by walking type reference nodes one
level at a time through their own type arguments. It is what a caller's editor and compiler must
resolve to use the declaration.

**Mechanical predicate:** Collect every `ts.TypeReferenceNode` in the declaration's type
annotation positions, resolve each `typeName` to its (alias-resolved) symbol, and recurse into
the reference's `typeArguments`. The signature surface is the resulting symbol set.

**Predicate implementation:**

```ts
import ts from "typescript"

export function signatureSurface(checker: ts.TypeChecker, declaration: ts.Declaration): Set<ts.Symbol> {
  const surface = new Set<ts.Symbol>()
  const visitTypeNode = (node: ts.Node): void => {
    if (ts.isTypeReferenceNode(node)) {
      const symbol = checker.getSymbolAtLocation(node.typeName)
      const resolved =
        symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0
          ? checker.getAliasedSymbol(symbol)
          : symbol
      if (resolved !== undefined) surface.add(resolved)
    }
    ts.forEachChild(node, visitTypeNode)
  }
  const visitDeclaration = (node: ts.Node): void => {
    if (ts.isParameter(node) || ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) {
      if (node.type !== undefined) visitTypeNode(node.type)
    }
    if (ts.isFunctionLike(node) && node.type !== undefined) visitTypeNode(node.type)
    if (ts.isTypeParameterDeclaration(node)) {
      if (node.constraint !== undefined) visitTypeNode(node.constraint)
      if (node.default !== undefined) visitTypeNode(node.default)
    }
    ts.forEachChild(node, visitDeclaration)
  }
  visitDeclaration(declaration)
  return surface
}
```

Example:

```ts
interface Row {
  readonly id: string
}
interface Page<T> {
  readonly items: readonly T[]
}

export function listRows(
  limit: number // no type reference: primitives add nothing to the surface
): Page<Row> {
  // return annotation contributes `Page` AND, through its type argument, `Row`
  return { items: [{ id: String(limit) }] }
}
// signature surface of listRows = { Page, Row }
```

### Leaky signature

An [exported declaration](#exported-declaration) whose resolved symbol is on the
[entry surface](#entry-surface) but whose [signature surface](#signature-surface) contains an
[internal declaration](#internal-declaration). Callers can obtain values of a type they cannot
name via the package entry, so the public abstraction depends on a private one: detail has
escaped the boundary.

#### Related terms

| Term                                        | Relation  | Deciding distinction                                    | Why it is not interchangeable here                                 |
| ------------------------------------------- | --------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| [Requirement leakage](#requirement-leakage) | sibling   | leaks through the Effect `R` channel, not the signature nodes | `R` members are erased aliases; the surface walk cannot see them |
| Deep import                                 | downstream| the *caller's* workaround, in the consumer's code       | the defect is priced at the leaking declaration, not the caller       |

```ts
// leaky-comparison.ts — comparison example set
// file: src/internal/plan.ts — internal declaration (never re-exported from the entry)
export interface Plan {
  readonly steps: readonly string[]
}

// file: src/index.ts (package entry)
export { makePlan } from "./planner.js"

// file: src/planner.ts
import type { Plan } from "./internal/plan.js"
// Leaky signature: `makePlan` is on the entry surface, `Plan` is not.
export function makePlan(goal: string): Plan {
  return { steps: [goal] }
}

// Deep import (related term): the caller-side symptom of the same leak.
// import type { Plan } from "@acme/geo/src/internal/plan.js"
```

**Mechanical predicate:** For each symbol on the [entry surface](#entry-surface), for each of its
declarations: intersect `signatureSurface(declaration)` with the set of
[internal declarations](#internal-declaration); the declaration is leaky iff the intersection is
non-empty. One defect per (declaration, leaked symbol) pair.

**Predicate implementation:**

```ts
import ts from "typescript"

export function leakedSymbols(
  program: ts.Program,
  surface: ReadonlySet<ts.Symbol>,
  declarationSurface: ReadonlySet<ts.Symbol>
): ts.Symbol[] {
  const leaks: ts.Symbol[] = []
  for (const referenced of declarationSurface) {
    const declaredInModule = (referenced.getDeclarations() ?? []).some((declaration) => {
      const file = declaration.getSourceFile()
      return !file.isDeclarationFile && !program.isSourceFileFromExternalLibrary(file)
    })
    if (declaredInModule && !surface.has(referenced)) leaks.push(referenced)
  }
  return leaks
}
```

### Requirement leakage

An [Effect-returning declaration](#effect-returning-declaration) on the
[entry surface](#entry-surface) whose requirement channel (see
[Effect channels](#effect-channels)) contains a [service tag](#service-tag) that is an
[internal declaration](#internal-declaration). Callers must provide a service they cannot import
from the entry: the dependency abstraction leaks in a form the
[leaky signature](#leaky-signature) walk cannot see, because `R` is computed by the checker, not
written in the annotation.

**Mechanical predicate:** For each entry-surface
[Effect-returning declaration](#effect-returning-declaration): take channel `R` via
[Effect channels](#effect-channels); for each union constituent whose symbol satisfies
[service tag](#service-tag): one defect iff that symbol is an
[internal declaration](#internal-declaration).

**Predicate implementation:**

```ts
import ts from "typescript"

export function leakedRequirements(
  program: ts.Program,
  surface: ReadonlySet<ts.Symbol>,
  requirementChannel: ts.Type,
  isServiceTagSymbol: (symbol: ts.Symbol) => boolean
): ts.Symbol[] {
  const constituents = requirementChannel.isUnion() ? requirementChannel.types : [requirementChannel]
  const leaks: ts.Symbol[] = []
  for (const constituent of constituents) {
    const symbol = constituent.getSymbol()
    if (symbol === undefined || !isServiceTagSymbol(symbol)) continue
    const declaredInModule = (symbol.getDeclarations() ?? []).some((declaration) => {
      const file = declaration.getSourceFile()
      return !file.isDeclarationFile && !program.isSourceFileFromExternalLibrary(file)
    })
    if (declaredInModule && !surface.has(symbol)) leaks.push(symbol)
  }
  return leaks
}
```

Example:

```ts
import { Context, Effect } from "effect"

// file: src/internal/clock.ts — internal service tag (not re-exported from the entry)
export class Clock extends Context.Service<Clock, { readonly now: () => number }>()("Clock") {}

// file: src/index.ts (package entry)
export { timestamp } from "./time.js"

// file: src/time.ts
// Requirement leakage: `timestamp` is public, its R channel demands the internal `Clock`.
export const timestamp: Effect.Effect<number, never, Clock> = Effect.gen(function* () {
  const clock = yield* Clock
  return clock.now()
})
```

### Untagged error channel

An [Effect-returning declaration](#effect-returning-declaration) on the
[entry surface](#entry-surface) whose error channel (see [Effect channels](#effect-channels)) is
neither `never` nor a [tagged failure](#tagged-failure). The failure contract is under-abstracted:
callers cannot branch on what failed without inspecting values structurally.

**Mechanical predicate:** Take channel `E` via [Effect channels](#effect-channels); the defect
holds iff `(E.flags & TypeFlags.Never) === 0` and `isTaggedFailure(checker, E)` is false.

**Predicate implementation:**

```ts
import ts from "typescript"

export function hasUntaggedErrorChannel(
  checker: ts.TypeChecker,
  errorChannel: ts.Type,
  isTaggedFailure: (checker: ts.TypeChecker, type: ts.Type) => boolean
): boolean {
  if ((errorChannel.flags & ts.TypeFlags.Never) !== 0) return false
  return !isTaggedFailure(checker, errorChannel)
}
```

Example:

```ts
import { Effect, Schema } from "effect"

// This: untagged error channel — E is `Error`, callers cannot catchTag it.
export const readUntagged = (path: string): Effect.Effect<string, Error> =>
  path === "" ? Effect.fail(new Error("empty path")) : Effect.succeed(path)

class EmptyPath extends Schema.TaggedErrorClass<EmptyPath>()("EmptyPath", {
  path: Schema.String
}) {}

// Not this: E is a tagged failure — the failure contract is fully abstracted.
export const readTagged = (path: string): Effect.Effect<string, EmptyPath> =>
  path === "" ? Effect.fail(new EmptyPath({ path })) : Effect.succeed(path)
```

### Rename-only error wrapper

A [tagged failure](#tagged-failure) class whose declared fields consist of exactly one field named
`cause`, where the type of `cause` is itself a [tagged failure](#tagged-failure). The wrapper adds
a new tag around an already-discriminable failure without adding information — a failure
abstraction one level too high. Wrapping an untyped `unknown`/defect in a tag is excluded: that
wrap *adds* the discriminant.

**Mechanical predicate:** The class satisfies [tagged failure](#tagged-failure) construction (its
instance type has a string-literal `_tag`); its declared instance properties other than `_tag`
are exactly `{ cause }`; and the checker type of `cause` satisfies
[tagged failure](#tagged-failure).

**Predicate implementation:**

```ts
import ts from "typescript"

export function isRenameOnlyErrorWrapper(
  checker: ts.TypeChecker,
  errorClass: ts.ClassDeclaration,
  isTaggedFailure: (checker: ts.TypeChecker, type: ts.Type) => boolean
): boolean {
  if (errorClass.name === undefined) return false
  const instanceType = checker.getTypeAtLocation(errorClass.name)
  const constructed = checker.getDeclaredTypeOfSymbol(
    checker.getSymbolAtLocation(errorClass.name) ?? instanceType.symbol
  )
  if (!isTaggedFailure(checker, constructed)) return false
  const dataFields = constructed
    .getProperties()
    .filter((property) => {
      const declaration = property.valueDeclaration ?? property.getDeclarations()?.[0]
      if (declaration === undefined) return false
      // Only fields declared by this class body or its schema fields object matter.
      return declaration.getSourceFile() === errorClass.getSourceFile() && property.getName() !== "_tag"
    })
    .map((property) => property.getName())
  if (dataFields.length !== 1 || dataFields[0] !== "cause") return false
  const cause = constructed.getProperty("cause")
  const location = cause?.valueDeclaration ?? cause?.getDeclarations()?.[0]
  if (cause === undefined || location === undefined) return false
  return isTaggedFailure(checker, checker.getTypeOfSymbolAtLocation(cause, location))
}
```

Example:

```ts
import { Schema } from "effect"

class DiskFull extends Schema.TaggedErrorClass<DiskFull>()("DiskFull", {
  bytesNeeded: Schema.Number
}) {}

// This: rename-only error wrapper — single `cause` field holding an already-tagged failure.
export class StorageError extends Schema.TaggedErrorClass<StorageError>()("StorageError", {
  cause: Schema.instanceOf(DiskFull)
}) {}

// Not this: wraps an UNTYPED cause — the tag adds the missing discriminant.
export class UnknownStorageError extends Schema.TaggedErrorClass<UnknownStorageError>()(
  "UnknownStorageError",
  { cause: Schema.Defect() }
) {}

// Not this: adds its own information (`path`) beyond the wrapped failure.
export class WriteFailed extends Schema.TaggedErrorClass<WriteFailed>()("WriteFailed", {
  path: Schema.String,
  cause: Schema.instanceOf(DiskFull)
}) {}
```

### Cross-module cast

An `as`-expression in a [module](#module) whose target type's symbol is declared in a different
[module](#module) and whose source expression's type is **not** assignable to the target type.
It asserts membership in another module's abstraction without satisfying it — a bypass of the
boundary the type was supposed to enforce. `as const`, casts to `unknown`, and safe upcasts
(where assignability already holds) are excluded.

**Mechanical predicate:** For each `ts.AsExpression`: exclude `as const` (target is a
`ConstKeyword`-based node) and `unknown` targets; resolve the target type's symbol; require some
declaration of it in a different file satisfying [module](#module); require
`!checker.isTypeAssignableTo(typeOf(expression), targetType)`. The conjunction is the defect.

**Predicate implementation:**

```ts
import ts from "typescript"

export function crossModuleCasts(program: ts.Program): ts.AsExpression[] {
  const checker = program.getTypeChecker()
  const casts: ts.AsExpression[] = []
  for (const file of program.getSourceFiles()) {
    if (file.isDeclarationFile || program.isSourceFileFromExternalLibrary(file)) continue
    const visit = (node: ts.Node): void => {
      if (ts.isAsExpression(node)) {
        const targetNode = node.type
        const isConst =
          ts.isTypeReferenceNode(targetNode) &&
          ts.isIdentifier(targetNode.typeName) &&
          targetNode.typeName.text === "const"
        const targetType = checker.getTypeFromTypeNode(targetNode)
        const isUnknown = (targetType.flags & ts.TypeFlags.Unknown) !== 0
        if (!isConst && !isUnknown) {
          const symbol = targetType.aliasSymbol ?? targetType.getSymbol()
          const foreign = (symbol?.getDeclarations() ?? []).some((declaration) => {
            const declarationFile = declaration.getSourceFile()
            return (
              declarationFile !== file &&
              !declarationFile.isDeclarationFile &&
              !program.isSourceFileFromExternalLibrary(declarationFile)
            )
          })
          const sourceType = checker.getTypeAtLocation(node.expression)
          if (foreign && !checker.isTypeAssignableTo(sourceType, targetType)) casts.push(node)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(file)
  }
  return casts
}
```

Example:

```ts
// file: src/order.ts
export interface Order {
  readonly id: string
  readonly total: number
}

// file: src/handler.ts
import type { Order } from "./order.js"

declare const payload: { id: string }

// This: cross-module cast — `Order` is declared in another module and
// `{ id: string }` is NOT assignable to it (missing `total`).
export const order = payload as Order

// Not this: `as const` — excluded.
export const mode = "strict" as const

// Not this: cast to `unknown` — excluded.
export const opaque = payload as unknown

// Not this: safe upcast — assignability already holds, excluded.
declare const full: Order
export const wide = full as { readonly id: string }
```

### Defect class

One of the twelve named classifiers defined above, identified by a stable string key. The keys,
their classifiers, and their degradation direction (too much vs. too little abstraction):

| Key                  | Classifier                                                    | Direction  |
| -------------------- | ------------------------------------------------------------- | ---------- |
| `pass-through`       | [Pass-through function](#pass-through-function)               | too much   |
| `pass-through-svc`   | [Pass-through service member](#pass-through-service-member)   | too much   |
| `spec-type-param`    | [Speculative type parameter](#speculative-type-parameter)     | too much   |
| `spec-option`        | [Speculative option](#speculative-option)                     | too much   |
| `single-conformance` | [Single-conformance interface](#single-conformance-interface) | too much   |
| `rename-wrapper`     | [Rename-only error wrapper](#rename-only-error-wrapper)       | too much   |
| `dup-sequence`       | [Duplicated call sequence](#duplicated-call-sequence)         | too little |
| `prim-cluster`       | [Primitive parameter cluster](#primitive-parameter-cluster)   | too little |
| `fragmented-iface`   | [Fragmented interface](#fragmented-interface)                 | too little |
| `leaky-signature`    | [Leaky signature](#leaky-signature)                           | too little |
| `req-leak`           | [Requirement leakage](#requirement-leakage)                   | too little |
| `untagged-error`     | [Untagged error channel](#untagged-error-channel)             | too little |

[Cross-module cast](#cross-module-cast) is counted under a thirteenth key, `boundary-cast`
(direction: too little — the boundary exists but is bypassed).

**Mechanical predicate:** A string is a defect class iff it is one of the thirteen keys above.

**Predicate implementation:**

```ts
export const DEFECT_CLASSES = [
  "pass-through",
  "pass-through-svc",
  "spec-type-param",
  "spec-option",
  "single-conformance",
  "rename-wrapper",
  "dup-sequence",
  "prim-cluster",
  "fragmented-iface",
  "leaky-signature",
  "req-leak",
  "untagged-error",
  "boundary-cast"
] as const

export type DefectClass = (typeof DEFECT_CLASSES)[number]

export function isDefectClass(value: string): value is DefectClass {
  return (DEFECT_CLASSES as readonly string[]).includes(value)
}
```

### Abstraction defect

One concrete finding: a [defect class](#defect-class) key plus the location that anchors it. The
anchor is the classified declaration's file and start offset for declaration-anchored classes;
for `dup-sequence` it is the lexicographically first occurrence, with one defect per additional
containing [module](#module); for `prim-cluster` it is the lexicographically first supporting
declaration, one defect per cluster.

**Mechanical predicate:** A value is an abstraction defect iff it is a record
`{ class, file, start, detail }` where `class` satisfies [defect class](#defect-class), `file`
names a [module](#module), `start` is that anchor's start offset, and `detail` is the
classifier-specific identity string (e.g. the window key, the leaked symbol name). Two defects
are the same defect iff all four fields are equal.

**Predicate implementation:**

```ts
import { isDefectClass, type DefectClass } from "./defect-class.js"

export interface AbstractionDefect {
  readonly class: DefectClass
  readonly file: string
  readonly start: number
  readonly detail: string
}

export function isAbstractionDefect(value: unknown): value is AbstractionDefect {
  if (typeof value !== "object" || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate["class"] === "string" &&
    isDefectClass(candidate["class"]) &&
    typeof candidate["file"] === "string" &&
    typeof candidate["start"] === "number" &&
    typeof candidate["detail"] === "string"
  )
}
```

Example (machine-readable output):

```jsonc
// one abstraction defect
{
  "class": "pass-through", // defect class key
  "file": "src/save.ts", //    anchor: the module containing the classified declaration
  "start": 132, //             anchor: start offset of the declaration
  "detail": "save" //          classifier-specific identity (the wrapper's name)
}
```

### Measurement record

The machine-readable result of one full measurement run: the metric value, its unit, the digest
of every input, the environment controls, the timestamp, and the per-[module](#module),
per-[defect class](#defect-class) decomposition. Records are what baseline comparison and every
lever confirmation consume.

**Mechanical predicate:** A JSON document with exactly the fields shown below, where `value`
equals the length of `defects`, `inputsDigest` is the SHA-256 hex digest of the sorted list of
`(fileName, fileContentSHA256)` pairs of the [measured program](#measured-program)'s
[modules](#module) plus the tsconfig text, and `byModule`/`byClass` sums each equal `value`.

**Predicate implementation:**

```ts
import { createHash } from "node:crypto"
import type { AbstractionDefect } from "./abstraction-defect.js"

export interface MeasurementRecord {
  readonly metric: "abstraction-defect-count"
  readonly unit: "defects"
  readonly value: number
  readonly inputsDigest: string
  readonly environment: { readonly typescript: string; readonly node: string }
  readonly timestamp: string
  readonly defects: readonly AbstractionDefect[]
  readonly byModule: Readonly<Record<string, number>>
  readonly byClass: Readonly<Record<string, number>>
}

export function digestInputs(files: ReadonlyMap<string, string>, tsconfigText: string): string {
  const hash = createHash("sha256")
  for (const fileName of [...files.keys()].sort()) {
    hash.update(fileName)
    hash.update(createHash("sha256").update(files.get(fileName)!).digest("hex"))
  }
  hash.update(tsconfigText)
  return hash.digest("hex")
}

export function isConsistentRecord(record: MeasurementRecord): boolean {
  const byModuleTotal = Object.values(record.byModule).reduce((a, b) => a + b, 0)
  const byClassTotal = Object.values(record.byClass).reduce((a, b) => a + b, 0)
  return record.value === record.defects.length && byModuleTotal === record.value && byClassTotal === record.value
}
```

Example (machine-readable output):

```jsonc
// a complete measurement record
{
  "metric": "abstraction-defect-count", // metric name
  "unit": "defects", //                    unit
  "value": 3, //                           the metric value = defects.length
  // inputs digest: SHA-256 over sorted (fileName, contentHash) pairs + tsconfig text
  "inputsDigest": "8f4e2c11a0b6d59e7c3f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d",
  "environment": { "typescript": "6.0.3", "node": "22.11.0" }, // environment controls
  "timestamp": "2026-07-28T12:00:00.000Z",
  "defects": [
    { "class": "pass-through", "file": "src/save.ts", "start": 132, "detail": "save" },
    { "class": "dup-sequence", "file": "src/a.ts", "start": 10, "detail": "…|…|…" },
    { "class": "untagged-error", "file": "src/read.ts", "start": 44, "detail": "readUntagged" }
  ],
  // decomposition: byModule and byClass each sum to `value`
  "byModule": { "src/save.ts": 1, "src/a.ts": 1, "src/read.ts": 1 },
  "byClass": { "pass-through": 1, "dup-sequence": 1, "untagged-error": 1 }
}
```

### Noise floor

The smallest difference between two measured values the protocol treats as real. For this metric
the noise floor is **zero**: the value is a pure function of file bytes, the tsconfig, and the
compiler version — no execution, no time, no randomness — so two runs over the same
`inputsDigest` must produce byte-identical `defects` arrays.

**Mechanical predicate:** Two [measurement records](#measurement-record) are comparable iff their
`environment` fields are equal; a difference is real iff `abs(a.value - b.value) > 0`.

**Predicate implementation:**

```ts
import type { MeasurementRecord } from "./measurement-record.js"

export function isRealChange(before: MeasurementRecord, after: MeasurementRecord): boolean {
  const comparable =
    before.environment.typescript === after.environment.typescript &&
    before.environment.node === after.environment.node
  if (!comparable) throw new Error("records measured under different environments")
  return Math.abs(after.value - before.value) > 0 // noise floor = 0
}
```

## Measurement

### Metric

- **Name:** abstraction-defect-count (ADC).
- **Unit:** defects (a count of [abstraction defects](#abstraction-defect)).
- **Scale:** count (non-negative integer).
- **Direction of goodness:** smaller is better; 0 is the ideal.
- **Domain:** the whole [measured program](#measured-program), decomposable per
  [module](#module) and per [defect class](#defect-class).
- **Observable inputs:** (1) the bytes of every [module](#module); (2) the tsconfig text and the
  compiler options it produces; (3) each `package.json` that contributes
  [package entries](#package-entry); (4) the pinned TypeScript compiler version; (5) the resolved
  `effect` package sources (they decide [service tag](#service-tag) and
  [Effect-returning declaration](#effect-returning-declaration) identity).
- **Exclusions:** declaration files; external library files (beyond identity resolution in input
  5); comments and formatting (classifiers read the AST and checker, not trivia); runtime
  behavior, wall time, and test outcomes; VCS history; file paths and directory names except
  where [package entry](#package-entry) — an explicitly physical-file rule — consumes existing
  `package.json` configuration.
- **Validity:** ADC is a proxy for the property "correct level of abstraction," not the property
  itself. Known divergences, stated plainly: (1) a *well-chosen* abstraction whose concept is
  wrong for the domain but mechanically clean scores 0 — no classifier reads domain fit; (2)
  duplication expressed as parallel *type-level* structures (twin interfaces evolved apart) is
  not captured by [duplicated call sequences](#duplicated-call-sequence), which watch value-level
  calls; (3) generality exercised only by *external* consumers of a published library is
  invisible to [instantiation](#instantiation) counting, which sees only the
  [measured program](#measured-program) — for published packages, include consumer packages or
  example/test files in the tsconfig to close the gap; (4) an over-general abstraction whose
  every option and type parameter happens to be exercised at least twice scores 0 even if the
  generality is still net-negative. Residual gaps (1) and (4) are accepted; gaps (2) and (3)
  have the stated mitigations.

### Procedure

**Environment controls.** Pin: the TypeScript compiler version (from the lockfile), the Node/Bun
runtime version used to run the measurer (the measurer's own host — it does not execute project
code), the tsconfig path, and the `package.json` set. No warmup, repetition, or seeding is
needed: the procedure performs no timed or randomized step, so a single run is exact and the
[noise floor](#noise-floor) is zero. Determinism holds because every step below is a pure
function of the pinned inputs: file enumeration is sorted, all classifier outputs are
deterministic checker queries, and all aggregation is order-independent counting over sorted
keys.

**Ordered procedure.**

1. Load the [measured program](#measured-program) from the pinned tsconfig.
2. Enumerate [modules](#module), sorted by file name.
3. Compute [package entries](#package-entry) from every workspace `package.json`, then the
   [entry surface](#entry-surface).
4. Collect all [call sites](#call-site); resolve the effect package directory; register every
   [service tag](#service-tag) and its shape.
5. Run each [defect class](#defect-class) classifier over its stated inputs, producing the
   [abstraction defect](#abstraction-defect) list, sorted by `(file, start, class, detail)`.
6. Aggregate: `value = defects.length`; fold `byModule` and `byClass`.
7. Digest inputs, attach environment and timestamp, and emit the
   [measurement record](#measurement-record).

**Measurement implementation:**

```ts
import { createHash } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

export interface Defect {
  readonly class: string
  readonly file: string
  readonly start: number
  readonly detail: string
}

export interface Record_ {
  readonly metric: "abstraction-defect-count"
  readonly unit: "defects"
  readonly value: number
  readonly inputsDigest: string
  readonly environment: { readonly typescript: string; readonly node: string }
  readonly timestamp: string
  readonly defects: readonly Defect[]
  readonly byModule: Readonly<Record<string, number>>
  readonly byClass: Readonly<Record<string, number>>
}

/** Each classifier maps the program to defects; classifiers are the predicate
 *  implementations from the Definitions section, wired to their stated inputs. */
export type Classifier = (program: ts.Program, modules: readonly ts.SourceFile[]) => Defect[]

export function measure(tsconfigPath: string, classifiers: readonly Classifier[]): Record_ {
  // 1. measured program
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
  if (configFile.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(configFile.error.messageText, "\n"))
  }
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(tsconfigPath))
  const program = ts.createProgram(parsed.fileNames, parsed.options)
  // 2. modules, sorted
  const modules = program
    .getSourceFiles()
    .filter((file) => !file.isDeclarationFile && !program.isSourceFileFromExternalLibrary(file))
    .sort((a, b) => (a.fileName < b.fileName ? -1 : 1))
  // 3–5. classifiers (each encapsulates steps 3 and 4 it needs), sorted output
  const defects = classifiers
    .flatMap((classifier) => classifier(program, modules))
    .sort((a, b) =>
      a.file !== b.file
        ? a.file < b.file
          ? -1
          : 1
        : a.start !== b.start
          ? a.start - b.start
          : a.class !== b.class
            ? a.class < b.class
              ? -1
              : 1
            : a.detail < b.detail
              ? -1
              : 1
    )
  // 6. aggregation
  const byModule: Record<string, number> = {}
  const byClass: Record<string, number> = {}
  for (const defect of defects) {
    byModule[defect.file] = (byModule[defect.file] ?? 0) + 1
    byClass[defect.class] = (byClass[defect.class] ?? 0) + 1
  }
  // 7. digest + record
  const hash = createHash("sha256")
  for (const file of modules) {
    hash.update(file.fileName)
    hash.update(createHash("sha256").update(file.text).digest("hex"))
  }
  hash.update(fs.readFileSync(tsconfigPath, "utf8"))
  return {
    metric: "abstraction-defect-count",
    unit: "defects",
    value: defects.length,
    inputsDigest: hash.digest("hex"),
    environment: { typescript: ts.version, node: process.version },
    timestamp: new Date().toISOString(),
    defects,
    byModule,
    byClass
  }
}
```

### Decomposition

The aggregate attributes every [abstraction defect](#abstraction-defect) to exactly one
[module](#module) — its anchor `file` — and exactly one [defect class](#defect-class) — its
`class` key — using the same anchors the classifiers themselves emit. The composition law is
plain addition over a partition:

- `value = Σ_module byModule[module] = Σ_class byClass[class] = defects.length`

Because anchoring is part of each classifier's definition (the classified declaration for
declaration-anchored classes; the first occurrence plus one defect per extra module for
`dup-sequence`; the first supporting declaration per cluster for `prim-cluster`), the
decomposition cannot drift from the aggregate: both are folds over the identical defect list, and
`isConsistentRecord` (see [measurement record](#measurement-record)) rejects any record where the
partition sums disagree. Optimization targets the largest `byClass` entries first, then within a
class the [modules](#module) with the largest `byModule` share of that class.

### Baseline and regression tracking

**Record format.** The [measurement record](#measurement-record) JSON, stored at
`docs/baselines/abstraction-defect-count.json` (or any pinned path), one record per commit under
comparison. The complete example record in the
[measurement record](#measurement-record) definition is the normative format.

**Comparison procedure.** Two records are comparable iff their `environment` fields are equal;
otherwise re-measure — never compare across compiler versions, because checker output (hence
classifier output) may legitimately differ. For comparable records `before` and `after`:

- **improvement** iff `after.value < before.value`
- **regression** iff `after.value > before.value`
- **no-change** iff `after.value === before.value`

The [noise floor](#noise-floor) is zero, so every non-zero difference is real. When
`inputsDigest` is unchanged, `value` must be identical; a differing `value` under an identical
digest is a measurer bug, not a measurement.

```ts
// compare.ts — the comparison procedure
import fs from "node:fs"

interface EnvironmentInfo {
  readonly typescript: string
  readonly node: string
}
interface BaselineRecord {
  readonly value: number
  readonly inputsDigest: string
  readonly environment: EnvironmentInfo
}

export type Verdict = "improvement" | "regression" | "no-change"

export function compare(beforePath: string, afterPath: string): Verdict {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as BaselineRecord
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as BaselineRecord
  if (
    before.environment.typescript !== after.environment.typescript ||
    before.environment.node !== after.environment.node
  ) {
    throw new Error("not comparable: environments differ; re-measure under one environment")
  }
  if (before.inputsDigest === after.inputsDigest && before.value !== after.value) {
    throw new Error("measurer bug: identical inputs produced different values")
  }
  return after.value < before.value ? "improvement" : after.value > before.value ? "regression" : "no-change"
}
```

## Optimization

Levers are ordered by expected impact per unit of change risk: pure removals first (they delete
indirection and can be verified by the compiler alone), boundary repairs next, and additive
extractions — which create new declarations and thus carry design risk — last.

### Collapse pass-through wrapper

A [pass-through function](#pass-through-function) MUST be removed by retargeting every
[call site](#call-site) to its [resolved callee](#resolved-callee) and deleting the wrapper.

#### Applicability

The [measurement record](#measurement-record) has `byClass["pass-through"] > 0`. The lever
applies to each defect with `class === "pass-through"`, located by its anchor.

#### Effect on metric

Each collapsed wrapper removes exactly one `pass-through` defect: the classifier's subject
declaration ceases to exist and no classifier counts call retargeting. Predicted change:
−1 defect per application; −`byClass["pass-through"]` when applied exhaustively. The degradation
mechanism this reverses is layer accretion: wrappers added "for future flexibility" that forward
unchanged and make every reader traverse one extra hop to find behavior.

#### Trade-offs

If many call sites import the wrapper's module but not the callee's, retargeting adds import
edges — module coupling, measurable by an import-graph metric, can rise. If the wrapper was the
only entry-surface exposure of the callee, deleting it without re-exporting the callee shrinks
the public API; detect via the entry-surface cardinality companion measurement (see
[Invariants against gaming](#invariants-against-gaming)).

**Before:**

```ts
// file: src/save.ts
export function persist(key: string, value: string): boolean {
  return key.length > 0 && value.length > 0
}

// pass-through wrapper: forwards both parameters, identical types
export function save(key: string, value: string): boolean {
  return persist(key, value)
}

// file: src/caller.ts (inlined here for a self-contained example)
export const ok = save("a", "b")
```

**After:**

```ts
// file: src/save.ts
export function persist(key: string, value: string): boolean {
  return key.length > 0 && value.length > 0
}

// wrapper deleted; the caller retargets to the callee
export const ok = persist("a", "b")
```

#### Confirmation

Measure, apply the collapse, measure again. Success: `byClass["pass-through"]` decreased by the
number of collapsed wrappers, total `value` decreased by the same amount, and no other class
increased — exceeding the zero [noise floor](#noise-floor) — with all applicable invariants
holding.

**Confirmation implementation:**

```ts
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
}

export function confirmCollapse(beforePath: string, afterPath: string, collapsed: number): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  const targetDropped =
    (before.byClass["pass-through"] ?? 0) - (after.byClass["pass-through"] ?? 0) === collapsed
  const totalDropped = before.value - after.value === collapsed
  const noClassRose = Object.keys({ ...before.byClass, ...after.byClass }).every(
    (key) => (after.byClass[key] ?? 0) <= (before.byClass[key] ?? 0) || key === "pass-through"
  )
  return targetDropped && totalDropped && noClassRose
}
```

### Collapse pass-through service member

A [pass-through service member](#pass-through-service-member) SHOULD be removed by deleting the
facade member (or the whole facade [service tag](#service-tag) when all members are
pass-through) and letting consumers depend on the wrapped service directly.

#### Applicability

`byClass["pass-through-svc"] > 0`. When every member of one facade's layer object literal appears
among the defects, the whole tag is removable; otherwise remove per-member.

#### Effect on metric

Each removed facade member deletes one `pass-through-svc` defect. Deleting a whole facade also
removes its tag from consumers' requirement channels, which can additionally remove `req-leak`
defects anchored on it. Predicted change: −1 per member, plus any `req-leak` co-removals. The
degradation mechanism reversed is service indirection stacking: wrapping a service in a
same-shaped service doubles the layer graph without adding a contract.

#### Trade-offs

SHOULD, not MUST: a facade whose members are pass-through *today* may exist to become an
aggregation point; keeping it is justified only by a concrete queued change, and until that
change lands the defect stands. Removing the facade widens consumers' visible dependency (they
now name the inner service); if the inner tag was internal, promotion to the
[entry surface](#entry-surface) may be needed — detect via `req-leak` counts in the after-record.

**Before:**

```ts
import { Context, Effect, Layer } from "effect"

class UserStore extends Context.Service<UserStore, {
  readonly get: (id: string) => Effect.Effect<string>
}>()("UserStore") {}

class Users extends Context.Service<Users, {
  readonly get: (id: string) => Effect.Effect<string>
}>()("Users") {}

export const UserStoreLive = Layer.succeed(UserStore, {
  get: (id: string) => Effect.succeed(`user:${id}`)
})

// facade layer: every member forwards to UserStore — pass-through service member
export const UsersLive = (store: Context.Service.Shape<typeof UserStore>) =>
  Layer.succeed(Users, {
    get: (id: string) => store.get(id)
  })

export const lookup = (id: string): Effect.Effect<string, never, Users> =>
  Effect.gen(function* () {
    const users = yield* Users
    return yield* users.get(id)
  })
```

**After:**

```ts
import { Context, Effect, Layer } from "effect"

class UserStore extends Context.Service<UserStore, {
  readonly get: (id: string) => Effect.Effect<string>
}>()("UserStore") {}

export const UserStoreLive = Layer.succeed(UserStore, {
  get: (id: string) => Effect.succeed(`user:${id}`)
})

// facade deleted; the consumer depends on the real service
export const lookup = (id: string): Effect.Effect<string, never, UserStore> =>
  Effect.gen(function* () {
    const store = yield* UserStore
    return yield* store.get(id)
  })
```

#### Confirmation

Measure before and after. Success: `byClass["pass-through-svc"]` decreased by the number of
removed members, total `value` decreased at least that much (co-removed `req-leak` defects may
increase the drop), and no class increased, with all applicable invariants holding.

**Confirmation implementation:**

```ts
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
}

export function confirmFacadeRemoval(beforePath: string, afterPath: string, removed: number): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  const facadeDropped =
    (before.byClass["pass-through-svc"] ?? 0) - (after.byClass["pass-through-svc"] ?? 0) === removed
  const totalDropped = before.value - after.value >= removed
  const noClassRose = Object.keys({ ...before.byClass, ...after.byClass }).every(
    (key) => (after.byClass[key] ?? 0) <= (before.byClass[key] ?? 0)
  )
  return facadeDropped && totalDropped && noClassRose
}
```

### Delete rename-only error wrapper

A [rename-only error wrapper](#rename-only-error-wrapper) MUST be deleted, letting the wrapped
[tagged failure](#tagged-failure) flow through the [error channel](#effect-channels) unchanged.

#### Applicability

`byClass["rename-wrapper"] > 0`. Applies to each anchored wrapper class; the transformation
removes the class, the `Effect.mapError` (or equivalent) that constructed it, and rewrites
`catchTag` handlers from the wrapper's tag to the wrapped tag.

#### Effect on metric

Removes one `rename-wrapper` defect per deleted class. The degradation mechanism reversed is
failure re-tagging: each layer inventing a synonym for the same failure forces callers to learn
two names for one condition and adds a mapping step that can silently drop fields. No other class
is affected: the wrapped tag already satisfied [tagged failure](#tagged-failure), so
`untagged-error` cannot rise.

#### Trade-offs

The wrapped failure's tag becomes part of the outer contract: if the inner failure type later
changes, outer callers see the change directly (less insulation). That insulation was the
wrapper's only value and it carried zero information; if genuine insulation is wanted, the fix is
a wrapper that *adds* fields — which the classifier already excludes. Detect over-deletion by the
behavior-preservation invariant (tests still pass).

**Before:**

```ts
import { Effect, Schema } from "effect"

class DiskFull extends Schema.TaggedErrorClass<DiskFull>()("DiskFull", {
  bytesNeeded: Schema.Number
}) {}

// rename-only wrapper: single `cause` field holding an already-tagged failure
class StorageError extends Schema.TaggedErrorClass<StorageError>()("StorageError", {
  cause: Schema.instanceOf(DiskFull)
}) {}

const writeRaw = (bytes: number): Effect.Effect<void, DiskFull> =>
  bytes > 100 ? Effect.fail(new DiskFull({ bytesNeeded: bytes })) : Effect.void

export const write = (bytes: number): Effect.Effect<void, StorageError> =>
  Effect.mapError(writeRaw(bytes), (cause) => new StorageError({ cause }))
```

**After:**

```ts
import { Effect, Schema } from "effect"

class DiskFull extends Schema.TaggedErrorClass<DiskFull>()("DiskFull", {
  bytesNeeded: Schema.Number
}) {}

// wrapper and mapError deleted: the tagged failure flows through unchanged
export const write = (bytes: number): Effect.Effect<void, DiskFull> =>
  bytes > 100 ? Effect.fail(new DiskFull({ bytesNeeded: bytes })) : Effect.void
```

#### Confirmation

Measure before and after. Success: `byClass["rename-wrapper"]` decreased by the number of deleted
wrappers, total `value` decreased by the same amount, `byClass["untagged-error"]` did not
increase, and all applicable invariants hold.

**Confirmation implementation:**

```ts
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
}

export function confirmWrapperDeletion(beforePath: string, afterPath: string, deleted: number): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  return (
    (before.byClass["rename-wrapper"] ?? 0) - (after.byClass["rename-wrapper"] ?? 0) === deleted &&
    before.value - after.value === deleted &&
    (after.byClass["untagged-error"] ?? 0) <= (before.byClass["untagged-error"] ?? 0)
  )
}
```

### Remove speculative option

A [speculative option](#speculative-option) MUST be removed: delete the never-supplied optional
parameter or property and inline its default where the body consumed it.

#### Applicability

`byClass["spec-option"] > 0`. Applies to each anchored optional parameter/property. Because the
classifier already verified zero supplying sites, the removal cannot break any
[call site](#call-site) in the [measured program](#measured-program).

#### Effect on metric

Removes one `spec-option` defect per deleted option. The degradation mechanism reversed is
configuration accretion: options added "in case," which every reader must consider and every test
matrix must (but never does) cover. Removing the option also deletes the dead default-branch in
the body, which can shrink [normalized call sequences](#normalized-call-sequence) but never
creates a new duplicated window (removal only shortens sequences).

#### Trade-offs

For a published library, external callers invisible to the
[measured program](#measured-program) may supply the option; this is validity gap (3) of the
[Metric](#metric) — include consumer/example/test files in the tsconfig before trusting this
lever on published surfaces. No other measured property degrades: the change is a pure deletion
of unexercised surface.

**Before:**

```ts
// `theme` is never supplied anywhere in the program — speculative option
export function render(text: string, theme?: string): string {
  return theme === undefined ? text : `[${theme}] ${text}`
}
export const a = render("hello")
export const b = render("world")
```

**After:**

```ts
// option deleted; the dead branch went with it
export function render(text: string): string {
  return text
}
export const a = render("hello")
export const b = render("world")
```

#### Confirmation

Measure before and after. Success: `byClass["spec-option"]` decreased by the number of removed
options, total `value` decreased by at least that amount, no class increased, and all applicable
invariants hold.

**Confirmation implementation:**

```ts
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
}

export function confirmOptionRemoval(beforePath: string, afterPath: string, removed: number): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  return (
    (before.byClass["spec-option"] ?? 0) - (after.byClass["spec-option"] ?? 0) === removed &&
    before.value - after.value >= removed &&
    Object.keys({ ...before.byClass, ...after.byClass }).every(
      (key) => (after.byClass[key] ?? 0) <= (before.byClass[key] ?? 0)
    )
  )
}
```

### Monomorphize speculative type parameter

A [speculative type parameter](#speculative-type-parameter) SHOULD be replaced by its single
observed [instantiation](#instantiation) (or by its constraint when no instantiation exists),
deleting the type parameter list entry.

#### Applicability

`byClass["spec-type-param"] > 0`. Applies per anchored declaration and type parameter; the
replacement type is the single member of the recorded instantiation set, available in the
defect's `detail`.

#### Effect on metric

Removes one `spec-type-param` defect per monomorphized parameter. The degradation mechanism
reversed is speculative generality: a generic reads as "works for all T" when the program means
"works for `string`" — the reader pays quantifier cost with no payer on the other side. No other
class can rise: replacing a type parameter with a concrete type changes no call structure and no
export set.

#### Trade-offs

SHOULD, not MUST: validity gap (3) again — external consumers of a published package may
instantiate differently; close the gap by widening the tsconfig before applying. Re-generalizing
later, when a second concrete type actually appears, is a mechanical inverse; the cost of
carrying the concrete version until then is zero by this metric.

**Before:**

```ts
// T is referenced in two positions but only ever bound to `string` — speculative
export function dedupe<T>(items: readonly T[]): T[] {
  return [...new Set(items)]
}
export const names = dedupe(["a", "a", "b"])
```

**After:**

```ts
// monomorphized to the single observed instantiation
export function dedupe(items: readonly string[]): string[] {
  return [...new Set(items)]
}
export const names = dedupe(["a", "a", "b"])
```

#### Confirmation

Measure before and after. Success: `byClass["spec-type-param"]` decreased by the number of
monomorphized parameters, total `value` decreased by the same amount, no class increased, and all
applicable invariants hold.

**Confirmation implementation:**

```ts
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
}

export function confirmMonomorphize(beforePath: string, afterPath: string, count: number): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  return (
    (before.byClass["spec-type-param"] ?? 0) - (after.byClass["spec-type-param"] ?? 0) === count &&
    before.value - after.value === count &&
    Object.keys({ ...before.byClass, ...after.byClass }).every(
      (key) => (after.byClass[key] ?? 0) <= (before.byClass[key] ?? 0)
    )
  )
}
```

### Inline single-conformance interface

A [single-conformance interface](#single-conformance-interface) SHOULD be deleted, with usages
retyped to the concrete realization's type (`typeof value` for a conforming object, the class
type for a conforming class).

#### Applicability

`byClass["single-conformance"] > 0`. Applies per anchored interface. Not applicable when the
single [conformance site](#conformance-site) is in test code and the interface's purpose is a
test seam for a production value — in that case the deterministic resolution is the opposite
edit: add the production conformance the tests substitute for, which also clears the defect by
raising the count to 2. Both edits are decidable from the defect's conformance list without
judgment: one conformance in a file compiled only by a test tsconfig → add the production
conformance; otherwise → inline.

#### Effect on metric

Removes one `single-conformance` defect per inlined interface. The degradation mechanism
reversed is indirection without variation: an interface promising polymorphism that has exactly
one realization taxes navigation (every "go to implementation" is a two-step hop) and invites
drift between the interface and its only implementation.

#### Trade-offs

Deleting the interface couples consumers to the concrete type's inferred shape; a future second
implementation must reintroduce the interface (mechanical, compiler-guided). If the interface was
on the [entry surface](#entry-surface), deleting it shrinks the public API — the entry-surface
cardinality companion (see [Invariants against gaming](#invariants-against-gaming)) flags
unintended shrinkage.

**Before:**

```ts
import { Effect } from "effect"

// one realization in the whole program — single-conformance interface
export interface Mailer {
  send(to: string): Effect.Effect<void>
}
export const smtpMailer: Mailer = {
  send: (to) => Effect.sync(() => console.log(`mail to ${to}`))
}
export const notify = (mailer: Mailer, to: string): Effect.Effect<void> => mailer.send(to)
```

**After:**

```ts
import { Effect } from "effect"

// interface deleted; consumers use the concrete value's type
export const smtpMailer = {
  send: (to: string): Effect.Effect<void> => Effect.sync(() => console.log(`mail to ${to}`))
}
export const notify = (mailer: typeof smtpMailer, to: string): Effect.Effect<void> =>
  mailer.send(to)
```

#### Confirmation

Measure before and after. Success: `byClass["single-conformance"]` decreased by the number of
inlined interfaces, total `value` decreased by the same amount, no class increased, and all
applicable invariants hold.

**Confirmation implementation:**

```ts
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
}

export function confirmInline(beforePath: string, afterPath: string, inlined: number): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  return (
    (before.byClass["single-conformance"] ?? 0) - (after.byClass["single-conformance"] ?? 0) ===
      inlined &&
    before.value - after.value === inlined &&
    Object.keys({ ...before.byClass, ...after.byClass }).every(
      (key) => (after.byClass[key] ?? 0) <= (before.byClass[key] ?? 0)
    )
  )
}
```

### Tag the error channel

An [untagged error channel](#untagged-error-channel) MUST be replaced by a
[tagged failure](#tagged-failure) declared with `Schema.TaggedErrorClass`, converting the raw
failure at the point where it enters the effect.

#### Applicability

`byClass["untagged-error"] > 0`. Applies per anchored
[Effect-returning declaration](#effect-returning-declaration); the conversion point is the
`Effect.fail`, `Effect.tryPromise`, or upstream call that introduced the untagged constituent.

#### Effect on metric

Removes one `untagged-error` defect per retyped declaration. The degradation mechanism reversed
is failure-contract erosion: an `E` of `Error`/`unknown` makes every caller's recovery code
structure-sniff, and each new failure cause silently widens what "error" means. The new class is
not a [rename-only error wrapper](#rename-only-error-wrapper) because its `cause` field wraps an
*untagged* value — the classifier's exclusion — so `rename-wrapper` cannot rise.

#### Trade-offs

Adds one exported class per failure kind (public surface grows — visible in the entry-surface
cardinality companion, and intended here). Callers previously matching on `instanceof Error`
must migrate to `Effect.catchTag`; the compiler enumerates every such site as a type error.

**Before:**

```ts
import { Effect } from "effect"

// untagged error channel: E = Error
export const fetchUser = (id: string): Effect.Effect<string, Error> =>
  Effect.tryPromise({
    try: async () => `user:${id}`,
    catch: (cause) => new Error(String(cause))
  })
```

**After:**

```ts
import { Effect, Schema } from "effect"

// the failure enters the effect already tagged
export class FetchUserFailed extends Schema.TaggedErrorClass<FetchUserFailed>()(
  "FetchUserFailed",
  { cause: Schema.Defect() }
) {}

export const fetchUser = (id: string): Effect.Effect<string, FetchUserFailed> =>
  Effect.tryPromise({
    try: async () => `user:${id}`,
    catch: (cause) => new FetchUserFailed({ cause })
  })
```

#### Confirmation

Measure before and after. Success: `byClass["untagged-error"]` decreased by the number of retyped
declarations, total `value` decreased by at least that amount, `byClass["rename-wrapper"]` did
not increase, the defect-conversion invariant holds (no compensating `orDie` inflation — see
[Invariants against gaming](#invariants-against-gaming)), and all other applicable invariants
hold.

**Confirmation implementation:**

```ts
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
}

export function confirmTagging(beforePath: string, afterPath: string, retyped: number): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  return (
    (before.byClass["untagged-error"] ?? 0) - (after.byClass["untagged-error"] ?? 0) === retyped &&
    before.value - after.value >= retyped &&
    (after.byClass["rename-wrapper"] ?? 0) <= (before.byClass["rename-wrapper"] ?? 0)
  )
}
```

### Repair requirement leakage

A declaration with [requirement leakage](#requirement-leakage) MUST either re-export the leaked
[service tag](#service-tag) from the [package entry](#package-entry) (when callers are meant to
provide it) or provide the service internally via `Effect.provide` so the tag leaves the
requirement channel (when it is an implementation detail).

#### Applicability

`byClass["req-leak"] > 0`. The branch is decidable from measurement output: if any [module](#module)
outside the tag's own package constructs a `Layer` for the tag (an object literal contextually
typed by its shape appears there), callers provide it → re-export; if every layer for the tag is
constructed inside the package → provide internally.

#### Effect on metric

Removes one `req-leak` defect per repaired (declaration, tag) pair. The degradation mechanism
reversed is dependency-contract leakage: the public effect demands a capability its callers
cannot even name via the entry, so wiring knowledge diffuses into deep imports. The re-export
branch also cannot create `leaky-signature` defects for the same symbol, since promotion puts the
tag on the [entry surface](#entry-surface) used by both classifiers.

#### Trade-offs

Re-exporting widens the public API (entry-surface cardinality rises by exactly the promoted
tags — the leakage-repair invariant bounds this). Providing internally fixes the implementation
choice at the boundary: tests that substituted the service through `R` must now substitute at a
narrower seam; detect via the behavior-preservation invariant (test suite must still pass).

**Before:**

```ts
// file: src/internal/clock.ts
import { Context } from "effect"
export class Clock extends Context.Service<Clock, { readonly now: () => number }>()("Clock") {}

// file: src/index.ts (package entry)
export { timestamp } from "./time.js"

// file: src/time.ts
import { Effect } from "effect"
import { Clock } from "./internal/clock.js"
// requirement leakage: public effect, internal tag in R
export const timestamp: Effect.Effect<number, never, Clock> = Effect.gen(function* () {
  const clock = yield* Clock
  return clock.now()
})
```

**After:**

```ts
// file: src/internal/clock.ts
import { Context } from "effect"
export class Clock extends Context.Service<Clock, { readonly now: () => number }>()("Clock") {}

// file: src/index.ts (package entry)
export { timestamp } from "./time.js"
// re-export branch: the tag joins the entry surface, so callers can name and provide it
export { Clock } from "./internal/clock.js"

// file: src/time.ts
import { Effect } from "effect"
import { Clock } from "./internal/clock.js"
export const timestamp: Effect.Effect<number, never, Clock> = Effect.gen(function* () {
  const clock = yield* Clock
  return clock.now()
})
```

#### Confirmation

Measure before and after. Success: `byClass["req-leak"]` decreased by the number of repaired
pairs, total `value` decreased by at least that amount, and (re-export branch) the entry-surface
cardinality grew by no more than the number of promoted tags, with all applicable invariants
holding.

**Confirmation implementation:**

```ts
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
}

export function confirmRequirementRepair(
  beforePath: string,
  afterPath: string,
  repaired: number,
  surfaceGrowth: number // measured entry-surface cardinality delta
): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  return (
    (before.byClass["req-leak"] ?? 0) - (after.byClass["req-leak"] ?? 0) === repaired &&
    before.value - after.value >= repaired &&
    surfaceGrowth <= repaired
  )
}
```

### Seal the leaky signature

A [leaky signature](#leaky-signature) MUST either re-export the leaked type from the
[package entry](#package-entry) (when the type is part of the intended contract) or narrow the
signature so the [signature surface](#signature-surface) no longer references the
[internal declaration](#internal-declaration).

#### Applicability

`byClass["leaky-signature"] > 0`. The branch is decidable from measurement output: if the leaked
type appears in ≥ 2 distinct entry-surface signatures, it is contract vocabulary → re-export;
if it appears in exactly one, narrow that signature (return a structural subset, or accept
narrower inputs) so the reference disappears.

#### Effect on metric

Removes one `leaky-signature` defect per repaired (declaration, symbol) pair — by promotion
(the symbol stops being internal) or by narrowing (the reference stops existing). The degradation
mechanism reversed is boundary erosion: public signatures quietly grow tendrils into private
types, so "internal" stops meaning anything and every internal refactor breaks callers.

#### Trade-offs

Promotion widens the public API (bounded by the leakage-repair invariant). Narrowing can lose
information callers used structurally; the compiler surfaces each such caller as a type error.

**Before:**

```ts
// file: src/internal/plan.ts — internal type
export interface Plan {
  readonly steps: readonly string[]
  readonly seed: number
}

// file: src/index.ts (package entry)
export { makePlan } from "./planner.js"

// file: src/planner.ts
import type { Plan } from "./internal/plan.js"
// leaky signature: entry-surface function returning an internal type
export function makePlan(goal: string): Plan {
  return { steps: [goal], seed: 7 }
}
```

**After:**

```ts
// file: src/index.ts (package entry)
export { makePlan } from "./planner.js"

// file: src/planner.ts
// narrowing branch: the public return type is now declared at the boundary itself,
// and the internal `Plan` (with its private `seed`) no longer appears in the surface
export interface PlanView {
  readonly steps: readonly string[]
}
export function makePlan(goal: string): PlanView {
  const plan = { steps: [goal], seed: 7 }
  return { steps: plan.steps }
}
```

#### Confirmation

Measure before and after. Success: `byClass["leaky-signature"]` decreased by the number of
repaired pairs, total `value` decreased by at least that amount, entry-surface growth is bounded
by the number of intentionally promoted types, and all applicable invariants hold.

**Confirmation implementation:**

```ts
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
}

export function confirmSeal(
  beforePath: string,
  afterPath: string,
  repaired: number,
  promoted: number,
  surfaceGrowth: number
): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  return (
    (before.byClass["leaky-signature"] ?? 0) - (after.byClass["leaky-signature"] ?? 0) === repaired &&
    before.value - after.value >= repaired &&
    surfaceGrowth <= promoted
  )
}
```

### Extract duplicated call sequence

A [duplicated call sequence](#duplicated-call-sequence) MUST be extracted into one named
[function-like declaration](#function-like-declaration) that every former occurrence calls.

#### Applicability

`byClass["dup-sequence"] > 0`. Applies per window group in the defect list; the extraction target
module is the common dependency-wise deepest module already imported by all occurrences, or the
callee-declaring module when all callees share one.

#### Effect on metric

Each extracted group removes (modules − 1) `dup-sequence` defects: after extraction the window's
identities exist only inside the new function's body — one module — so the ≥ 2-module condition
fails. The degradation mechanism reversed is the missing abstraction: an operation that exists in
the team's vocabulary ("load config") but not in the code, so each module re-derives its steps
and they drift independently. The new function is not a
[pass-through function](#pass-through-function) (its body has three calls, failing shape (a)), so
`pass-through` cannot rise.

#### Trade-offs

Adds one declaration and new import edges from each former occurrence — module coupling can rise.
If the occurrences were about to diverge legitimately, extraction forces a premature
parameterization; the observable warning sign is the extracted function immediately growing
[speculative options](#speculative-option), which the next measurement prices.

**Before:**

```ts
function connect(): number {
  return 1
}
function authenticate(session: number): number {
  return session + 1
}
function fetchProfile(session: number): string {
  return `p${session}`
}

// file: src/a.ts — occurrence 1 of [connect, authenticate, fetchProfile]
export function showProfile(): string {
  const session = connect()
  const authed = authenticate(session)
  return fetchProfile(authed)
}

// file: src/b.ts — occurrence 2, different module: duplicated call sequence
export function exportProfile(): string {
  const s = connect()
  const a = authenticate(s)
  return fetchProfile(a)
}
```

**After:**

```ts
function connect(): number {
  return 1
}
function authenticate(session: number): number {
  return session + 1
}
function fetchProfile(session: number): string {
  return `p${session}`
}

// the unnamed operation gets a name; the window now lives in exactly one module
export function loadProfile(): string {
  const session = connect()
  const authed = authenticate(session)
  return fetchProfile(authed)
}

// file: src/a.ts
export function showProfile(): string {
  return loadProfile()
}

// file: src/b.ts
export function exportProfile(): string {
  return loadProfile()
}
```

(The callers above forward zero of their own parameters — `loadProfile` takes none — so they do
not satisfy [pass-through function](#pass-through-function), which requires ≥ 1 parameter; in
real extractions callers typically add their own surrounding logic.)

#### Confirmation

Measure before and after. Success: `byClass["dup-sequence"]` decreased by the group's
(modules − 1), total `value` decreased by at least that amount, `byClass["pass-through"]` did not
increase, the extraction-reference invariant holds (the new function is called from ≥ 2 former
occurrence modules), and all other applicable invariants hold.

**Confirmation implementation:**

```ts
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
}

export function confirmExtraction(
  beforePath: string,
  afterPath: string,
  removedWindows: number,
  extractedCalledFromModules: number // measured references to the new function
): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  return (
    (before.byClass["dup-sequence"] ?? 0) - (after.byClass["dup-sequence"] ?? 0) === removedWindows &&
    before.value - after.value >= removedWindows &&
    (after.byClass["pass-through"] ?? 0) <= (before.byClass["pass-through"] ?? 0) &&
    extractedCalledFromModules >= 2
  )
}
```

### Introduce domain type for primitive cluster

A [primitive parameter cluster](#primitive-parameter-cluster) SHOULD be replaced by one named
type — an interface or a `Schema.Class` when the boundary needs validation — threaded through
every supporting signature.

#### Applicability

`byClass["prim-cluster"] > 0`. Applies per cluster in the defect list; the new type's fields are
exactly the cluster's `(name, type)` pairs; the supporting declarations to rewrite are recorded
with the cluster.

#### Effect on metric

Removes one `prim-cluster` defect per introduced type: the supporting signatures drop below three
shared primitive pairs (the pairs become one object parameter). The degradation mechanism
reversed is primitive obsession: a domain concept exists only as a positional convention, so
argument transposition compiles (`geocode(city, street, zip)`) and every signature re-documents
the convention.

#### Trade-offs

Call sites must construct the object (slightly more tokens per call). If the new type is used by
entry-surface signatures but not itself re-exported, it immediately becomes a
[leaky signature](#leaky-signature) defect — the confirmation checks that class did not rise.

**Before:**

```ts
// (street, city, zip) co-occur in three exported signatures — primitive cluster
export function geocode(street: string, city: string, zip: string): string {
  return `${street},${city},${zip}`
}
export function validateAddress(street: string, city: string, zip: string): boolean {
  return street !== "" && city !== "" && zip.length === 5
}
export function printLabel(name: string, street: string, city: string, zip: string): string {
  return `${name}\n${street}\n${city} ${zip}`
}
```

**After:**

```ts
// the traveling primitives get a name
export interface Address {
  readonly street: string
  readonly city: string
  readonly zip: string
}
export function geocode(address: Address): string {
  return `${address.street},${address.city},${address.zip}`
}
export function validateAddress(address: Address): boolean {
  return address.street !== "" && address.city !== "" && address.zip.length === 5
}
export function printLabel(name: string, address: Address): string {
  return `${name}\n${address.street}\n${address.city} ${address.zip}`
}
```

#### Confirmation

Measure before and after. Success: `byClass["prim-cluster"]` decreased by the number of clusters
addressed, total `value` decreased by at least that amount, `byClass["leaky-signature"]` and
`byClass["single-conformance"]` did not increase, and all applicable invariants hold.

**Confirmation implementation:**

```ts
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
}

export function confirmDomainType(beforePath: string, afterPath: string, clusters: number): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  return (
    (before.byClass["prim-cluster"] ?? 0) - (after.byClass["prim-cluster"] ?? 0) === clusters &&
    before.value - after.value >= clusters &&
    (after.byClass["leaky-signature"] ?? 0) <= (before.byClass["leaky-signature"] ?? 0) &&
    (after.byClass["single-conformance"] ?? 0) <= (before.byClass["single-conformance"] ?? 0)
  )
}
```

### Split fragmented interface

A [fragmented interface](#fragmented-interface) SHOULD be split into one interface (or
[service tag](#service-tag)) per connected component of its consumer–member graph, with each
[interface consumer](#interface-consumer) retyped to the component it uses.

#### Applicability

`byClass["fragmented-iface"] > 0`. Applies per anchored interface; the split boundaries are
exactly the measured connected components — no judgment call, the graph decides the partition.

#### Effect on metric

Removes one `fragmented-iface` defect per split: each resulting interface has a connected usage
graph by construction. The degradation mechanism reversed is concern conflation: one name binding
independent capabilities, so every consumer depends on (and every test fake must implement)
members it never uses.

#### Trade-offs

More names on the [entry surface](#entry-surface) (one per component). A consumer that later
needs both components must require both — that is the honest dependency statement, not a
regression. Over-splitting is not possible under this lever: the partition is the measured
component set, never finer.

**Before:**

```ts
import { Effect } from "effect"

// two disjoint consumer groups share one name — fragmented interface
export interface Platform {
  readFile(path: string): Effect.Effect<string>
  writeFile(path: string, data: string): Effect.Effect<void>
  getEnv(name: string): Effect.Effect<string>
  setEnv(name: string, value: string): Effect.Effect<void>
}

export const copy = (platform: Platform, from: string, to: string): Effect.Effect<void> =>
  Effect.flatMap(platform.readFile(from), (data) => platform.writeFile(to, data))

export const promoteEnv = (platform: Platform, name: string): Effect.Effect<void> =>
  Effect.flatMap(platform.getEnv(name), (value) => platform.setEnv(`${name}_COPY`, value))
```

**After:**

```ts
import { Effect } from "effect"

// one interface per measured component
export interface FileSystem {
  readFile(path: string): Effect.Effect<string>
  writeFile(path: string, data: string): Effect.Effect<void>
}
export interface Environment {
  getEnv(name: string): Effect.Effect<string>
  setEnv(name: string, value: string): Effect.Effect<void>
}

export const copy = (fs: FileSystem, from: string, to: string): Effect.Effect<void> =>
  Effect.flatMap(fs.readFile(from), (data) => fs.writeFile(to, data))

export const promoteEnv = (env: Environment, name: string): Effect.Effect<void> =>
  Effect.flatMap(env.getEnv(name), (value) => env.setEnv(`${name}_COPY`, value))
```

#### Confirmation

Measure before and after. Success: `byClass["fragmented-iface"]` decreased by the number of
splits, total `value` decreased by at least that amount, `byClass["single-conformance"]` did not
increase (each split part must retain ≥ 2 [conformance sites](#conformance-site) or be a pure
data shape), and all applicable invariants hold.

**Confirmation implementation:**

```ts
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
}

export function confirmSplit(beforePath: string, afterPath: string, splits: number): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  return (
    (before.byClass["fragmented-iface"] ?? 0) - (after.byClass["fragmented-iface"] ?? 0) === splits &&
    before.value - after.value >= splits &&
    (after.byClass["single-conformance"] ?? 0) <= (before.byClass["single-conformance"] ?? 0)
  )
}
```

### Replace cross-module cast with a decoded boundary

A [cross-module cast](#cross-module-cast) MUST be replaced by a checked construction: a
`Schema.Class` decode at the boundary, or an explicit constructor function that produces the
target type from verified parts.

#### Applicability

`byClass["boundary-cast"] > 0`. Applies per anchored `as`-expression; the target type's declaring
module is where the constructor or schema belongs.

#### Effect on metric

Removes one `boundary-cast` defect per replaced cast. The degradation mechanism reversed is
abstraction bypass: the cast asserts another module's invariant without establishing it, so the
type system's guarantee for that abstraction is void everywhere downstream of the cast.

#### Trade-offs

Decoding does runtime work at the boundary (cost proportional to value size — measurable by a
performance benchmark) and can fail, adding a [tagged failure](#tagged-failure) to the boundary's
[error channel](#effect-channels); both are the honest price of an actually-established
invariant.

**Before:**

```ts
// file: src/order.ts
export interface Order {
  readonly id: string
  readonly total: number
}

// file: src/handler.ts
import type { Order } from "./order.js"

declare const payload: unknown

// cross-module cast: asserts Order's invariant without establishing it
export const order = payload as Order
```

**After:**

```ts
// file: src/order.ts
import { Effect, Schema } from "effect"

export class Order extends Schema.Class<Order>("Order")({
  id: Schema.String,
  total: Schema.Number
}) {}

// file: src/handler.ts
declare const payload: unknown

// checked construction: the boundary decodes, and failure is typed
export const order: Effect.Effect<Order, Schema.SchemaError> =
  Schema.decodeUnknownEffect(Order)(payload)
```

#### Confirmation

Measure before and after. Success: `byClass["boundary-cast"]` decreased by the number of replaced
casts, total `value` decreased by at least that amount, the cast-displacement invariant holds (no
new casts or identical-shape local type duplicates appeared — see
[Invariants against gaming](#invariants-against-gaming)), and all other applicable invariants
hold.

**Confirmation implementation:**

```ts
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
}

export function confirmDecodedBoundary(beforePath: string, afterPath: string, replaced: number): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  return (
    (before.byClass["boundary-cast"] ?? 0) - (after.byClass["boundary-cast"] ?? 0) === replaced &&
    before.value - after.value >= replaced
  )
}
```

### Diagnostic procedure

A deterministic map from a [measurement record](#measurement-record) and its decomposition to the
ordered list of applicable levers:

1. Read `byClass`. A lever is **applicable** iff its class key has a count > 0 (the branch
   conditions inside "Repair requirement leakage", "Seal the leaky signature", and "Inline
   single-conformance interface" are themselves decided from the record's defect details, as each
   `#### Applicability` states).
2. Order applicable levers by the fixed risk ranking below (the section order), breaking ties —
   two class keys mapping to one lever cannot occur, so ties cannot occur.
3. Within each lever, order target defects by descending `byModule[defect.file]`, then by the
   defect sort key `(file, start, class, detail)`.

```ts
// diagnose.ts — record in, ordered applicable levers out
import fs from "node:fs"

const LEVER_ORDER: ReadonlyArray<readonly [leverName: string, classKey: string]> = [
  ["Collapse pass-through wrapper", "pass-through"],
  ["Collapse pass-through service member", "pass-through-svc"],
  ["Delete rename-only error wrapper", "rename-wrapper"],
  ["Remove speculative option", "spec-option"],
  ["Monomorphize speculative type parameter", "spec-type-param"],
  ["Inline single-conformance interface", "single-conformance"],
  ["Tag the error channel", "untagged-error"],
  ["Repair requirement leakage", "req-leak"],
  ["Seal the leaky signature", "leaky-signature"],
  ["Extract duplicated call sequence", "dup-sequence"],
  ["Introduce domain type for primitive cluster", "prim-cluster"],
  ["Split fragmented interface", "fragmented-iface"],
  ["Replace cross-module cast with a decoded boundary", "boundary-cast"]
]

interface Record_ {
  readonly byClass: Readonly<Record<string, number>>
}

export function diagnose(recordPath: string): string[] {
  const record = JSON.parse(fs.readFileSync(recordPath, "utf8")) as Record_
  return LEVER_ORDER.filter(([, classKey]) => (record.byClass[classKey] ?? 0) > 0).map(
    ([leverName]) => leverName
  )
}
```

**Coverage audit.** Every [defect class](#defect-class) key appears in exactly one lever's
applicability condition (the table in `diagnose` is a bijection), so every detected degradation
has a lever and every lever is necessary for its class. Degradations the metric cannot detect are
exactly the stated validity gaps of the [Metric](#metric), not lever gaps.

## Invariants against gaming

A confirmation is valid only when the lever's primary success criterion **and every applicable
invariant below** hold simultaneously. Each invariant is measured with the same rigor as the
primary metric: deterministic inputs, zero [noise floor](#noise-floor), machine-comparable
outputs.

**G1 — Deleting covered functionality.** Gaming move: delete exported behavior (or whole
modules) to erase its defects. Invariant: **behavior preservation plus reference preservation** —
the project's test suite passes after the change, and every [entry surface](#entry-surface)
symbol that had ≥ 1 reference from another [module](#module) before still resolves after (its
references were migrated, not orphaned). Companion measurement: the count of externally
referenced entry-surface symbols; it must not decrease except by symbols the lever explicitly
deletes (wrappers, facades, rename-only wrappers, speculative options — each replaced by direct
use of what they forwarded to).

**G2 — Defeating the pass-through classifier with dead statements.** Gaming move: insert a
no-op statement (`const x = 0`) into a wrapper so shape (a) fails. The
[pass-through function](#pass-through-function) predicate already follows `const` aliases, so
alias-laundering fails; for non-alias dead statements, invariant: the count of statements whose
declared variable has zero references (checker-derived dead locals) must not increase across a
measurement pair.

**G3 — Shifting cost outside the measurement boundary.** Gaming move: move offending code into a
file excluded from the tsconfig, or behind a deep import from an unmeasured package. Invariant:
the [measured program](#measured-program)'s module set may only shrink by files whose deletion
G1 already licenses; comparison MUST reject an after-record whose module list (recoverable from
`byModule` keys plus the defect list) lost files while `value` dropped, unless those files'
content was migrated into surviving modules (their symbols resolve there). Mechanically: a
dropped module with any before-references from surviving modules requires those references to
resolve in the after-program.

**G4 — Splitting duplicated windows below the threshold.** Gaming move: reorder or interleave
no-op calls to break a length-3 window instead of extracting it. Invariant: across a pair where
`dup-sequence` decreased, the extraction-reference check of
[Extract duplicated call sequence](#extract-duplicated-call-sequence) must hold — a new or
existing shared function is referenced from ≥ 2 of the former occurrence modules. A `dup-sequence`
drop without such a shared callee is rejected.

**G5 — Laundering error channels through defects.** Gaming move: `Effect.orDie`/`Effect.die` on
untagged failures so `E` becomes `never` without designing the failure contract. Companion
measurement: the count of [call sites](#call-site) whose [resolved callee](#resolved-callee) is
the effect package's `orDie` or `die`. Invariant: when `untagged-error` decreases, this count
must not increase.

**G6 — Evading cross-module casts with local type twins.** Gaming move: re-declare a structurally
identical local type and cast to it (same-module casts are not counted), or chain
`as unknown as T`. The chain is already counted: `unknown` is assignable only to `unknown` and
`any`, so the outer cast's source still fails assignability to the foreign target and the
classifier counts it. For twins, companion measurement: the count
of pairs of interface/type-alias declarations in different modules whose canonical rendered type
text (`typeToString` under `NoTruncation`, members sorted) is identical. Invariant: when
`boundary-cast` decreases, this duplicate-type count must not increase.

**G7 — Exploiting aggregation.** Gaming move: merge many small modules into one giant module so
cross-module conditions (`dup-sequence`, `boundary-cast`) become intra-module and vanish.
Companion measurement: module count and the 95th-percentile module size in statements. Invariant:
across a pair, a decrease in cross-module defect classes accompanied by a decrease in module
count and an increase in p95 module size is rejected unless G1's reference-migration check shows
the merge preserved all symbols (in which case the merge is a real architectural decision to be
reviewed by the modularity metric, and this metric records the pair as **not confirmed** for any
lever — no lever names module merging as its transformation).

**G8 — Overfitting to fixed inputs.** Gaming move: none available through input choice — the
metric has no sampled or seeded inputs to overfit; its inputs are the entire program. The
remaining variant is tsconfig manipulation (excluding files), which G3 rejects.

**G9 — Trading one defect class for another.** Gaming move: apply a lever in a way that clears
its class while inflating a neighbor (e.g., "fixing" a leaky signature by re-exporting *every*
internal type, exploding the public API; or "extracting" duplication into a wrapper that is
itself pass-through). Invariants, both already embedded in confirmations: no non-target class may
increase where the lever's confirmation says so, and entry-surface cardinality growth is bounded
by the count of intentionally promoted symbols (`surfaceGrowth <= promoted`).

```ts
// invariants.ts — the conjunction gate every confirmation must pass
import fs from "node:fs"

interface Record_ {
  readonly value: number
  readonly byClass: Readonly<Record<string, number>>
  readonly byModule: Readonly<Record<string, number>>
}

export interface CompanionMeasurements {
  readonly testsPass: boolean //                      G1
  readonly referencedSurfaceSymbolsDelta: number //   G1 (allowed deletions already subtracted)
  readonly deadLocalsDelta: number //                 G2
  readonly droppedModulesUnmigrated: number //        G3
  readonly extractionReferenceHolds: boolean //       G4 (vacuously true when dup-sequence did not drop)
  readonly orDieCallDelta: number //                  G5 (checked when untagged-error dropped)
  readonly duplicateTypeTextDelta: number //          G6 (checked when boundary-cast dropped)
  readonly moduleMergeSuspicion: boolean //           G7
  readonly surfaceGrowth: number //                   G9
  readonly promotedSymbols: number //                 G9
}

export function invariantsHold(
  beforePath: string,
  afterPath: string,
  companions: CompanionMeasurements
): boolean {
  const before = JSON.parse(fs.readFileSync(beforePath, "utf8")) as Record_
  const after = JSON.parse(fs.readFileSync(afterPath, "utf8")) as Record_
  const dropped = (key: string): boolean => (after.byClass[key] ?? 0) < (before.byClass[key] ?? 0)
  return (
    companions.testsPass &&
    companions.referencedSurfaceSymbolsDelta >= 0 &&
    companions.deadLocalsDelta <= 0 &&
    companions.droppedModulesUnmigrated === 0 &&
    (!dropped("dup-sequence") || companions.extractionReferenceHolds) &&
    (!dropped("untagged-error") || companions.orDieCallDelta <= 0) &&
    (!dropped("boundary-cast") || companions.duplicateTypeTextDelta <= 0) &&
    !companions.moduleMergeSuspicion &&
    companions.surfaceGrowth <= companions.promotedSymbols
  )
}
```

**Counterexample audit.** (1) *Undetectable degradation:* renaming `Address` to `Thing` degrades
the property (a worse abstraction) with ADC unchanged — this is validity gap (1) of the
[Metric](#metric), stated as a residual gap; no invariant claims to cover naming. (2) *Detected
degradation with no lever:* impossible by construction — the `diagnose` table is a bijection over
[defect classes](#defect-class). (3) *Metric improvement that games the property:* each
enumerated move G1–G9 trips its invariant, and a confirmation is defined as primary criterion ∧
invariants, so a gamed improvement is never a confirmed improvement.
