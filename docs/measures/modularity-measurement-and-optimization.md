# Modularity measurement and optimization

## Informal definition

Modularity is the degree to which this codebase decomposes into units whose internals can change
without forcing changes elsewhere. A modular codebase has small, self-contained modules; narrow,
fully-used public surfaces; an acyclic dependency graph in which a change to one file can reach few
others; dependencies expressed as declared capabilities (Effect service keys in function
requirements) rather than hard-wired implementations; wiring (choosing implementations) concentrated
at program entry points; and contracts at module boundaries that are fully typed, including error
channels.

When modularity improves, the blast radius of a change shrinks: fewer files can be affected by an
edit to any given file, fewer symbols are exposed than consumed, fewer modules know which concrete
implementation of a capability they run against, and less behavior happens implicitly (at import
time, through globals, or through untyped values). When modularity degrades, the transitive closure
of the import graph densifies, cycles appear, god-modules accumulate wide and partially-dead export
surfaces, `Layer` values and `Effect.provide` calls leak out of entry points into business logic,
top-level statements do work at import time, `any` and untagged errors erode boundary contracts,
and equivalent type declarations get copy-pasted across modules.

The property is naturally expressed as a set of dimensionless ratios in [0, 1] over the resolved
module graph, the compiler's symbol tables, and the package manifests — for example "fraction of
ordered module pairs where one can reach the other" or "fraction of exported symbols never used".
The measurement below fixes eleven such ratios and averages them into a single score; the levers
each attack one observable degradation mechanism — cycles, barrels, dead surface, over-strong
imports, concrete coupling, scattered wiring, import-time effects, ambient state, boundary `any`,
untagged errors, duplicated types, and package-boundary bypasses — and each lever's effect is
confirmed by re-measuring.

Modularity here excludes: runtime performance, code style, test coverage, and the *semantic* quality
of an abstraction (whether an interface is well-designed). It measures only structural facts
derivable from source, types, resolved imports, and build configuration.

## Definitions

Multi-file examples below separate files with `// file:` comments; each file is an independently
type-checkable compilation unit against its stated imports.

### Project source set

The set of files the measurement is a function of: every source file in the TypeScript program
created from a named tsconfig, excluding files resolved from `node_modules` and files the compiler
marks as external-library files. Declaration files (`.d.ts`) inside the repository are members;
declaration files under `node_modules` are not.

**Mechanical predicate:** Inputs: a tsconfig path, the TypeScript compiler, the file system. Create
the program from the parsed tsconfig; a file is a member iff it is in `program.getSourceFiles()`,
`program.isSourceFileFromExternalLibrary(file)` is false, and its path contains no `/node_modules/`
segment. Result: a sorted list of absolute file names (deterministic set membership).

**Predicate implementation:**

```ts
// file: scripts/modularity/program.ts
import ts from "typescript"

export interface LoadedProgram {
  readonly program: ts.Program
  readonly checker: ts.TypeChecker
  /** Absolute, sorted file names of the project source set. */
  readonly files: readonly string[]
}

export function loadProgram(tsconfigPath: string): LoadedProgram {
  const host: ts.ParseConfigFileHost = {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
    }
  }
  const parsed = ts.getParsedCommandLineOfConfigFile(tsconfigPath, undefined, host)
  if (parsed === undefined) throw new Error(`cannot parse ${tsconfigPath}`)
  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options })
  const files = program
    .getSourceFiles()
    .filter(
      (file) =>
        // membership requirement: part of the compiled program (implicit: it was returned)
        !program.isSourceFileFromExternalLibrary(file) && // membership requirement: not external
        !file.fileName.includes("/node_modules/") // membership requirement: not under node_modules
    )
    .map((file) => file.fileName)
    .sort()
  return { program, checker: program.getTypeChecker(), files }
}
```

**This:** a file included by the tsconfig. **Not this:** a dependency's file.

```ts
// file: packages/core/src/engine/report.ts
// This: compiled by the project tsconfig, not under node_modules — a member.
export const reportName = "report"
```

```ts
// file: node_modules/effect/dist/Effect.d.ts (illustrative)
// Not this: resolved from node_modules — excluded from the project source set
// even though the compiler loads it to resolve symbols.
export declare const succeed: <A>(value: A) => unknown
```

### Module

A member of the [project source set](#project-source-set). Every later per-module count and
classification uses this granularity: one file, one module. Whether the file uses ES module syntax
is irrelevant to membership; a file without imports or exports is still a module (an ambient one).

#### Related terms

| Term      | Relation           | Deciding distinction                        | Why it is not interchangeable here                                                              |
| --------- | ------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Package   | coarser grouping   | a directory subtree owning a `package.json` | edges between modules inside one package exist and matter; package-level counts would hide them   |
| Namespace | intra-file grouping | a `namespace` block creates scopes, not files | namespaces produce no import edges; the graph metrics would not see them                         |
| Symbol    | finer grouping     | one declaration inside a module             | surface metrics count symbols, but reachability and cycles are file-level facts                   |

```ts
// file: src/units.ts
// Module: this whole file is one module (one node in the module graph).
export interface Unit {
  readonly name: string
}

// Namespace: a scope inside the module — not a module, creates no import edge.
export namespace Grouping {
  export const kind = "namespace"
}

// Symbol: `Unit`, `Grouping`, and `kind` are symbols — finer than a module.
```

**Mechanical predicate:** Input: an absolute file name and a [project source set](#project-source-set).
Result: true iff the file name is a member of the set's `files` list.

**Predicate implementation:**

```ts
// file: scripts/modularity/module.ts
import type { LoadedProgram } from "./program.ts"

export const isModule = (loaded: LoadedProgram, fileName: string): boolean =>
  loaded.files.includes(fileName)
```

### Package

The directory subtree that owns a [module](#module): the nearest ancestor directory of the module's
file that directly contains a `package.json`, provided no `node_modules` segment is crossed while
walking up.

**Mechanical predicate:** Input: an absolute file name and the file system. Walk parent directories
from the file's directory upward; return the first directory containing `package.json`; abort with
no result when a directory named `node_modules` is reached or the root is passed. Result: an
absolute directory path or none.

**Predicate implementation:**

```ts
// file: scripts/modularity/packages.ts
import * as fs from "node:fs"
import * as path from "node:path"

export function owningPackageDir(fileName: string): string | undefined {
  let current = path.dirname(fileName)
  while (true) {
    if (path.basename(current) === "node_modules") return undefined
    if (fs.existsSync(path.join(current, "package.json"))) return current
    const parent = path.dirname(current)
    if (parent === current) return undefined
    current = parent
  }
}
```

Example manifest establishing a package:

```jsonc
// file: packages/core/package.json
{
  // The directory `packages/core` is the package of every module under it.
  "name": "@better-typescript/core",
  "exports": {
    // Declared subpath (used later by "Declared entry point" and "Boundary bypass edge").
    "./engine/report": { "default": "./dist/engine/report.js" }
  }
}
```

### Import edge

An ordered pair of [modules](#module) (A, B), A ≠ B, produced by a syntactic dependency in A whose
specifier resolves to B's file. Three syntactic forms produce an edge: (1) an `import` declaration,
(2) an `export ... from` declaration, (3) a dynamic `import("literal")` call with a string-literal
argument. Specifiers that resolve outside the [project source set](#project-source-set) produce no
edge. Multiple statements between the same pair collapse into one edge.

**Mechanical predicate:** Inputs: a [project source set](#project-source-set) and the compiler
options. For each module A and each of the three statement forms, resolve the specifier with
`ts.resolveModuleName`; the pair (A, B) is an edge iff the resolved file B is in the set and B ≠ A.
Result: Boolean per ordered pair; the full extraction returns the deduplicated edge list.

**Predicate implementation:** see the `buildGraph` implementation under
[Module graph](#module-graph); it classifies each edge as a [value edge](#value-edge) or a
[type-only edge](#type-only-edge) and records the specifier for
[boundary bypass](#boundary-bypass-edge) checks.

Examples of each edge-producing form:

```ts
// file: src/edges.ts
// (1) import declaration -> edge to ./target.ts
import { target } from "./target.ts"
// (2) export-from declaration -> edge to ./target.ts (same pair, collapses)
export { target as reexported } from "./target.ts"

// (3) dynamic import with a string-literal specifier -> edge to ./lazy.ts
export const load = (): Promise<{ readonly lazyValue: number }> => import("./lazy.ts")

export const use = target
```

```ts
// file: src/target.ts
export const target = 1
```

```ts
// file: src/lazy.ts
export const lazyValue = 2
```

### Value edge

An [import edge](#import-edge) that requires B's JavaScript to load when A loads: any edge that is
not a [type-only edge](#type-only-edge). Bindingless side-effect imports (`import "./b.ts"`) and
dynamic imports are always value edges.

```ts
// file: src/valueEdge.ts
// Value edge: named import without `type` — B's code loads at runtime.
import { helper } from "./helperImpl.ts"
// Value edge: bindingless side-effect import.
import "./helperImpl.ts"

export const run = (): number => helper()
```

```ts
// file: src/helperImpl.ts
export const helper = (): number => 42
```

### Type-only edge

An [import edge](#import-edge) whose every statement between the pair is erased at emit: the import
clause or export clause has `isTypeOnly` set, or every named element in it has `isTypeOnly` set. A
type-only edge propagates type changes but never loads code.

#### Related terms

| Term                      | Relation      | Deciding distinction                                              | Why it is not interchangeable here                                                    |
| ------------------------- | ------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [Value edge](#value-edge) | complement    | the statement survives emit and loads B at runtime                | value edges carry runtime coupling (load order, side effects); type-only edges cannot    |
| Type-sufficient edge      | defined later | a *value* edge whose uses would all still type-check if type-only | it marks a lever opportunity; a type-only edge is the already-optimal form               |

```ts
// file: src/typeOnlyEdge.ts
// Type-only edge: erased at emit; no runtime load of ./shapes.ts.
import type { Shape } from "./shapes.ts"
// Also a type-only edge: every element marked individually.
import { type Wide } from "./shapes.ts"

export const area = (shape: Shape): number => shape.width * shape.height
export const widen = (wide: Wide): number => wide.width

// Not interchangeable with a value edge: this import survives emit and loads code.
import { makeShape } from "./shapes.ts"
export const unit = makeShape(1, 1)
```

```ts
// file: src/shapes.ts
export interface Shape {
  readonly width: number
  readonly height: number
}
export interface Wide {
  readonly width: number
}
export const makeShape = (width: number, height: number): Shape => ({ width, height })
```

**Mechanical predicate:** Input: the set of edge-producing statements between (A, B). The edge is
type-only iff for every statement: for an import declaration, `importClause.isTypeOnly` is true, or
the clause has no default name and every named element's `isTypeOnly` is true; for an export-from
declaration, `isTypeOnly` is true or every export specifier's `isTypeOnly` is true; dynamic imports
and bindingless imports fail the predicate. Result: Boolean; the edge kind is `"type-only"` or
`"value"`.

**Predicate implementation:** the `importKind` function inside `buildGraph` below.

### Module graph

The directed graph whose nodes are all [modules](#module) and whose edge set is every
[import edge](#import-edge), each labeled with its kind ([value](#value-edge) or
[type-only](#type-only-edge)) and the specifier text that produced it.

**Mechanical predicate:** Inputs: a [project source set](#project-source-set) and compiler options.
Result: the node list (sorted file names) and deduplicated, sorted edge list produced by the
procedure below. Two runs over identical inputs produce identical graphs because file order,
statement order, and tie-breaking are all fixed.

**Predicate implementation:**

```ts
// file: scripts/modularity/graph.ts
import ts from "typescript"
import type { LoadedProgram } from "./program.ts"

export type EdgeKind = "value" | "type-only"

export interface Edge {
  readonly from: string
  readonly to: string
  readonly kind: EdgeKind
  /** The module specifier text that produced the edge (first seen wins). */
  readonly via: string
}

export interface ModuleGraph {
  readonly modules: readonly string[]
  readonly edges: readonly Edge[]
}

const resolve = (
  specifier: string,
  from: string,
  options: ts.CompilerOptions
): string | undefined =>
  ts.resolveModuleName(specifier, from, options, ts.sys).resolvedModule?.resolvedFileName

const importKind = (
  statement: ts.Statement
): { readonly specifier: string; readonly kind: EdgeKind } | undefined => {
  if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
    const clause = statement.importClause
    const named =
      clause?.namedBindings !== undefined && ts.isNamedImports(clause.namedBindings)
        ? clause.namedBindings.elements
        : undefined
    const typeOnly =
      clause?.isTypeOnly === true ||
      (clause?.name === undefined &&
        named !== undefined &&
        named.length > 0 &&
        named.every((element) => element.isTypeOnly))
    return { specifier: statement.moduleSpecifier.text, kind: typeOnly ? "type-only" : "value" }
  }
  if (
    ts.isExportDeclaration(statement) &&
    statement.moduleSpecifier !== undefined &&
    ts.isStringLiteral(statement.moduleSpecifier)
  ) {
    const named =
      statement.exportClause !== undefined && ts.isNamedExports(statement.exportClause)
        ? statement.exportClause.elements
        : undefined
    const typeOnly =
      statement.isTypeOnly ||
      (named !== undefined && named.length > 0 && named.every((element) => element.isTypeOnly))
    return { specifier: statement.moduleSpecifier.text, kind: typeOnly ? "type-only" : "value" }
  }
  return undefined
}

export function buildGraph(loaded: LoadedProgram): ModuleGraph {
  const inSet = new Set(loaded.files)
  const options = loaded.program.getCompilerOptions()
  const edges: Edge[] = []
  for (const fileName of loaded.files) {
    const source = loaded.program.getSourceFile(fileName)
    if (source === undefined) continue
    const seen = new Map<string, { kind: EdgeKind; via: string }>()
    const record = (target: string, kind: EdgeKind, via: string): void => {
      const previous = seen.get(target)
      seen.set(target, {
        kind: previous?.kind === "value" ? "value" : kind,
        via: previous?.via ?? via
      })
    }
    for (const statement of source.statements) {
      const found = importKind(statement)
      if (found === undefined) continue
      const target = resolve(found.specifier, fileName, options)
      if (target === undefined || !inSet.has(target) || target === fileName) continue
      record(target, found.kind, found.specifier)
    }
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const first = node.arguments[0]
        if (first !== undefined && ts.isStringLiteral(first)) {
          const target = resolve(first.text, fileName, options)
          if (target !== undefined && inSet.has(target) && target !== fileName) {
            record(target, "value", first.text)
          }
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    for (const [to, info] of [...seen.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      edges.push({ from: fileName, to, kind: info.kind, via: info.via })
    }
  }
  return { modules: loaded.files, edges }
}
```

### Reach set

For a [module](#module) M, the set of modules reachable from M by following one or more edges of the
[module graph](#module-graph) (both kinds — a type change propagates across
[type-only edges](#type-only-edge) too). The reach count of M is the size of its reach set.

#### Related terms

| Term        | Relation           | Deciding distinction                    | Why it is not interchangeable here                                                       |
| ----------- | ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| Fan-out     | first step only    | count of M's direct out-edges           | a module with fan-out 1 into a hub can still reach everything; reach captures that          |
| Fan-in      | reverse direction  | count of modules with an edge into M    | fan-in measures how many depend on M directly, not how far M's own changes must be safe     |
| Path length | different quantity | number of edges on one dependency chain | reach counts *how many* modules are touchable, not *how far* one chain goes                 |

```ts
// file: src/a.ts
// Fan-out of a.ts = 1 (only ./b.ts), but its reach set is { b.ts, c.ts }: reach ≠ fan-out.
import { b } from "./b.ts"
export const a = b + 1
```

```ts
// file: src/b.ts
// Fan-in of b.ts = 1 (a.ts imports it). Path length a -> b -> c is 2 edges.
import { c } from "./c.ts"
export const b = c + 1
```

```ts
// file: src/c.ts
export const c = 1
```

**Mechanical predicate:** Inputs: a [module graph](#module-graph) and a module M. Breadth-first
search from M over out-edges; the reach count is the number of distinct visited nodes excluding M.
Result: a non-negative integer per module.

**Predicate implementation:**

```ts
// file: scripts/modularity/reach.ts
import type { ModuleGraph } from "./graph.ts"

export function reachCounts(graph: ModuleGraph): ReadonlyMap<string, number> {
  const adjacency = new Map<string, string[]>()
  for (const module of graph.modules) adjacency.set(module, [])
  for (const edge of graph.edges) adjacency.get(edge.from)?.push(edge.to)
  const result = new Map<string, number>()
  for (const module of graph.modules) {
    const seen = new Set<string>([module])
    const queue: string[] = [module]
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]
      if (current === undefined) break
      for (const next of adjacency.get(current) ?? []) {
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
      }
    }
    result.set(module, seen.size - 1)
  }
  return result
}
```

### Cycle member

A [module](#module) that lies on at least one directed cycle of the
[module graph](#module-graph): a member of a strongly connected component of size ≥ 2. Cycles make
every member's [reach set](#reach-set) include every other member, so a change anywhere in the
cycle can affect everywhere in it.

**Mechanical predicate:** Input: a [module graph](#module-graph). Run Tarjan's strongly-connected
components algorithm with nodes visited in sorted order; a module is a cycle member iff its
component has size ≥ 2. Result: Boolean per module.

**Predicate implementation:**

```ts
// file: scripts/modularity/scc.ts
import type { ModuleGraph } from "./graph.ts"

export function cycleMembers(graph: ModuleGraph): ReadonlySet<string> {
  const adjacency = new Map<string, string[]>()
  for (const module of graph.modules) adjacency.set(module, [])
  for (const edge of graph.edges) adjacency.get(edge.from)?.push(edge.to)
  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const onStack = new Set<string>()
  const stack: string[] = []
  const members = new Set<string>()
  let counter = 0
  const connect = (node: string): void => {
    index.set(node, counter)
    low.set(node, counter)
    counter = counter + 1
    stack.push(node)
    onStack.add(node)
    for (const next of adjacency.get(node) ?? []) {
      if (!index.has(next)) {
        connect(next)
        low.set(node, Math.min(low.get(node) ?? 0, low.get(next) ?? 0))
      } else if (onStack.has(next)) {
        low.set(node, Math.min(low.get(node) ?? 0, index.get(next) ?? 0))
      }
    }
    if (low.get(node) === index.get(node)) {
      const component: string[] = []
      let popped = ""
      do {
        popped = stack.pop() ?? ""
        onStack.delete(popped)
        component.push(popped)
      } while (popped !== node && popped !== "")
      if (component.length > 1) for (const member of component) members.add(member)
    }
  }
  for (const module of graph.modules) if (!index.has(module)) connect(module)
  return members
}
```

**This:** two modules importing each other. **Not this:** a linear chain.

```ts
// file: src/order.ts
// This: cycle member — order.ts -> customer.ts -> order.ts is a directed cycle.
import type { Customer } from "./customer.ts"
export interface Order {
  readonly buyer: Customer
}
```

```ts
// file: src/customer.ts
// This: cycle member — the other half of the cycle.
import type { Order } from "./order.ts"
export interface Customer {
  readonly history: readonly Order[]
}
```

```ts
// file: src/invoice.ts
// Not this: imports order.ts but nothing imports invoice.ts back — a chain, not a cycle.
import type { Order } from "./order.ts"
export interface Invoice {
  readonly order: Order
}
```

### Exported symbol

A symbol in a [module](#module)'s export table as reported by the compiler
(`checker.getExportsOfModule`), with aliases resolved to their original symbol. Its identity is the
pair (module, exported name); its resolved symbol is used to match uses.

**Mechanical predicate:** Inputs: a [project source set](#project-source-set) and its checker. For
each module with a module symbol, enumerate `getExportsOfModule`; resolve each alias with
`getAliasedSymbol`. Result: the sorted list of (module, name, resolved symbol) triples.

**Predicate implementation:**

```ts
// file: scripts/modularity/exports.ts
import ts from "typescript"
import type { LoadedProgram } from "./program.ts"

export interface ExportInfo {
  readonly module: string
  readonly name: string
  /** Alias-resolved (canonical) symbol. */
  readonly symbol: ts.Symbol
}

export function exportedSymbols(loaded: LoadedProgram): readonly ExportInfo[] {
  const out: ExportInfo[] = []
  for (const fileName of loaded.files) {
    const source = loaded.program.getSourceFile(fileName)
    if (source === undefined) continue
    const moduleSymbol = loaded.checker.getSymbolAtLocation(source)
    if (moduleSymbol === undefined) continue
    for (const declared of loaded.checker.getExportsOfModule(moduleSymbol)) {
      const symbol =
        (declared.flags & ts.SymbolFlags.Alias) !== 0
          ? loaded.checker.getAliasedSymbol(declared)
          : declared
      out.push({ module: fileName, name: declared.name, symbol })
    }
  }
  return out.sort((a, b) =>
    a.module === b.module ? a.name.localeCompare(b.name) : a.module.localeCompare(b.module)
  )
}
```

```ts
// file: src/surface.ts
// Exported symbol (surface.ts, "limit").
export const limit = 10
// Exported symbol (surface.ts, "Limit") — types count too.
export type Limit = typeof limit
// Not an exported symbol: module-private declaration.
const internal = limit * 2
export const doubled = internal
```

### Declared entry point

A [module](#module) named — directly or through build-output inversion — by its
[package](#package)'s manifest as an external contract: any file reached from a string value inside
the manifest's `main`, `bin`, or `exports` fields, where a build-output path (e.g. `./dist/x.js`)
is inverted to its source file using the package tsconfig's `outDir`/`rootDir` and the extension
rewrites `.js → .ts/.tsx`, `.d.ts → .ts`. Declared entry points are consumed from outside the
[project source set](#project-source-set), so their [exported symbols](#exported-symbol) are exempt
from the unused-surface count.

**Mechanical predicate:** Inputs: the [project source set](#project-source-set), each package's
`package.json` and `tsconfig.json`, the file system. Collect every string in `main`/`bin`/`exports`
(recursing through objects); resolve each against the package directory; add the `outDir→rootDir`
inversion and extension-rewritten candidates; a module is a declared entry point iff one candidate
equals its file name. Result: Boolean per module.

**Predicate implementation:**

```ts
// file: scripts/modularity/entryPoints.ts
import * as fs from "node:fs"
import * as path from "node:path"
import ts from "typescript"

const manifestTargets = (manifest: Record<string, unknown>): readonly string[] => {
  const targets: string[] = []
  const push = (value: unknown): void => {
    if (typeof value === "string") targets.push(value)
    else if (typeof value === "object" && value !== null) {
      for (const nested of Object.values(value)) push(nested)
    }
  }
  push(manifest["main"])
  push(manifest["bin"])
  push(manifest["exports"])
  return targets
}

const sourceCandidates = (packageDir: string, target: string): readonly string[] => {
  const absolute = path.resolve(packageDir, target)
  const bases = [absolute]
  const tsconfigPath = path.join(packageDir, "tsconfig.json")
  if (fs.existsSync(tsconfigPath)) {
    const raw = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
    const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, packageDir)
    const outDir = parsed.options.outDir
    const rootDir = parsed.options.rootDir
    if (outDir !== undefined && rootDir !== undefined && absolute.startsWith(outDir)) {
      bases.push(path.join(rootDir, path.relative(outDir, absolute)))
    }
  }
  return bases.flatMap((base) => [
    base,
    base.replace(/\.d\.ts$/, ".ts"),
    base.replace(/\.js$/, ".ts"),
    base.replace(/\.js$/, ".tsx")
  ])
}

export function declaredEntryPoints(files: readonly string[]): ReadonlySet<string> {
  const inSet = new Set(files)
  const entries = new Set<string>()
  const packageDirs = new Set<string>()
  for (const file of files) {
    let current = path.dirname(file)
    while (current !== path.dirname(current)) {
      if (fs.existsSync(path.join(current, "package.json"))) {
        packageDirs.add(current)
        break
      }
      current = path.dirname(current)
    }
  }
  for (const packageDir of [...packageDirs].sort()) {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(packageDir, "package.json"), "utf8")
    ) as Record<string, unknown>
    for (const target of manifestTargets(manifest)) {
      for (const candidate of sourceCandidates(packageDir, target)) {
        if (inSet.has(candidate)) entries.add(candidate)
      }
    }
  }
  return entries
}
```

```jsonc
// file: packages/core/package.json (fragment)
{
  "exports": {
    // "./dist/engine/report.js" inverts through outDir=dist, rootDir=src to
    // "src/engine/report.ts" — that module is a declared entry point.
    "./engine/report": { "default": "./dist/engine/report.js" }
  },
  // A bin target is also a declared entry point after the same inversion.
  "bin": { "better-typescript": "./dist/index.js" },
  // main participates identically.
  "main": "./dist/index.js"
}
```

### External use

A reference to an [exported symbol](#exported-symbol) of [module](#module) M from a different
module: an identifier outside any import or export declaration whose alias-resolved symbol is
declared in M. Identifiers inside import/export clauses are bindings, not uses — a barrel that
re-exports a symbol does not "use" it.

**Mechanical predicate:** Inputs: the [project source set](#project-source-set) and checker. Walk
every identifier of every module F; skip identifiers with an `ImportDeclaration`,
`ExportDeclaration`, or `ImportEqualsDeclaration` ancestor; resolve the identifier's symbol,
resolving aliases; the reference is an external use of (M, S) iff the resolved symbol's first
declaration is in module M ≠ F. Result: the set of externally used resolved symbols.

**Predicate implementation:**

```ts
// file: scripts/modularity/uses.ts
import ts from "typescript"
import type { LoadedProgram } from "./program.ts"

export const insideImportOrExport = (node: ts.Node): boolean => {
  let current: ts.Node | undefined = node
  while (current !== undefined) {
    if (
      ts.isImportDeclaration(current) ||
      ts.isExportDeclaration(current) ||
      ts.isImportEqualsDeclaration(current)
    ) {
      return true
    }
    current = current.parent
  }
  return false
}

export function externallyUsedSymbols(loaded: LoadedProgram): ReadonlySet<ts.Symbol> {
  const used = new Set<ts.Symbol>()
  for (const fileName of loaded.files) {
    const source = loaded.program.getSourceFile(fileName)
    if (source === undefined) continue
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && !insideImportOrExport(node)) {
        const symbol = loaded.checker.getSymbolAtLocation(node)
        if (symbol !== undefined) {
          const resolved =
            (symbol.flags & ts.SymbolFlags.Alias) !== 0
              ? loaded.checker.getAliasedSymbol(symbol)
              : symbol
          const home = resolved.declarations?.[0]?.getSourceFile().fileName
          if (home !== undefined && home !== fileName) used.add(resolved)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return used
}
```

**This:** a reference in code. **Not this:** a re-export binding.

```ts
// file: src/consumer.ts
import { limit } from "./surface.ts"
// This: external use — `limit` referenced outside an import/export declaration.
export const doubledElsewhere = limit * 2
```

```ts
// file: src/barrel.ts
// Not this: the identifier appears only inside an export declaration — a binding,
// not an external use.
export { limit } from "./surface.ts"
```

```ts
// file: src/surface.ts
export const limit = 10
```

### Unused export

An [exported symbol](#exported-symbol) of a [module](#module) M with no
[external use](#external-use), where M is neither a [declared entry point](#declared-entry-point)
nor a module with zero importers in the [module graph](#module-graph) (both exemptions exist
because such modules' consumers are outside the measured set).

#### Related terms

| Term          | Relation      | Deciding distinction                                 | Why it is not interchangeable here                                                          |
| ------------- | ------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Dead code     | broader       | code unreachable from any execution, exported or not | an unused export may be executed internally; it is only its *public exposure* that is waste    |
| Unused import | consumer-side | an import binding never referenced in the importer   | it inflates edges, not surface; the type-sufficient-edge machinery handles it                  |

```ts
// file: src/mathUtil.ts
export const usedHelper = (x: number): number => x + 1

// Unused export: exported but no external use anywhere (assume one importer exists,
// so the module is not exempt).
export const unusedHelper = (x: number): number => x - 1

// Dead code (not an unused export): not exported at all; different problem.
const neverCalled = (x: number): number => x * 3
export const keepTypechecker = typeof neverCalled
```

```ts
// file: src/mathConsumer.ts
import { usedHelper } from "./mathUtil.ts"
// Unused import (not an unused export): `usedHelper` is referenced here, but if it
// were not, that would be a consumer-side problem.
export const applied = usedHelper(1)
```

**Mechanical predicate:** Inputs: [exported symbols](#exported-symbol),
[externally used symbols](#external-use), [declared entry points](#declared-entry-point), and the
[module graph](#module-graph). An exported symbol (M, S) is an unused export iff its resolved
symbol is not in the used set, M is not a declared entry point, and M's in-degree > 0. Result:
Boolean per exported symbol.

**Predicate implementation:**

```ts
// file: scripts/modularity/unusedExports.ts
import type ts from "typescript"
import type { ExportInfo } from "./exports.ts"
import type { ModuleGraph } from "./graph.ts"

export function unusedExports(
  exports: readonly ExportInfo[],
  used: ReadonlySet<ts.Symbol>,
  entryPoints: ReadonlySet<string>,
  graph: ModuleGraph
): readonly ExportInfo[] {
  const inDegree = new Map<string, number>()
  for (const module of graph.modules) inDegree.set(module, 0)
  for (const edge of graph.edges) inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1)
  return exports.filter(
    (info) =>
      !used.has(info.symbol) &&
      !entryPoints.has(info.module) &&
      (inDegree.get(info.module) ?? 0) > 0
  )
}
```

### Type position

A location in source that the compiler erases at emit: any node for which `ts.isPartOfTypeNode`
holds (type annotations, type arguments, `implements` clauses, `typeof` type queries) or an export
specifier inside an `export type` clause. A reference in a type position never needs the referenced
module's JavaScript.

**Mechanical predicate:** Input: an AST node. True iff `ts.isPartOfTypeNode(node)` returns true, or
the node has an `ExportSpecifier` ancestor whose own `isTypeOnly` is true or whose parent export
declaration's `isTypeOnly` is true. Result: Boolean per node.

**Predicate implementation:**

```ts
// file: scripts/modularity/typePosition.ts
import ts from "typescript"

export function inTypePosition(node: ts.Node): boolean {
  if (ts.isPartOfTypeNode(node)) return true
  let current: ts.Node | undefined = node
  while (current !== undefined) {
    if (ts.isExportSpecifier(current)) {
      const declaration = current.parent.parent
      return current.isTypeOnly || (ts.isExportDeclaration(declaration) && declaration.isTypeOnly)
    }
    current = current.parent
  }
  return false
}
```

```ts
// file: src/positions.ts
import { widget, type Widget } from "./widget.ts"

// Type position: annotation — `Widget` is erased at emit.
export const pick = (input: Widget): Widget => input
// Type position: `typeof` type query — erased, still fine under `import type`.
export type WidgetAlias = typeof widget
// Value position (not a type position): the identifier survives emit.
export const clone = { ...widget }
```

```ts
// file: src/widget.ts
export interface Widget {
  readonly id: string
}
export const widget: Widget = { id: "w1" }
```

### Type-sufficient edge

A [value edge](#value-edge) produced by an import declaration with at least one binding, where no
reference to any of its bindings occurs outside a [type position](#type-position). Such an edge
could be declared `import type` (or deleted, when there are zero references) without any emit or
type change; leaving it a value edge forces a runtime load and load-order coupling for nothing.

#### Related terms

| Term                              | Relation     | Deciding distinction                                 | Why it is not interchangeable here                                            |
| --------------------------------- | ------------ | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Type-only edge](#type-only-edge) | target state | already declared with `type`; erased at emit         | the lever converts type-sufficient edges *into* type-only edges                   |
| [Value edge](#value-edge)         | superset     | any non-erased edge, including genuinely needed ones | most value edges are legitimate; only the type-sufficient subset is a defect      |

```ts
// file: src/report.ts
// Type-sufficient edge: `Config` is bound by a value import but every use is a
// type position — `import type` would compile identically.
import { Config } from "./config.ts"

export const describe = (config: Config): string => config.name
```

```ts
// file: src/reportNeedsValue.ts
// Not type-sufficient: `defaults` is used in a value position.
import { defaults, type Config } from "./config.ts"

export const describeDefaults = (): string => (defaults satisfies Config).name
```

```ts
// file: src/config.ts
export interface Config {
  readonly name: string
}
export const defaults: Config = { name: "default" }
```

**Mechanical predicate:** Inputs: the [project source set](#project-source-set), checker, and an
import declaration in module A resolving to in-set module B with `isTypeOnly` false and ≥ 1
binding. Collect the binding symbols (default name, namespace name, non-type-only named elements);
the edge is type-sufficient iff no identifier in A outside import/export declarations resolves to a
binding symbol while failing [type position](#type-position). Result: Boolean per import
declaration; aggregation counts candidate declarations and type-sufficient ones.

**Predicate implementation:**

```ts
// file: scripts/modularity/typeSufficient.ts
import ts from "typescript"
import type { LoadedProgram } from "./program.ts"
import { inTypePosition } from "./typePosition.ts"
import { insideImportOrExport } from "./uses.ts"

export interface CandidateEdge {
  readonly from: string
  readonly to: string
}

export interface TypeSufficiencyReport {
  readonly candidates: readonly CandidateEdge[]
  readonly sufficient: readonly CandidateEdge[]
}

export function typeSufficientEdges(loaded: LoadedProgram): TypeSufficiencyReport {
  const inSet = new Set(loaded.files)
  const options = loaded.program.getCompilerOptions()
  const candidates: CandidateEdge[] = []
  const sufficient: CandidateEdge[] = []
  for (const fileName of loaded.files) {
    const source = loaded.program.getSourceFile(fileName)
    if (source === undefined) continue
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
        continue
      }
      const clause = statement.importClause
      if (clause === undefined || clause.isTypeOnly) continue
      const resolved = ts.resolveModuleName(
        statement.moduleSpecifier.text,
        fileName,
        options,
        ts.sys
      ).resolvedModule?.resolvedFileName
      if (resolved === undefined || !inSet.has(resolved)) continue
      const bindings: ts.Identifier[] = []
      if (clause.name !== undefined) bindings.push(clause.name)
      if (clause.namedBindings !== undefined) {
        if (ts.isNamespaceImport(clause.namedBindings)) bindings.push(clause.namedBindings.name)
        else {
          for (const element of clause.namedBindings.elements) {
            if (!element.isTypeOnly) bindings.push(element.name)
          }
        }
      }
      if (bindings.length === 0) continue
      const bound = new Set<ts.Symbol>()
      for (const identifier of bindings) {
        const symbol = loaded.checker.getSymbolAtLocation(identifier)
        if (symbol !== undefined) bound.add(symbol)
      }
      let valueUse = false
      const visit = (node: ts.Node): void => {
        if (valueUse) return
        if (ts.isIdentifier(node) && !insideImportOrExport(node)) {
          const symbol = loaded.checker.getSymbolAtLocation(node)
          if (symbol !== undefined && bound.has(symbol) && !inTypePosition(node)) valueUse = true
        }
        ts.forEachChild(node, visit)
      }
      visit(source)
      const edge = { from: fileName, to: resolved }
      candidates.push(edge)
      if (!valueUse) sufficient.push(edge)
    }
  }
  return { candidates, sufficient }
}
```

### Service key

A value whose type carries the Effect context-key marker property `"~effect/Context/Service"`: the
typed handle under which a capability is stored in and retrieved from an Effect context. Depending
on a service key couples a consumer to a *contract* (identifier plus service shape), not to any
implementation.

**Mechanical predicate:** Inputs: the checker and a type T. True iff
`T.getProperty("~effect/Context/Service")` is defined. Result: Boolean per type; a value is a
service key iff its declared type satisfies this.

**Predicate implementation:**

```ts
// file: scripts/modularity/marks.ts
import type ts from "typescript"

export const LAYER_MARK = "~effect/Layer"
export const SERVICE_KEY_MARK = "~effect/Context/Service"
export const EFFECT_MARK = "~effect/Effect"

export const hasMark = (type: ts.Type, mark: string): boolean =>
  type.getProperty(mark) !== undefined
```

```ts
// file: src/clock.ts
import { Context, Effect } from "effect"

// Service key: the class value is a Context key; its type carries the
// "~effect/Context/Service" marker.
export class Clock extends Context.Service<
  Clock,
  { readonly now: () => Effect.Effect<number> }
>()("app/Clock") {}

// Not a service key: a plain implementation object — no marker property.
export const systemClock = {
  now: () => Effect.sync(() => Date.now())
}
```

### Layer value

A value whose type carries the Effect layer marker property `"~effect/Layer"`: a recipe that
constructs one or more services. Importing a layer value is a wiring decision — it names *which*
implementation will satisfy a [service key](#service-key).

#### Related terms

| Term                        | Relation     | Deciding distinction                                   | Why it is not interchangeable here                                                                          |
| --------------------------- | ------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| [Service key](#service-key) | the contract | marker `"~effect/Context/Service"`; names a capability | depending on the key is capability coupling (good); depending on a layer picks an implementation (wiring)     |
| Implementation object       | the payload  | plain value matching the service shape; no marker      | it can be passed around safely, but importing it directly also hard-wires the choice                          |

```ts
// file: src/clockWiring.ts
import { Effect, Layer } from "effect"
import { Clock, systemClock } from "./clock.ts"

// Layer value: type carries the "~effect/Layer" marker — a wiring recipe for Clock.
export const ClockLive: Layer.Layer<Clock> = Layer.succeed(Clock, systemClock)

// Service key (contract, not a layer): `Clock` itself — yielding it retrieves the service.
export const readNow: Effect.Effect<number, never, Clock> = Effect.gen(function* () {
  const clock = yield* Clock
  return yield* clock.now()
})

// Implementation object (payload, not a layer): `systemClock` — a plain value.
export const directCall: Effect.Effect<number> = systemClock.now()
```

**Mechanical predicate:** Inputs: the checker and a type T. True iff
`T.getProperty("~effect/Layer")` is defined. Result: Boolean per type.

**Predicate implementation:** `hasMark` in `scripts/modularity/marks.ts` above, applied with
`LAYER_MARK`.

### Provision site

A call expression that satisfies Effect requirements with concrete services: a call whose callee
resolves to `provide`, `provideService`, or `provideServiceEffect` declared in the `effect`
package's `Effect` module. A provision site is where "which implementation" gets decided.

**Mechanical predicate:** Inputs: the checker and a call expression. Take the callee identifier
(the property name for property accesses); require its text ∈ {`provide`, `provideService`,
`provideServiceEffect`}; resolve its symbol (aliases resolved); true iff the symbol's first
declaration lives in a file matching `/effect/(dist|src)/Effect.(d.ts|ts)` under the `effect`
package. Result: Boolean per call expression.

**Predicate implementation:**

```ts
// file: scripts/modularity/provision.ts
import ts from "typescript"

const PROVIDERS = new Set(["provide", "provideService", "provideServiceEffect"])
const EFFECT_MODULE = /\/effect\/(dist|src)\/Effect\.(d\.ts|ts)$/

export function isProvisionCall(checker: ts.TypeChecker, node: ts.Node): boolean {
  if (!ts.isCallExpression(node)) return false
  const callee = ts.isPropertyAccessExpression(node.expression)
    ? node.expression.name
    : node.expression
  if (!ts.isIdentifier(callee) || !PROVIDERS.has(callee.text)) return false
  const symbol = checker.getSymbolAtLocation(callee)
  const resolved =
    symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0
      ? checker.getAliasedSymbol(symbol)
      : symbol
  const declarationFile = resolved?.declarations?.[0]?.getSourceFile().fileName ?? ""
  return EFFECT_MODULE.test(declarationFile)
}
```

```ts
// file: src/provisionExample.ts
import { Effect } from "effect"
import { Clock } from "./clock.ts"
import { ClockLive, readNow } from "./clockWiring.ts"

// Provision site: Effect.provide — decides which implementation satisfies Clock.
export const main = Effect.provide(readNow, ClockLive)

// Provision site: Effect.provideService — same decision, single-service form.
export const mainDirect = Effect.provideService(readNow, Clock, {
  now: () => Effect.sync(() => 0)
})

// Not a provision site: yielding the key only *requires* the capability.
export const stillAbstract = Effect.gen(function* () {
  const clock = yield* Clock
  return yield* clock.now()
})
```

### Composition root

A [module](#module) with in-degree zero in the [module graph](#module-graph): no in-set module
imports it. Such modules are where execution enters the measured set (binaries, test files,
scripts), so wiring belongs there.

#### Related terms

| Term                                          | Relation | Deciding distinction                                          | Why it is not interchangeable here                                                                                                       |
| --------------------------------------------- | -------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| [Declared entry point](#declared-entry-point) | overlaps | named by a manifest; may still be imported by in-set modules  | a library's public module is a declared entry point but not a place for wiring; the graph fact (in-degree 0) is what licenses wiring        |

```ts
// file: src/bin/run.ts
// Composition root: nothing in the project imports this file; it wires and runs.
import { Effect } from "effect"
import { readNow, ClockLive } from "../clockWiring.ts"

void Effect.runPromise(Effect.provide(readNow, ClockLive))
```

```ts
// file: src/clockMarker.ts
// Not a composition root: other modules import this file (in-degree > 0).
export const marker = "imported by clockWiring.ts"
```

**Mechanical predicate:** Inputs: a [module graph](#module-graph) and a module M. True iff no edge
has `to === M`. Result: Boolean per module.

**Predicate implementation:**

```ts
// file: scripts/modularity/roots.ts
import type { ModuleGraph } from "./graph.ts"

export function compositionRoots(graph: ModuleGraph): ReadonlySet<string> {
  const targets = new Set(graph.edges.map((edge) => edge.to))
  return new Set(graph.modules.filter((module) => !targets.has(module)))
}
```

### Wiring site

An occurrence in a [module](#module) of either (a) a [provision site](#provision-site), or (b) a
reference — outside import/export declarations — to a [layer value](#layer-value) whose symbol is
declared in a *different* module. Constructing a layer for a module's own implementation is not a
wiring site; naming someone else's layer, or providing, is.

**Mechanical predicate:** Inputs: the [project source set](#project-source-set), checker, and a
module M. M contains a wiring site iff some node in M satisfies `isProvisionCall`, or some
identifier in M outside import/export declarations has a type satisfying
`hasMark(·, "~effect/Layer")` and an alias-resolved symbol whose first declaration is in a module
other than M. Result: Boolean per module (and per node for decomposition).

**Predicate implementation:** the `wiringReport` implementation under
[Wiring violation](#wiring-violation).

```ts
// file: src/wiringSites.ts
import { Effect, Layer } from "effect"
import { Clock } from "./clock.ts"
import { ClockLive, readNow } from "./clockWiring.ts"

// Wiring site (b): reference to a layer value declared in another module.
export const chosen: Layer.Layer<Clock> = ClockLive

// Wiring site (a): a provision site.
export const wired = Effect.provide(readNow, ClockLive)

// Not a wiring site: constructing a layer for this module's own implementation.
export const LocalFixed: Layer.Layer<Clock> = Layer.succeed(Clock, {
  now: () => Effect.sync(() => 0)
})
```

### Wiring violation

A [module](#module) that contains a [wiring site](#wiring-site) but is neither a
[composition root](#composition-root) nor a module that itself exports a
[layer value](#layer-value) (layer-aggregator modules compose wiring as their product; roots
consume it; everything else holding wiring has leaked implementation choice into business logic).

**Mechanical predicate:** Inputs: the [project source set](#project-source-set), checker, and
[module graph](#module-graph). A module M is a wiring violation iff it contains a
[wiring site](#wiring-site), its in-degree > 0, and no [exported symbol](#exported-symbol) of M has
a type satisfying the [layer value](#layer-value) predicate. Result: Boolean per module.

**Predicate implementation:**

```ts
// file: scripts/modularity/wiring.ts
import ts from "typescript"
import type { LoadedProgram } from "./program.ts"
import type { ModuleGraph } from "./graph.ts"
import { hasMark, LAYER_MARK } from "./marks.ts"
import { isProvisionCall } from "./provision.ts"
import { insideImportOrExport } from "./uses.ts"

export interface WiringReport {
  /** Modules containing at least one wiring site. */
  readonly wired: readonly string[]
  /** Wired modules violating containment. */
  readonly violations: readonly string[]
}

export function wiringReport(loaded: LoadedProgram, graph: ModuleGraph): WiringReport {
  const inDegree = new Map<string, number>()
  for (const module of graph.modules) inDegree.set(module, 0)
  for (const edge of graph.edges) inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1)
  const wired: string[] = []
  const violations: string[] = []
  for (const fileName of loaded.files) {
    const source = loaded.program.getSourceFile(fileName)
    if (source === undefined) continue
    let hasSite = false
    const visit = (node: ts.Node): void => {
      if (isProvisionCall(loaded.checker, node)) hasSite = true
      if (ts.isIdentifier(node) && !insideImportOrExport(node)) {
        const symbol = loaded.checker.getSymbolAtLocation(node)
        const resolved =
          symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0
            ? loaded.checker.getAliasedSymbol(symbol)
            : symbol
        const home = resolved?.declarations?.[0]?.getSourceFile().fileName
        if (
          home !== undefined &&
          home !== fileName &&
          hasMark(loaded.checker.getTypeAtLocation(node), LAYER_MARK)
        ) {
          hasSite = true
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
    if (!hasSite) continue
    wired.push(fileName)
    let exportsLayer = false
    const moduleSymbol = loaded.checker.getSymbolAtLocation(source)
    if (moduleSymbol !== undefined) {
      for (const exported of loaded.checker.getExportsOfModule(moduleSymbol)) {
        const declaration = exported.declarations?.[0]
        if (
          declaration !== undefined &&
          hasMark(loaded.checker.getTypeOfSymbolAtLocation(exported, declaration), LAYER_MARK)
        ) {
          exportsLayer = true
        }
      }
    }
    const isRoot = (inDegree.get(fileName) ?? 0) === 0
    if (!isRoot && !exportsLayer) violations.push(fileName)
  }
  return { wired, violations }
}
```

**This:** provide inside imported business logic. **Not this:** the same decision at a root or in a
layer aggregator.

```ts
// file: src/billingWired.ts
import { Effect } from "effect"
import { readNow, ClockLive } from "./clockWiring.ts"

// This: wiring violation — an imported business module (in-degree > 0, exports no
// layer) picks the Clock implementation itself.
export const billNow = Effect.provide(readNow, ClockLive)
```

```ts
// file: src/appLayer.ts
import { Layer } from "effect"
import type { Clock } from "./clock.ts"
import { ClockLive } from "./clockWiring.ts"

// Not this (exempt): a layer aggregator — it references foreign layers but exports
// a layer value as its product.
export const AppLive: Layer.Layer<Clock> = ClockLive
```

```ts
// file: src/bin/main.ts
import { Effect } from "effect"
import { readNow } from "../clockWiring.ts"
import { AppLive } from "../appLayer.ts"

// Not this (exempt): a composition root — in-degree 0, wiring belongs here.
void Effect.runPromise(Effect.provide(readNow, AppLive))
```

### Import-time effect

A top-level statement of a [module](#module) whose evaluation performs work when the module loads:
(a) an expression statement whose expression is not a string literal (a discarded-value call,
assignment, or other action — the value is thrown away, so the statement exists only for its
effect), or (b) any top-level statement containing an `await` (including `for await`) outside a
function body. Import-time effects couple modules through load order: importing for *types* or one
function still executes the work.

#### Related terms

| Term                  | Relation      | Deciding distinction                    | Why it is not interchangeable here                                                    |
| --------------------- | ------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| Runtime side effect   | broader       | any observable action whenever executed | effects inside functions run when called; only *import-time* ones fire on module load     |
| Top-level declaration | contrast case | `const`/`class`/`function` binding a value | constructing values is what modules are for; the metric flags only discarded-value work |

```ts
// file: src/boot.ts
// This (a): import-time effect — discarded-value call runs on module load.
console.log("booting")

// This (b): import-time effect — top-level await forces work during evaluation.
const response = await fetch("https://example.com/settings.json")
export const status = response.status

// Not this: pure top-level declaration — binds a value, discards nothing.
const retryLimit = 3
export const limits = { retryLimit }

// Runtime side effect (not import-time): runs only when called.
export const log = (message: string): void => console.log(message)
```

**Mechanical predicate:** Input: a module's source file. A top-level statement is an import-time
effect iff it is an `ExpressionStatement` whose expression is not a string-literal-like node, or it
contains an `AwaitExpression` or `for await` reachable without entering a function-like node.
Result: the list of offending statements; the module-level Boolean is "list non-empty".

**Predicate implementation:**

```ts
// file: scripts/modularity/importEffects.ts
import ts from "typescript"

const containsTopLevelAwait = (root: ts.Node): boolean => {
  let found = false
  const visit = (node: ts.Node): void => {
    if (found || ts.isFunctionLike(node)) return
    if (ts.isAwaitExpression(node)) {
      found = true
      return
    }
    if (ts.isForOfStatement(node) && node.awaitModifier !== undefined) {
      found = true
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(root)
  return found
}

export function importTimeEffects(source: ts.SourceFile): readonly ts.Statement[] {
  return source.statements.filter((statement) => {
    if (ts.isExpressionStatement(statement)) return !ts.isStringLiteralLike(statement.expression)
    return containsTopLevelAwait(statement)
  })
}
```

### Ambient coupling

A construct that couples [modules](#module) outside the [module graph](#module-graph): (a) a
`declare global` augmentation, (b) a `declare module "specifier"` augmentation appearing inside a
module (a file with import/export syntax), or (c) an assignment to a property of `globalThis`.
Ambient coupling is invisible to every edge-based measurement, which is exactly why it degrades
modularity: consumers acquire dependencies no import states.

**Mechanical predicate:** Input: a module's source file. Collect nodes where: (a)
`ts.isModuleDeclaration(node)` and `node.flags & ts.NodeFlags.GlobalAugmentation`; (b)
`ts.isModuleDeclaration(node)` with a string-literal name while `ts.isExternalModule(sourceFile)`;
(c) a binary `=` whose left side is a property access on the identifier `globalThis`. Result: the
node list; module-level Boolean is "list non-empty".

**Predicate implementation:**

```ts
// file: scripts/modularity/ambient.ts
import ts from "typescript"

export function ambientCouplings(source: ts.SourceFile): readonly ts.Node[] {
  const found: ts.Node[] = []
  const visit = (node: ts.Node): void => {
    if (ts.isModuleDeclaration(node) && (node.flags & ts.NodeFlags.GlobalAugmentation) !== 0) {
      found.push(node) // (a) global augmentation
    } else if (
      ts.isModuleDeclaration(node) &&
      ts.isStringLiteral(node.name) &&
      ts.isExternalModule(source)
    ) {
      found.push(node) // (b) external module augmentation inside a module
    } else if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(node.left) &&
      ts.isIdentifier(node.left.expression) &&
      node.left.expression.text === "globalThis"
    ) {
      found.push(node) // (c) globalThis property assignment
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return found
}
```

```ts
// file: src/ambient.ts
export const marker = "module"

// This (a): global augmentation — every module now sees `appVersion` with no edge.
declare global {
  var appVersion: string
}

// This (b): augmenting another module from here — invisible contract change.
declare module "./ambientTarget.ts" {
  interface Extended {
    readonly bonus: number
  }
}

// This (c): globalThis mutation — shared state with no import edge.
globalThis.appVersion = "1.0.0"
```

```ts
// file: src/ambientTarget.ts
export interface Extended {
  readonly base: number
}

// Not this: an explicit exported declaration — consumers must import it, creating
// a visible edge.
export const explicitVersion = "1.0.0"
```

### Boundary-any export

An [exported symbol](#exported-symbol) whose type contains the intrinsic `any` type anywhere
reachable by a bounded structural walk (the type itself; union/intersection members; type
arguments of type references; call-signature parameter and return types; apparent property types),
to a fixed depth of 6 with cycle detection. `any` at an export disables checking for every
consumer, so contract violations propagate silently across the module boundary.

#### Related terms

| Term                    | Relation      | Deciding distinction                          | Why it is not interchangeable here                                                          |
| ----------------------- | ------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `unknown`-typed export  | safe contrast | consumers must narrow before use; checking on | `unknown` is an honest "opaque" contract; `any` erases the contract, so only `any` is counted    |

```ts
// file: src/boundaries.ts
// Boundary-any export: the parameter type is `any` — consumers lose checking.
export const parseLoose = (input: any): string => String(input)

// unknown-typed export (not counted): consumers must narrow — contract preserved.
export const parseStrict = (input: unknown): string =>
  typeof input === "string" ? input : JSON.stringify(input)

// Boundary-any export via type argument: `any` nested inside a reference.
export const looseList: Array<any> = []
```

**Mechanical predicate:** Inputs: checker and an exported symbol's type (value symbols:
`getTypeOfSymbolAtLocation` at the first declaration; type symbols: `getDeclaredTypeOfSymbol`).
Walk with a visited set and depth limit 6 in this order: `any` flag on the type; union/intersection
members; type-reference arguments; call signatures (return, then parameters); apparent properties.
True iff any visited type has the `Any` flag. Result: Boolean per exported symbol.

**Predicate implementation:**

```ts
// file: scripts/modularity/anySurface.ts
import ts from "typescript"

export function containsAny(
  checker: ts.TypeChecker,
  type: ts.Type,
  depth: number,
  seen: Set<ts.Type>
): boolean {
  if (depth < 0 || seen.has(type)) return false
  seen.add(type)
  if ((type.flags & ts.TypeFlags.Any) !== 0) return true
  if (type.isUnionOrIntersection()) {
    return type.types.some((member) => containsAny(checker, member, depth - 1, seen))
  }
  if ((ts.getObjectFlags(type) & ts.ObjectFlags.Reference) !== 0) {
    for (const argument of checker.getTypeArguments(type as ts.TypeReference)) {
      if (containsAny(checker, argument, depth - 1, seen)) return true
    }
  }
  for (const signature of type.getCallSignatures()) {
    if (containsAny(checker, checker.getReturnTypeOfSignature(signature), depth - 1, seen)) {
      return true
    }
    for (const parameter of signature.parameters) {
      const declaration = parameter.valueDeclaration
      if (
        declaration !== undefined &&
        containsAny(
          checker,
          checker.getTypeOfSymbolAtLocation(parameter, declaration),
          depth - 1,
          seen
        )
      ) {
        return true
      }
    }
  }
  for (const property of type.getApparentProperties()) {
    const declaration = property.valueDeclaration
    if (
      declaration !== undefined &&
      containsAny(
        checker,
        checker.getTypeOfSymbolAtLocation(property, declaration),
        depth - 1,
        seen
      )
    ) {
      return true
    }
  }
  return false
}
```

### Effect-typed export

An [exported symbol](#exported-symbol) whose type is an Effect (carries the `"~effect/Effect"`
marker) or is a function at least one of whose call-signature return types is an Effect. These are
the exports with an error channel to inspect.

**Mechanical predicate:** Inputs: checker and the exported symbol's type T. True iff
`T.getProperty("~effect/Effect")` is defined, or some call signature's return type has that
property. Result: Boolean per exported symbol.

**Predicate implementation:** the `effectErrorType` function under
[Untagged-error export](#untagged-error-export) returns a defined result exactly for effect-typed
exports.

```ts
// file: src/effectExports.ts
import { Effect } from "effect"

// Effect-typed export: the value itself is an Effect.
export const ready: Effect.Effect<boolean> = Effect.succeed(true)

// Effect-typed export: a function returning an Effect.
export const fetchCount = (): Effect.Effect<number> => Effect.succeed(1)

// Not effect-typed: no Effect in the type.
export const plain = (x: number): number => x + 1
```

### Tagged error type

A type every union member of which carries a `_tag` property typed as a string literal (and is not
`any`/`unknown`); `never` is vacuously tagged. Tagged errors make an error channel exhaustively
matchable — consumers can handle each case by tag and the compiler proves completeness.

#### Related terms

| Term             | Relation       | Deciding distinction                                  | Why it is not interchangeable here                                                                    |
| ---------------- | -------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `Error` subclass | untyped cousin | no literal `_tag`; distinguished only by `instanceof` | consumers can't exhaustively match; a boundary typed `Error` says nothing about failure cases             |
| Defect           | escape channel | not in the error channel at all (`E = never` via die) | converting failures to defects *hides* the contract instead of typing it (see the gaming invariants)      |

```ts
// file: src/errors.ts
import { Effect, Schema } from "effect"

// Tagged error type: declared with Schema.TaggedErrorClass — `_tag` is the string
// literal "MissingConfig".
export class MissingConfig extends Schema.TaggedErrorClass<MissingConfig>()("MissingConfig", {
  key: Schema.String
}) {}

// This: fully tagged error channel — exhaustively matchable.
export const readSetting = (key: string): Effect.Effect<string, MissingConfig> =>
  Effect.fail(new MissingConfig({ key }))

// Error subclass (not a tagged error type): no literal `_tag`.
export class LooseFailure extends Error {}

// Defect (not an error channel at all): failures become unrecoverable defects.
export const readOrDie = (key: string): Effect.Effect<string> => Effect.orDie(readSetting(key))
```

**Mechanical predicate:** Inputs: checker and a type E. If E has the `Never` flag: true. Otherwise
take E's union members (E itself when not a union); true iff every member lacks the
`Any`/`Unknown` flags, has a property `_tag`, and that property's type `isStringLiteral()`.
Result: Boolean per type.

**Predicate implementation:**

```ts
// file: scripts/modularity/errors.ts
import ts from "typescript"
import { EFFECT_MARK } from "./marks.ts"

const errorOf = (checker: ts.TypeChecker, type: ts.Type): ts.Type | undefined => {
  const variance = type.getProperty(EFFECT_MARK)
  if (variance === undefined) return undefined
  const varianceType = checker.getTypeOfSymbol(variance)
  const errorSlot = varianceType.getProperty("_E")
  if (errorSlot === undefined) return undefined
  const slotType = checker.getTypeOfSymbol(errorSlot)
  const signature = slotType.getCallSignatures()[0]
  return signature === undefined ? undefined : checker.getReturnTypeOfSignature(signature)
}

/** Defined exactly when the type is an Effect or a function returning one. */
export function effectErrorType(checker: ts.TypeChecker, type: ts.Type): ts.Type | undefined {
  const direct = errorOf(checker, type)
  if (direct !== undefined) return direct
  for (const signature of type.getCallSignatures()) {
    const fromReturn = errorOf(checker, checker.getReturnTypeOfSignature(signature))
    if (fromReturn !== undefined) return fromReturn
  }
  return undefined
}

export function isTaggedErrorChannel(checker: ts.TypeChecker, error: ts.Type): boolean {
  if ((error.flags & ts.TypeFlags.Never) !== 0) return true
  const members = error.isUnion() ? error.types : [error]
  return members.every((member) => {
    if ((member.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) return false
    const tag = member.getProperty("_tag")
    if (tag === undefined) return false
    return checker.getTypeOfSymbol(tag).isStringLiteral()
  })
}
```

### Untagged-error export

An [effect-typed export](#effect-typed-export) whose extracted error channel fails the
[tagged error type](#tagged-error-type) predicate. Its consumers cannot pattern-match failures
exhaustively, so the failure contract at the module boundary is unenforceable.

**Mechanical predicate:** Inputs: checker and an exported symbol's type. Compute
`effectErrorType`; when defined, the export is untagged iff `isTaggedErrorChannel` is false.
Result: Boolean per [effect-typed export](#effect-typed-export).

**Predicate implementation:**

```ts
// file: scripts/modularity/untagged.ts
import type ts from "typescript"
import { effectErrorType, isTaggedErrorChannel } from "./errors.ts"

export function isUntaggedErrorExport(checker: ts.TypeChecker, type: ts.Type): boolean {
  const error = effectErrorType(checker, type)
  return error !== undefined && !isTaggedErrorChannel(checker, error)
}
```

```ts
// file: src/untaggedExample.ts
import { Effect } from "effect"
import { MissingConfig } from "./errors.ts"

// This: untagged-error export — error channel is the untagged `Error`.
export const loadLoose = (key: string): Effect.Effect<string, Error> =>
  Effect.fail(new Error(`missing ${key}`))

// Not this: tagged channel — passes the tagged-error predicate.
export const loadStrict = (key: string): Effect.Effect<string, MissingConfig> =>
  Effect.fail(new MissingConfig({ key }))
```

### Exported type declaration

An [exported symbol](#exported-symbol) whose alias-resolved symbol is an interface or type alias
declared in the exporting [module](#module) itself (re-exports are attributed to the declaring
module only, so each declaration is counted once).

**Mechanical predicate:** Inputs: checker and an exported symbol of module M. True iff the resolved
symbol's flags include `Interface` or `TypeAlias` and its first declaration's source file is M.
Result: Boolean per exported symbol.

**Predicate implementation:** the `exportedTypeDeclarations` function under
[Duplicate exported type](#duplicate-exported-type).

```ts
// file: src/typeDecls.ts
// Exported type declaration: an interface declared and exported here.
export interface Money {
  readonly amount: number
  readonly currency: string
}
// Exported type declaration: a type alias declared and exported here.
export type Currency = Money["currency"]
// Not one: a value export.
export const zero: Money = { amount: 0, currency: "USD" }
```

### Duplicate exported type

A group of two or more [exported type declarations](#exported-type-declaration) in at least two
distinct [modules](#module) that share the identical sorted property-name list (non-empty) and are
mutually assignable. Duplicates couple modules *by copy*: a contract change must be repeated
everywhere, with no edge to reveal the obligation.

**Mechanical predicate:** Inputs: checker and all exported type declarations. Bucket by the sorted,
comma-joined apparent-property-name list (skip empty lists); within a bucket, keep the
lexicographically first entry and every other entry mutually assignable with it
(`isTypeAssignableTo` both directions); a bucket is a duplicate group iff it retains ≥ 2 entries
spanning ≥ 2 modules. The duplicate count of a group is its size minus one. Result: the list of
groups; per-declaration Boolean membership.

**Predicate implementation:**

```ts
// file: scripts/modularity/dupTypes.ts
import ts from "typescript"
import type { LoadedProgram } from "./program.ts"

export interface TypeDeclarationInfo {
  readonly module: string
  readonly name: string
  readonly type: ts.Type
}

export function exportedTypeDeclarations(loaded: LoadedProgram): readonly TypeDeclarationInfo[] {
  const out: TypeDeclarationInfo[] = []
  for (const fileName of loaded.files) {
    const source = loaded.program.getSourceFile(fileName)
    if (source === undefined) continue
    const moduleSymbol = loaded.checker.getSymbolAtLocation(source)
    if (moduleSymbol === undefined) continue
    for (const exported of loaded.checker.getExportsOfModule(moduleSymbol)) {
      const resolved =
        (exported.flags & ts.SymbolFlags.Alias) !== 0
          ? loaded.checker.getAliasedSymbol(exported)
          : exported
      if ((resolved.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias)) === 0) continue
      const declaration = resolved.declarations?.[0]
      if (declaration === undefined || declaration.getSourceFile().fileName !== fileName) continue
      out.push({
        module: fileName,
        name: exported.name,
        type: loaded.checker.getDeclaredTypeOfSymbol(resolved)
      })
    }
  }
  return out.sort((a, b) =>
    a.module === b.module ? a.name.localeCompare(b.name) : a.module.localeCompare(b.module)
  )
}

export function duplicateGroups(
  checker: ts.TypeChecker,
  declarations: readonly TypeDeclarationInfo[]
): ReadonlyArray<readonly TypeDeclarationInfo[]> {
  const byShape = new Map<string, TypeDeclarationInfo[]>()
  for (const info of declarations) {
    const names = info.type
      .getApparentProperties()
      .map((property) => property.name)
      .sort()
    if (names.length === 0) continue
    const key = names.join(",")
    const bucket = byShape.get(key) ?? []
    bucket.push(info)
    byShape.set(key, bucket)
  }
  const groups: Array<readonly TypeDeclarationInfo[]> = []
  for (const bucket of [...byShape.values()]) {
    if (bucket.length < 2) continue
    const [first, ...rest] = bucket
    if (first === undefined) continue
    const duplicates = [
      first,
      ...rest.filter(
        (candidate) =>
          checker.isTypeAssignableTo(candidate.type, first.type) &&
          checker.isTypeAssignableTo(first.type, candidate.type)
      )
    ]
    const distinctModules = new Set(duplicates.map((info) => info.module))
    if (duplicates.length >= 2 && distinctModules.size >= 2) groups.push(duplicates)
  }
  return groups
}
```

**This:** the same shape declared twice. **Not this:** distinct shapes.

```ts
// file: src/pricing.ts
// This: duplicate exported type — same property names, mutually assignable with
// billing.ts's Amount.
export interface Amount {
  readonly value: number
  readonly currency: string
}
export const priceOf = (amount: Amount): string => `${amount.value} ${amount.currency}`
```

```ts
// file: src/billing.ts
// This: the other member of the duplicate group.
export interface Amount {
  readonly value: number
  readonly currency: string
}
export const invoiceFor = (amount: Amount): string => `${amount.currency}${amount.value}`
```

```ts
// file: src/inventory.ts
// Not this: same property count but a different shape — not mutually assignable
// with the Amounts above (different property names).
export interface Stock {
  readonly units: number
  readonly warehouse: string
}
```

### Cross-package edge

An [import edge](#import-edge) whose endpoints have different owning [packages](#package).

**Mechanical predicate:** Input: an edge and the file system. Compute `owningPackageDir` for both
endpoints; the edge is cross-package iff both are defined and differ. Result: Boolean per edge.

**Predicate implementation:** the filter at the top of `bypassEdges` under
[Boundary bypass edge](#boundary-bypass-edge).

### Boundary bypass edge

A [cross-package edge](#cross-package-edge) that does not go through the target
[package](#package)'s declared surface: either its specifier is relative (reaching into another
package's tree directly), or it is a bare specifier whose subpath does not match any key of the
target's `exports` map (exact match or single-`*` pattern match). Bypasses void the package's
encapsulation: the target can no longer refactor internals behind its declared entry points.

**Mechanical predicate:** Inputs: the [module graph](#module-graph) and each package's
`package.json`. For each cross-package edge: if `via` starts with `.` → bypass. Otherwise derive
the subpath (`"."` when `via` equals the target package name, else `"./" + remainder`); the edge is
a bypass iff no `exports` key equals the subpath and no key containing one `*` matches it as
prefix/suffix pattern. A string-valued or condition-object `exports` admits only `"."`. Result:
Boolean per cross-package edge.

**Predicate implementation:**

```ts
// file: scripts/modularity/bypass.ts
import * as fs from "node:fs"
import * as path from "node:path"
import type { Edge, ModuleGraph } from "./graph.ts"
import { owningPackageDir } from "./packages.ts"

const subpathAllowed = (exportsField: unknown, subpath: string): boolean => {
  if (exportsField === undefined || exportsField === null) return false
  if (typeof exportsField === "string") return subpath === "."
  if (typeof exportsField !== "object") return false
  const keys = Object.keys(exportsField as Record<string, unknown>)
  if (keys.every((key) => !key.startsWith("."))) return subpath === "."
  for (const key of keys) {
    if (key === subpath) return true
    const star = key.indexOf("*")
    if (star >= 0) {
      const prefix = key.slice(0, star)
      const suffix = key.slice(star + 1)
      if (
        subpath.startsWith(prefix) &&
        subpath.endsWith(suffix) &&
        subpath.length >= key.length - 1
      ) {
        return true
      }
    }
  }
  return false
}

export interface BypassReport {
  readonly crossPackage: readonly Edge[]
  readonly bypass: readonly Edge[]
}

export function bypassEdges(graph: ModuleGraph): BypassReport {
  const crossPackage: Edge[] = []
  const bypass: Edge[] = []
  for (const edge of graph.edges) {
    const fromPackage = owningPackageDir(edge.from)
    const toPackage = owningPackageDir(edge.to)
    if (fromPackage === undefined || toPackage === undefined || fromPackage === toPackage) continue
    crossPackage.push(edge)
    if (edge.via.startsWith(".")) {
      bypass.push(edge)
      continue
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(toPackage, "package.json"), "utf8")) as {
      readonly name?: string
      readonly exports?: unknown
    }
    const name = manifest.name ?? ""
    const subpath =
      edge.via === name
        ? "."
        : edge.via.startsWith(`${name}/`)
          ? `./${edge.via.slice(name.length + 1)}`
          : "."
    if (!subpathAllowed(manifest.exports, subpath)) bypass.push(edge)
  }
  return { crossPackage, bypass }
}
```

**This:** reaching into a sibling package's internals. **Not this:** the declared surface.

```ts
// file: packages/cli/src/render.ts
// This: boundary bypass edge — a relative specifier crossing into another package's tree.
import { internalHelper } from "../../core/src/engine/internal.ts"

// Not this: a bare specifier matching a declared `exports` subpath of the target.
import { reportName } from "@better-typescript/core/engine/report"

export const render = (): string => `${reportName}:${internalHelper()}`
```

```ts
// file: packages/core/src/engine/internal.ts
export const internalHelper = (): string => "internal"
```

### Source line count

The number of newline-separated lines of a [module](#module)'s file content, summed over the
[project source set](#project-source-set) for the project total. Unit: lines.

**Mechanical predicate:** Input: the file bytes decoded as UTF-8. Value: `text.split("\n").length`.
Result: a positive integer per module; the project value is the sum.

**Predicate implementation:**

```ts
// file: scripts/modularity/lines.ts
import * as fs from "node:fs"

export const sourceLineCount = (fileName: string): number =>
  fs.readFileSync(fileName, "utf8").split("\n").length

export const totalLineCount = (files: readonly string[]): number =>
  files.reduce((sum, file) => sum + sourceLineCount(file), 0)
```

### Size concentration

The Herfindahl–Hirschman index of [source line count](#source-line-count) shares across
[modules](#module): Σᵢ (linesᵢ / totalLines)². Dimensionless, in (0, 1]; 1 means all code in one
module. Used as a gaming guard: merging modules to shrink the graph raises concentration.

#### Related terms

| Term             | Relation     | Deciding distinction         | Why it is not interchangeable here                                                   |
| ---------------- | ------------ | ----------------------------- | --------------------------------------------------------------------------------------- |
| Mean module size | first moment | total ÷ count; blind to skew | merging two modules into one barely moves the mean but visibly raises concentration      |

```jsonc
// Example valuation (machine-readable): three modules of 100, 100, 800 lines.
{
  // shares: 0.1, 0.1, 0.8
  // HHI = 0.01 + 0.01 + 0.64
  "sizeConcentration": 0.66,
  // mean module size (contrast — the related term): 1000 / 3 ≈ 333.3 lines
  "meanModuleSize": 333.3
}
```

**Mechanical predicate:** Inputs: per-module [source line counts](#source-line-count). Value:
Σ (linesᵢ / total)² over all modules; 0 when the set is empty. Result: a number in [0, 1].

**Predicate implementation:**

```ts
// file: scripts/modularity/concentration.ts
import { sourceLineCount } from "./lines.ts"

export function sizeConcentration(files: readonly string[]): number {
  const sizes = files.map(sourceLineCount)
  const total = sizes.reduce((sum, size) => sum + size, 0)
  if (total === 0) return 0
  return sizes.reduce((sum, size) => sum + (size / total) ** 2, 0)
}
```

### Defect-conversion site

A call expression whose callee resolves to `orDie` or `die` declared in the `effect` package's
`Effect` module. Each such site moves failures out of the typed error channel into defects. Counted
as a gaming guard for the error-channel dimension.

**Mechanical predicate:** Inputs: checker and a call expression. Same resolution as
[provision site](#provision-site) but with name set {`orDie`, `die`}. Result: Boolean per call; the
guard value is the project-wide count.

**Predicate implementation:**

```ts
// file: scripts/modularity/defects.ts
import ts from "typescript"

const DEFECT_NAMES = new Set(["orDie", "die"])
const EFFECT_MODULE = /\/effect\/(dist|src)\/Effect\.(d\.ts|ts)$/

export function countDefectConversions(checker: ts.TypeChecker, source: ts.SourceFile): number {
  let count = 0
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = ts.isPropertyAccessExpression(node.expression)
        ? node.expression.name
        : node.expression
      if (ts.isIdentifier(callee) && DEFECT_NAMES.has(callee.text)) {
        const symbol = checker.getSymbolAtLocation(callee)
        const resolved =
          symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0
            ? checker.getAliasedSymbol(symbol)
            : symbol
        const file = resolved?.declarations?.[0]?.getSourceFile().fileName ?? ""
        if (EFFECT_MODULE.test(file)) count = count + 1
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return count
}
```

```ts
// file: src/defectSites.ts
import { Effect } from "effect"
import { readSetting } from "./errors.ts"

// Defect-conversion site: failures leave the typed channel.
export const settingOrCrash = Effect.orDie(readSetting("PORT"))

// Not a defect-conversion site: failure stays typed for the caller to handle.
export const settingTyped = readSetting("PORT")
```

### Assertion laundering site

An `as` expression that erases checking on its way across a boundary: a cast whose target type node
is the `any` or `never` keyword, or a double cast whose inner cast targets `unknown`
(`x as unknown as T`). Counted as a gaming guard for the boundary-any dimension: it is the standard
way to make an export *look* typed while severing the type from the value.

**Mechanical predicate:** Input: a source file. Count `AsExpression` nodes where
`type.kind ∈ {AnyKeyword, NeverKeyword}` or where the operand is itself an `AsExpression` with
`type.kind === UnknownKeyword`. Result: non-negative integer per module; project value is the sum.

**Predicate implementation:**

```ts
// file: scripts/modularity/laundering.ts
import ts from "typescript"

export function countAssertionLaundering(source: ts.SourceFile): number {
  let count = 0
  const visit = (node: ts.Node): void => {
    if (ts.isAsExpression(node)) {
      const targetsAnyOrNever =
        node.type.kind === ts.SyntaxKind.AnyKeyword ||
        node.type.kind === ts.SyntaxKind.NeverKeyword
      const doubleCast =
        ts.isAsExpression(node.expression) &&
        node.expression.type.kind === ts.SyntaxKind.UnknownKeyword
      if (targetsAnyOrNever || doubleCast) count = count + 1
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return count
}
```

```ts
// file: src/launderingSites.ts
interface Wire {
  readonly id: string
}
declare const raw: string

// Assertion laundering site: double cast through unknown.
export const smuggled = raw as unknown as Wire

// Assertion laundering site: cast to any.
export const erased = raw as any

// Not a laundering site: a plain single cast to a concrete type (checked overlap).
export const narrowed = { id: raw } as Wire
```

### Sub-ratio

One of eleven named dimensionless quantities in [0, 1], each defined as numerator ÷ denominator
over predicates above, with value 0 when the denominator is 0 (no opportunity ⇒ no cost). Smaller
is better for every sub-ratio.

| Name                  | Numerator                                                              | Denominator                                                         |
| --------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `reachDensity`        | Σ over modules of [reach](#reach-set) counts (ordered reachable pairs) | N·(N−1), N = [module](#module) count                                  |
| `cycleRatio`          | count of [cycle members](#cycle-member)                                 | N                                                                     |
| `surfaceWaste`        | count of [unused exports](#unused-export)                               | count of [exported symbols](#exported-symbol) of non-exempt modules   |
| `typeSufficientRatio` | count of [type-sufficient edges](#type-sufficient-edge)                 | count of candidate value import declarations                          |
| `wiringSpread`        | count of [wiring violations](#wiring-violation)                         | count of modules containing a [wiring site](#wiring-site)             |
| `importEffectRatio`   | count of modules with an [import-time effect](#import-time-effect)      | N                                                                     |
| `ambientRatio`        | count of modules with [ambient coupling](#ambient-coupling)             | N                                                                     |
| `anySurface`          | count of [boundary-any exports](#boundary-any-export)                   | count of [exported symbols](#exported-symbol)                         |
| `untaggedErrorRatio`  | count of [untagged-error exports](#untagged-error-export)               | count of [effect-typed exports](#effect-typed-export)                 |
| `dupTypeRatio`        | Σ over [duplicate groups](#duplicate-exported-type) of (group size − 1) | count of [exported type declarations](#exported-type-declaration)     |
| `bypassRatio`         | count of [boundary bypass edges](#boundary-bypass-edge)                 | count of [cross-package edges](#cross-package-edge)                   |

**Mechanical predicate:** Inputs: the counted sets above. Value: numerator ÷ denominator, or 0 when
the denominator is 0. Result: a number in [0, 1] per named dimension.

**Predicate implementation:**

```ts
// file: scripts/modularity/subRatio.ts
export interface SubRatio {
  readonly name: string
  readonly numerator: number
  readonly denominator: number
  readonly value: number
  /** Per-module numerator attribution (decomposition). */
  readonly perModule: Readonly<Record<string, number>>
}

export const subRatio = (
  name: string,
  numerator: number,
  denominator: number,
  perModule: Readonly<Record<string, number>>
): SubRatio => ({
  name,
  numerator,
  denominator,
  value: denominator === 0 ? 0 : numerator / denominator,
  perModule
})
```

```jsonc
// Example sub-ratio value (machine-readable):
{
  "name": "surfaceWaste", // the named dimension
  "numerator": 12, // unused exports
  "denominator": 240, // exported symbols of non-exempt modules
  "value": 0.05, // numerator / denominator — dimensionless, smaller is better
  "perModule": { "/repo/src/mathUtil.ts": 2 } // decomposition attribution
}
```

### Modularity Cost Index

The unweighted arithmetic mean of the eleven [sub-ratios](#sub-ratio). Abbreviated MCI.
Dimensionless, in [0, 1]; 0 is perfectly modular by this metric; smaller is better. Equal weights
are a pinned convention, not a tuned parameter — determinism over cleverness.

**Mechanical predicate:** Input: the eleven sub-ratio values. Value: their sum ÷ 11. Result: a
number in [0, 1].

**Predicate implementation:**

```ts
// file: scripts/modularity/mciValue.ts
import type { SubRatio } from "./subRatio.ts"

export const mciOf = (subRatios: readonly SubRatio[]): number =>
  subRatios.length === 0
    ? 0
    : subRatios.reduce((sum, ratio) => sum + ratio.value, 0) / subRatios.length
```

```jsonc
// Example (machine-readable): eleven values averaging to the MCI.
{
  "subRatioValues": [0.18, 0.02, 0.05, 0.1, 0.25, 0.03, 0.01, 0.04, 0.3, 0.02, 0.0],
  "mci": 0.0909 // (sum = 1.0) / 11 — dimensionless, smaller is better
}
```

### Noise floor

The smallest difference between two measured values treated as a real change. For this metric the
noise floor is **zero**: every input is a byte-exact artifact (file contents, manifests, pinned
tool versions), every traversal is in sorted order, and no step consults time, randomness, network,
or scheduling. Two runs over identical inputs produce bit-identical values, so *any* difference is
a real change.

**Mechanical predicate:** Inputs: two [MCI](#modularity-cost-index) values from records with equal
input digests and tool versions. They differ iff they are not exactly equal.

**Predicate implementation:**

```ts
// file: scripts/modularity/noiseFloor.ts
export const NOISE_FLOOR = 0

export const differsBeyondNoise = (a: number, b: number): boolean => Math.abs(a - b) > NOISE_FLOOR
```

### Measurement record

The machine-readable artifact of one measurement: schema version, timestamp (informational only —
excluded from comparisons), tool versions, tsconfig digest, inputs digest,
[MCI](#modularity-cost-index), all [sub-ratios](#sub-ratio) with numerators/denominators and
per-module decomposition, and the guard quantities ([source line count](#source-line-count),
[size concentration](#size-concentration), entry-like module count, sorted external specifier
list, [defect-conversion](#defect-conversion-site) and
[assertion-laundering](#assertion-laundering-site) counts, and whether the pinned check commands
passed).

**Mechanical predicate:** Input: a JSON document. It is a valid record iff it parses and contains
every field of the `MeasurementRecord` interface below with the stated types. Result: Boolean.

**Predicate implementation:**

```ts
// file: scripts/modularity/record.ts
import { createHash } from "node:crypto"
import * as fs from "node:fs"

export interface SubRatioEntry {
  readonly numerator: number
  readonly denominator: number
  readonly value: number
  readonly perModule: Readonly<Record<string, number>>
}

export interface MeasurementRecord {
  readonly schemaVersion: 1
  readonly timestamp: string
  readonly tsVersion: string
  readonly effectVersion: string
  readonly tsconfigDigest: string
  readonly inputsDigest: string
  readonly mci: number
  readonly subRatios: Readonly<Record<string, SubRatioEntry>>
  readonly guards: {
    readonly sourceLineCount: number
    readonly sizeConcentration: number
    readonly entryLikeModules: number
    readonly externalSpecifiers: readonly string[]
    readonly defectConversionSites: number
    readonly assertionLaunderingSites: number
    readonly checksPassed: boolean
  }
}

export function inputsDigest(files: readonly string[]): string {
  const hash = createHash("sha256")
  for (const file of [...files].sort()) {
    hash.update(file)
    hash.update("\u0000")
    hash.update(fs.readFileSync(file))
    hash.update("\u0000")
  }
  return hash.digest("hex")
}

export const isMeasurementRecord = (value: unknown): value is MeasurementRecord => {
  if (typeof value !== "object" || value === null) return false
  const record = value as Record<string, unknown>
  return (
    record["schemaVersion"] === 1 &&
    typeof record["timestamp"] === "string" &&
    typeof record["tsVersion"] === "string" &&
    typeof record["effectVersion"] === "string" &&
    typeof record["tsconfigDigest"] === "string" &&
    typeof record["inputsDigest"] === "string" &&
    typeof record["mci"] === "number" &&
    typeof record["subRatios"] === "object" &&
    record["subRatios"] !== null &&
    typeof record["guards"] === "object" &&
    record["guards"] !== null
  )
}
```

Complete example record:

```jsonc
{
  "schemaVersion": 1, // record format version
  "timestamp": "2026-07-28T12:00:00Z", // informational; excluded from comparison
  "tsVersion": "6.0.3", // pinned compiler version (environment control)
  "effectVersion": "4.0.0-beta.98", // pinned effect version (environment control)
  "tsconfigDigest": "sha256:0f2a11…", // digest of the tsconfig chain (input)
  "inputsDigest": "sha256:9c41ab…", // digest of sorted (path, bytes) pairs (input)
  "mci": 0.0909, // the value: dimensionless ratio in [0,1]
  "subRatios": {
    // one entry per dimension; decomposition inline
    "reachDensity": {
      "numerator": 1806,
      "denominator": 9900,
      "value": 0.1824,
      "perModule": { "/repo/packages/core/src/engine/wiring.ts": 74 }
    },
    "cycleRatio": { "numerator": 2, "denominator": 100, "value": 0.02, "perModule": {} },
    "surfaceWaste": { "numerator": 12, "denominator": 240, "value": 0.05, "perModule": {} },
    "typeSufficientRatio": { "numerator": 31, "denominator": 310, "value": 0.1, "perModule": {} },
    "wiringSpread": { "numerator": 3, "denominator": 12, "value": 0.25, "perModule": {} },
    "importEffectRatio": { "numerator": 3, "denominator": 100, "value": 0.03, "perModule": {} },
    "ambientRatio": { "numerator": 1, "denominator": 100, "value": 0.01, "perModule": {} },
    "anySurface": { "numerator": 10, "denominator": 250, "value": 0.04, "perModule": {} },
    "untaggedErrorRatio": { "numerator": 15, "denominator": 50, "value": 0.3, "perModule": {} },
    "dupTypeRatio": { "numerator": 1, "denominator": 50, "value": 0.02, "perModule": {} },
    "bypassRatio": { "numerator": 0, "denominator": 44, "value": 0.0, "perModule": {} }
  },
  "guards": {
    "sourceLineCount": 41230, // unit: lines (gaming guard input)
    "sizeConcentration": 0.031, // HHI of module sizes (gaming guard)
    "entryLikeModules": 18, // modules with in-degree 0 (gaming guard)
    "externalSpecifiers": ["effect", "jiti", "minimatch", "typescript"], // sorted (guard)
    "defectConversionSites": 4, // orDie/die call count (gaming guard)
    "assertionLaunderingSites": 2, // as-any / as-unknown-as count (gaming guard)
    "checksPassed": true // pinned commands exited 0 (functional invariant)
  }
}
```

## Measurement

### Metric

- **Name:** Modularity Cost Index ([MCI](#modularity-cost-index)).
- **Unit:** dimensionless ratio.
- **Scale:** ratio scale in [0, 1] (means and differences are meaningful; 0 is a true zero).
- **Direction of goodness:** smaller is better.
- **Domain:** whole [project source set](#project-source-set) for one named tsconfig, with
  per-[module](#module) and per-[sub-ratio](#sub-ratio) decomposition.
- **Observable inputs (exhaustive):**
  1. the bytes of every file in the [project source set](#project-source-set);
  2. the tsconfig chain (the named file plus every `extends` ancestor) — it defines the set and
     the resolution rules;
  3. the TypeScript compiler at a pinned version (symbol resolution, types);
  4. the installed `effect` package at a pinned version (marker properties resolve through it);
  5. every `package.json` of an owning [package](#package) (entry points, `exports` maps);
  6. each package's `tsconfig.json` `outDir`/`rootDir` (entry-point inversion);
  7. for the `checksPassed` guard only: the exit codes of the pinned commands
     `bun run typecheck` and `bun test`.
- **Explicitly excluded:** file contents under `node_modules` except as consulted by the compiler
  for symbol identity; git history; formatting and comments (they change digests but no counts
  unless syntax changes); runtime behavior, performance, and test *contents*; OS, locale, and
  clock.
- **Validity (proxy audit).** MCI is a structural proxy for modularity, not the property itself.
  Known divergences: (1) [import-time effect](#import-time-effect) detection is syntactic —
  effectful work hidden in a top-level initializer (`const x = doIO()`) is not flagged; residual
  gap, partially covered by the wiring levers, which move construction into layers.
  (2) `any` *inside* a module body (not at exports) is invisible — intentional: modularity is
  about boundaries; the [assertion-laundering guard](#assertion-laundering-site) covers the abuse
  path. (3) A module exporting a [layer value](#layer-value) is exempt from
  [wiring violations](#wiring-violation) even if it also launders provision internally; residual
  gap, bounded by [provision sites](#provision-site) being visible in decomposition. (4) Semantic
  cohesion (whether one module's contents belong together) is proxied only by consumer
  partitioning (the split lever) and [duplicate types](#duplicate-exported-type); a badly designed
  but structurally clean module measures well. (5) Shared *mutable state behind a service* couples
  modules at runtime invisibly; no static companion exists — stated plainly as unmeasured.

### Procedure

Environment controls: pin the TypeScript and `effect` versions via the lockfile (record them); run
on a committed working tree (no unstaged edits); fix the tsconfig path argument; all list
traversals iterate in sorted order. No warmup, repetition, or isolation is needed: the procedure is
static, single-threaded, and free of time, randomness, and network. [Noise floor](#noise-floor):
zero, justified there — any exact difference is a real change.

Ordered procedure from inputs to value:

1. Load the [project source set](#project-source-set) from the tsconfig path (`loadProgram`).
2. Build the [module graph](#module-graph) (`buildGraph`).
3. Compute [reach counts](#reach-set) and [cycle members](#cycle-member); form `reachDensity` and
   `cycleRatio`.
4. Enumerate [exported symbols](#exported-symbol), [external uses](#external-use), and
   [declared entry points](#declared-entry-point); form `surfaceWaste` from
   [unused exports](#unused-export).
5. Classify [type-sufficient edges](#type-sufficient-edge); form `typeSufficientRatio`.
6. Run the [wiring report](#wiring-violation); form `wiringSpread`.
7. Scan each module for [import-time effects](#import-time-effect) and
   [ambient coupling](#ambient-coupling); form `importEffectRatio` and `ambientRatio`.
8. Classify [boundary-any exports](#boundary-any-export),
   [effect-typed exports](#effect-typed-export), and
   [untagged-error exports](#untagged-error-export); form `anySurface` and `untaggedErrorRatio`.
9. Enumerate [exported type declarations](#exported-type-declaration) and
   [duplicate groups](#duplicate-exported-type); form `dupTypeRatio`.
10. Enumerate [cross-package edges](#cross-package-edge) and
    [boundary bypass edges](#boundary-bypass-edge); form `bypassRatio`.
11. Average the eleven [sub-ratios](#sub-ratio) into the [MCI](#modularity-cost-index).
12. Compute the guard quantities and digests; emit the [measurement record](#measurement-record).

**Measurement implementation:**

```ts
// file: scripts/modularity/measure.ts
import ts from "typescript"
import { loadProgram } from "./program.ts"
import { buildGraph } from "./graph.ts"
import { reachCounts } from "./reach.ts"
import { cycleMembers } from "./scc.ts"
import { exportedSymbols } from "./exports.ts"
import { externallyUsedSymbols } from "./uses.ts"
import { declaredEntryPoints } from "./entryPoints.ts"
import { unusedExports } from "./unusedExports.ts"
import { typeSufficientEdges } from "./typeSufficient.ts"
import { wiringReport } from "./wiring.ts"
import { importTimeEffects } from "./importEffects.ts"
import { ambientCouplings } from "./ambient.ts"
import { containsAny } from "./anySurface.ts"
import { effectErrorType, isTaggedErrorChannel } from "./errors.ts"
import { exportedTypeDeclarations, duplicateGroups } from "./dupTypes.ts"
import { bypassEdges } from "./bypass.ts"
import { subRatio, type SubRatio } from "./subRatio.ts"
import { mciOf } from "./mciValue.ts"

export interface Measurement {
  readonly mci: number
  readonly subRatios: readonly SubRatio[]
}

const tally = (entries: readonly string[]): Record<string, number> => {
  const out: Record<string, number> = {}
  for (const entry of entries) out[entry] = (out[entry] ?? 0) + 1
  return out
}

export function measure(tsconfigPath: string): Measurement {
  const loaded = loadProgram(tsconfigPath)
  const graph = buildGraph(loaded)
  const moduleCount = graph.modules.length

  // 3. reach density and cycle ratio
  const reach = reachCounts(graph)
  const reachTotal = [...reach.values()].reduce((sum, count) => sum + count, 0)
  const reachPerModule: Record<string, number> = {}
  for (const [module, count] of [...reach.entries()].sort()) reachPerModule[module] = count
  const cycles = cycleMembers(graph)

  // 4. surface waste
  const exports = exportedSymbols(loaded)
  const used = externallyUsedSymbols(loaded)
  const entries = declaredEntryPoints(loaded.files)
  const unused = unusedExports(exports, used, entries, graph)
  const inDegree = new Map<string, number>()
  for (const module of graph.modules) inDegree.set(module, 0)
  for (const edge of graph.edges) inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1)
  const nonExemptExports = exports.filter(
    (info) => !entries.has(info.module) && (inDegree.get(info.module) ?? 0) > 0
  )

  // 5. type sufficiency
  const sufficiency = typeSufficientEdges(loaded)

  // 6. wiring
  const wiring = wiringReport(loaded, graph)

  // 7. import-time effects and ambient coupling
  const effectful: string[] = []
  const ambient: string[] = []
  for (const fileName of loaded.files) {
    const source = loaded.program.getSourceFile(fileName)
    if (source === undefined) continue
    if (importTimeEffects(source).length > 0) effectful.push(fileName)
    if (ambientCouplings(source).length > 0) ambient.push(fileName)
  }

  // 8. any surface and untagged errors
  const anyExports: string[] = []
  const effectTyped: string[] = []
  const untagged: string[] = []
  for (const info of exports) {
    const declaration = info.symbol.declarations?.[0]
    if (declaration === undefined) continue
    const type =
      (info.symbol.flags & ts.SymbolFlags.Value) !== 0
        ? loaded.checker.getTypeOfSymbolAtLocation(info.symbol, declaration)
        : loaded.checker.getDeclaredTypeOfSymbol(info.symbol)
    if (containsAny(loaded.checker, type, 6, new Set())) anyExports.push(info.module)
    const error = effectErrorType(loaded.checker, type)
    if (error !== undefined) {
      effectTyped.push(info.module)
      if (!isTaggedErrorChannel(loaded.checker, error)) untagged.push(info.module)
    }
  }

  // 9. duplicate types
  const declarations = exportedTypeDeclarations(loaded)
  const groups = duplicateGroups(loaded.checker, declarations).map((group) =>
    [...group].sort((a, b) => a.module.localeCompare(b.module))
  )
  const duplicateExtras = groups.flatMap((group) => group.slice(1).map((info) => info.module))

  // 10. bypasses
  const bypass = bypassEdges(graph)

  // 11. aggregate
  const subRatios: readonly SubRatio[] = [
    subRatio("reachDensity", reachTotal, moduleCount * (moduleCount - 1), reachPerModule),
    subRatio("cycleRatio", cycles.size, moduleCount, tally([...cycles])),
    subRatio(
      "surfaceWaste",
      unused.length,
      nonExemptExports.length,
      tally(unused.map((info) => info.module))
    ),
    subRatio(
      "typeSufficientRatio",
      sufficiency.sufficient.length,
      sufficiency.candidates.length,
      tally(sufficiency.sufficient.map((edge) => edge.from))
    ),
    subRatio(
      "wiringSpread",
      wiring.violations.length,
      wiring.wired.length,
      tally([...wiring.violations])
    ),
    subRatio("importEffectRatio", effectful.length, moduleCount, tally(effectful)),
    subRatio("ambientRatio", ambient.length, moduleCount, tally(ambient)),
    subRatio("anySurface", anyExports.length, exports.length, tally(anyExports)),
    subRatio("untaggedErrorRatio", untagged.length, effectTyped.length, tally(untagged)),
    subRatio("dupTypeRatio", duplicateExtras.length, declarations.length, tally(duplicateExtras)),
    subRatio(
      "bypassRatio",
      bypass.bypass.length,
      bypass.crossPackage.length,
      tally(bypass.bypass.map((edge) => edge.from))
    )
  ]
  return { mci: mciOf(subRatios), subRatios }
}
```

### Decomposition

Attribution granularity: every [sub-ratio](#sub-ratio) attributes its numerator to
[modules](#module) using the same predicates as the aggregate — [reach](#reach-set) counts to the
reaching module; [cycle members](#cycle-member), [import-time effects](#import-time-effect),
[ambient coupling](#ambient-coupling), and [wiring violations](#wiring-violation) to the offending
module; [unused exports](#unused-export), [boundary-any](#boundary-any-export) and
[untagged-error](#untagged-error-export) exports to the exporting module;
[type-sufficient edges](#type-sufficient-edge) and [bypass edges](#boundary-bypass-edge) to the
importing module; [duplicates](#duplicate-exported-type) to every group member after the
lexicographically first (the retained "owner" carries no cost).

Composition law: for each dimension, numerator = Σ per-module attributions (denominators are
global); [MCI](#modularity-cost-index) = mean of the eleven quotients. Consequently, eliminating a
module's attribution in one dimension reduces MCI by exactly (attribution ÷ denominator) ÷ 11 when
denominators are unchanged. The `perModule` maps in the [measurement record](#measurement-record)
carry exactly these attributions, so optimization targets the largest contributors
deterministically.

### Baseline and regression tracking

Record format: the [measurement record](#measurement-record) JSON, one file per measurement (the
complete example is under that definition). Store the baseline at a fixed path (e.g.
`docs/baselines/modularity.json`); the location is a convention, not an input.

Comparison procedure between records B (before) and A (after):

1. **Pair validity:** `tsVersion`, `effectVersion`, and `tsconfigDigest` must be equal, and
   `A.guards.checksPassed` must be true; otherwise the verdict is `invalid-pair` (re-baseline).
2. **Per-dimension deltas:** compare each of the eleven [sub-ratio](#sub-ratio) values exactly
   (the [noise floor](#noise-floor) is zero).
3. **Verdict:** `regression` if any sub-ratio value increased or any applicable gaming invariant
   (see [Invariants against gaming](#invariants-against-gaming)) fails; `improvement` if no
   sub-ratio increased, at least one decreased, and all applicable invariants hold; otherwise
   `no-change`. The Pareto rule (no dimension may worsen) is deliberate: it prevents trading one
   degradation mechanism for another inside the mean.

```ts
// file: scripts/modularity/compare.ts
import type { MeasurementRecord } from "./record.ts"

export type Verdict = "improvement" | "regression" | "no-change" | "invalid-pair"

const value = (record: MeasurementRecord, name: string): number =>
  record.subRatios[name]?.value ?? 0

export function compare(before: MeasurementRecord, after: MeasurementRecord): Verdict {
  if (
    before.tsVersion !== after.tsVersion ||
    before.effectVersion !== after.effectVersion ||
    before.tsconfigDigest !== after.tsconfigDigest ||
    !after.guards.checksPassed
  ) {
    return "invalid-pair"
  }
  const names = [
    ...new Set([...Object.keys(before.subRatios), ...Object.keys(after.subRatios)])
  ].sort()
  let anyBetter = false
  for (const name of names) {
    if (value(after, name) > value(before, name)) return "regression"
    if (value(after, name) < value(before, name)) anyBetter = true
  }
  if (!anyBetter) return "no-change"
  // Gaming invariants (each is specified in "Invariants against gaming").
  const merged = after.guards.sizeConcentration > before.guards.sizeConcentration * 1.05
  const padded = after.guards.entryLikeModules > before.guards.entryLikeModules
  const beforeExternal = new Set(before.guards.externalSpecifiers)
  const exported = after.guards.externalSpecifiers.some(
    (specifier) => !beforeExternal.has(specifier)
  )
  const defected =
    value(after, "untaggedErrorRatio") < value(before, "untaggedErrorRatio") &&
    after.guards.defectConversionSites > before.guards.defectConversionSites
  const laundered =
    value(after, "anySurface") < value(before, "anySurface") &&
    after.guards.assertionLaunderingSites > before.guards.assertionLaunderingSites
  const inlined =
    value(after, "reachDensity") < value(before, "reachDensity") &&
    after.guards.sourceLineCount > before.guards.sourceLineCount * 1.02
  if (merged || padded || exported || defected || laundered || inlined) return "regression"
  return "improvement"
}
```

## Optimization

Levers are ordered by expected impact per unit of change risk (mechanical, provably-safe edits
first; structural inversions later). Every confirmation below means: measure, transform, re-measure,
then require `compare(before, after) === "improvement"` **and** the lever's targeted
[sub-ratio](#sub-ratio) to have strictly decreased — the shared criterion is implemented once:

```ts
// file: scripts/modularity/confirm.ts
import { compare } from "./compare.ts"
import type { MeasurementRecord } from "./record.ts"

export function confirmLever(
  before: MeasurementRecord,
  after: MeasurementRecord,
  targetedSubRatio: string
): boolean {
  const beforeValue = before.subRatios[targetedSubRatio]?.value ?? 0
  const afterValue = after.subRatios[targetedSubRatio]?.value ?? 0
  return compare(before, after) === "improvement" && afterValue < beforeValue
}
```

### Convert type-sufficient edges to type-only imports

Every [type-sufficient edge](#type-sufficient-edge) MUST be declared `import type` (or, when it has
zero references, deleted).

#### Applicability

`typeSufficientRatio.numerator > 0` in the [measurement record](#measurement-record); the
`perModule` map lists the importing modules and the [predicate](#type-sufficient-edge) identifies
each convertible declaration.

#### Effect on metric

Each conversion turns a [value edge](#value-edge) into a [type-only edge](#type-only-edge),
reducing the `typeSufficientRatio` numerator by one (ΔMCI = −1/(11 × candidates) per edge) and
removing the runtime load-order coupling the emit otherwise preserves. The degradation mechanism
addressed: imports stronger than their use, which force B's JavaScript (and its transitive
[import-time effects](#import-time-effect)) to execute for a types-only consumer.

#### Trade-offs

None material: by definition no value use exists, so emit and behavior are unchanged. If the
importer relied on the target being loaded for a side effect, that reliance was already an
[import-time effect](#import-time-effect) defect; preserve it explicitly with a bindingless
`import "./m.ts"`, which its own dimension flags. Detect surprises with the pinned `bun test`.

**Before:**

```ts
// file: src/reportBefore.ts
import { Config } from "./config.ts"

export const describe = (config: Config): string => config.name
```

**After:**

```ts
// file: src/reportAfter.ts
import type { Config } from "./config.ts"

export const describe = (config: Config): string => config.name
```

Both against:

```ts
// file: src/config.ts
export interface Config {
  readonly name: string
}
```

#### Confirmation

Measure; convert every listed declaration; re-measure. Success: `typeSufficientRatio` strictly
decreased, no other [sub-ratio](#sub-ratio) increased, all invariants hold (exceeding the zero
[noise floor](#noise-floor) means any strict decrease counts).

**Confirmation implementation:**

```ts
// file: scripts/modularity/confirmTypeOnly.ts
import { confirmLever } from "./confirm.ts"
import type { MeasurementRecord } from "./record.ts"

export const confirmTypeOnlyConversion = (
  before: MeasurementRecord,
  after: MeasurementRecord
): boolean => confirmLever(before, after, "typeSufficientRatio")
```

### Delete unused exports

Every [unused export](#unused-export) MUST lose its `export` modifier or be deleted outright when
also unreferenced within its module.

#### Applicability

`surfaceWaste.numerator > 0`; the `perModule` decomposition names the exporting modules and the
[unused-export predicate](#unused-export) lists the symbols.

#### Effect on metric

Each removal reduces the `surfaceWaste` numerator by one. Mechanism addressed: speculative public
surface — symbols exposed "just in case" become de-facto contracts that other modules may silently
start depending on, widening the change-impact boundary without any consumer benefiting today.

#### Trade-offs

An export consumed only by code outside the [project source set](#project-source-set) but not
declared in any manifest would be a false positive; the [declared entry point](#declared-entry-point)
exemption covers manifest-visible consumers, and `bun run typecheck` plus `bun test` (the
`checksPassed` guard) catch in-repo breakage. Deleting the declaration body also shrinks
functionality — covered by the functional invariant.

**Before:**

```ts
// file: src/geometryBefore.ts
export const areaOf = (width: number, height: number): number => width * height
// Unused export: nothing external references it.
export const perimeterOf = (width: number, height: number): number => 2 * (width + height)
```

**After:**

```ts
// file: src/geometryAfter.ts
export const areaOf = (width: number, height: number): number => width * height
```

#### Confirmation

Measure; unexport/delete every listed symbol; re-measure. Success: `surfaceWaste` strictly
decreased, no other [sub-ratio](#sub-ratio) increased, `checksPassed` true, all invariants hold.

**Confirmation implementation:**

```ts
// file: scripts/modularity/confirmSurface.ts
import { confirmLever } from "./confirm.ts"
import type { MeasurementRecord } from "./record.ts"

export const confirmSurfaceReduction = (
  before: MeasurementRecord,
  after: MeasurementRecord
): boolean => confirmLever(before, after, "surfaceWaste")
```

### Replace barrel imports with direct imports

A [module](#module) SHOULD import a symbol from its declaring module, not from a re-exporting
intermediary, whenever both are inside the same [package](#package).

#### Applicability

The [module graph](#module-graph) contains a module R with an `export ... from` produced
[import edge](#import-edge) (a re-export), and some importer A has an edge to R for symbols
declared elsewhere: mechanically, A's imports from R resolve (via `getAliasedSymbol`) to
declarations in a third in-set module D. Detectable whenever `reachDensity.perModule[A]` exceeds
the count of modules whose declarations A actually references — the re-exporter inflates A's
[reach set](#reach-set) with every module R touches.

#### Effect on metric

Rerouting A→R to A→D removes R's entire subtree from A's [reach set](#reach-set) (keeping only
D's), shrinking the `reachDensity` numerator by |reach(R) \ reach(D)| for each rerouted importer —
typically the largest single-step density win available. Mechanism addressed: barrels — one
convenience module whose re-exports fuse many unrelated subtrees into every consumer's closure.

#### Trade-offs

More import statements per file (verbosity), and cross-package importers must keep using declared
entry points — this lever applies within a package only, otherwise it would trade `reachDensity`
against `bypassRatio`; the Pareto comparison detects that trade automatically.

**Before:**

```ts
// file: src/features/index.ts
// The barrel: fuses independent features into one module.
export { parseOrder } from "./parseOrder.ts"
export { renderOrder } from "./renderOrder.ts"
```

```ts
// file: src/features/parseOrder.ts
export const parseOrder = (raw: string): { readonly id: string } => ({ id: raw })
```

```ts
// file: src/features/renderOrder.ts
export const renderOrder = (order: { readonly id: string }): string => order.id
```

```ts
// file: src/consumerBefore.ts
// Importing via the barrel reaches parseOrder.ts AND renderOrder.ts.
import { parseOrder } from "./features/index.ts"

export const idOf = (raw: string): string => parseOrder(raw).id
```

**After:**

```ts
// file: src/consumerAfter.ts
// Direct import: the reach set now contains only parseOrder.ts.
import { parseOrder } from "./features/parseOrder.ts"

export const idOf = (raw: string): string => parseOrder(raw).id
```

#### Confirmation

Measure; reroute every barrel-mediated import to its declaring module; re-measure. Success:
`reachDensity` strictly decreased, no other [sub-ratio](#sub-ratio) increased (watch `bypassRatio`
and `surfaceWaste`: a fully bypassed barrel's re-exports become [unused exports](#unused-export) —
delete them in the same change), all invariants hold.

**Confirmation implementation:**

```ts
// file: scripts/modularity/confirmDirectImports.ts
import { confirmLever } from "./confirm.ts"
import type { MeasurementRecord } from "./record.ts"

export const confirmDirectImports = (
  before: MeasurementRecord,
  after: MeasurementRecord
): boolean => confirmLever(before, after, "reachDensity")
```

### Break dependency cycles by extracting shared declarations

Every [cycle member](#cycle-member) group MUST be made acyclic by moving the declarations that
close the cycle into a new module both sides import.

#### Applicability

`cycleRatio.numerator > 0`; the `perModule` decomposition lists the [cycle members](#cycle-member),
and the edges among them (from the [module graph](#module-graph)) identify which imports close the
loop.

#### Effect on metric

Extracting the shared declaration deletes at least one edge of every loop through it, moving the
affected modules out of the strongly connected component: `cycleRatio` numerator drops by the
component size, and `reachDensity` drops because members no longer mutually reach each other.
Mechanism addressed: cyclic knots, in which every member's change can affect every other member and
partial loading order becomes observable.

#### Trade-offs

One more module (raises N, which *lowers* density denominators' pressure but adds a file to
navigate); the extracted module must not itself import either original side, or the cycle merely
moves — the re-measured `cycleRatio` catches that.

**Before:**

```ts
// file: src/orderCycle.ts
// Cycle: orderCycle.ts <-> customerCycle.ts.
import type { CustomerC } from "./customerCycle.ts"
export interface OrderC {
  readonly buyer: CustomerC
}
```

```ts
// file: src/customerCycle.ts
import type { OrderC } from "./orderCycle.ts"
export interface CustomerC {
  readonly history: readonly OrderC[]
}
```

**After:**

```ts
// file: src/domainShapes.ts
// Extracted shared declarations: both former members import only this module.
export interface OrderC {
  readonly buyer: CustomerC
}
export interface CustomerC {
  readonly history: readonly OrderC[]
}
```

```ts
// file: src/orderAcyclic.ts
// Former cycle member: now imports only the extracted module — acyclic.
import type { CustomerC, OrderC } from "./domainShapes.ts"
export const orderBuyer = (order: OrderC): CustomerC => order.buyer
```

```ts
// file: src/customerAcyclic.ts
import type { CustomerC } from "./domainShapes.ts"
export const historyLength = (customer: CustomerC): number => customer.history.length
```

#### Confirmation

Measure; extract; re-measure. Success: `cycleRatio` strictly decreased, no other
[sub-ratio](#sub-ratio) increased, all invariants hold.

**Confirmation implementation:**

```ts
// file: scripts/modularity/confirmAcyclic.ts
import { confirmLever } from "./confirm.ts"
import type { MeasurementRecord } from "./record.ts"

export const confirmCycleBreak = (
  before: MeasurementRecord,
  after: MeasurementRecord
): boolean => confirmLever(before, after, "cycleRatio")
```

### Split modules with partitioned consumers

A [module](#module) SHOULD be split when its externally used [exported symbols](#exported-symbol)
partition into two or more groups whose importer sets are disjoint.

#### Applicability

Deterministic from measurement outputs: for module M, group its used exports by the set of
importing modules referencing each (from [external use](#external-use) resolution); applicable iff
the groups form ≥ 2 connected components when exports are linked whenever some importer uses both.
No judgment: the partition either exists in the resolved use relation or it does not.

#### Effect on metric

Each importer of a split part now reaches only that part's out-edges, not the union: the
`reachDensity` numerator drops by the sum over importers of the out-reach they no longer touch.
Mechanism addressed: god-modules — low-cohesion aggregates whose every consumer inherits every
other concern's dependency subtree.

#### Trade-offs

More files; importers must update specifiers (mechanical). If the split parts still import each
other, nothing improves — the re-measurement shows `reachDensity` unchanged and the confirmation
fails, rejecting the split.

**Before:**

```ts
// file: src/toolkit.ts
// God-module: parsing consumers also reach rendering's subtree, and vice versa.
import { renderTarget } from "./renderTarget.ts"
export const parseId = (raw: string): string => raw.trim()
export const renderId = (id: string): string => `${renderTarget}:${id}`
```

```ts
// file: src/renderTarget.ts
export const renderTarget = "screen"
```

```ts
// file: src/parserConsumer.ts
// Uses only parseId, but reaches renderTarget.ts through toolkit.ts.
import { parseId } from "./toolkit.ts"
export const cleanId = parseId(" a1 ")
```

**After:**

```ts
// file: src/parseToolkit.ts
// Split part 1: parsing only — no render subtree.
export const parseId = (raw: string): string => raw.trim()
```

```ts
// file: src/renderToolkit.ts
// Split part 2: rendering only.
import { renderTarget } from "./renderTarget.ts"
export const renderId = (id: string): string => `${renderTarget}:${id}`
```

```ts
// file: src/parserConsumerAfter.ts
// The parsing consumer's reach set no longer contains renderTarget.ts.
import { parseId } from "./parseToolkit.ts"
export const cleanId = parseId(" a1 ")
```

#### Confirmation

Measure; split M along the computed partition and reroute importers; re-measure. Success:
`reachDensity` strictly decreased, no other [sub-ratio](#sub-ratio) increased, all invariants hold
(the [size-concentration](#size-concentration) guard also decreases, never blocking this lever).

**Confirmation implementation:**

```ts
// file: scripts/modularity/confirmSplit.ts
import { confirmLever } from "./confirm.ts"
import type { MeasurementRecord } from "./record.ts"

export const confirmConsumerSplit = (
  before: MeasurementRecord,
  after: MeasurementRecord
): boolean => confirmLever(before, after, "reachDensity")
```

### Depend on service keys instead of implementations

A non-root [module](#module) that is not a layer aggregator MUST depend on capabilities through a
[service key](#service-key) in its Effect requirements, never by importing a
[layer value](#layer-value) or invoking a concrete implementation directly.

#### Applicability

The [wiring report](#wiring-violation) lists a module M among `violations` whose
[wiring sites](#wiring-site) include a foreign [layer value](#layer-value) reference (case (b) of
the wiring-site predicate).

#### Effect on metric

Replacing the layer import with a `yield*` of the [service key](#service-key) removes M from the
`wiringSpread` numerator and deletes the [value edge](#value-edge) from M to the implementation
module, shrinking M's [reach set](#reach-set) to the key's (usually tiny) declaration module —
`wiringSpread` and `reachDensity` both drop. Mechanism addressed: concrete coupling — business
logic that names its implementation cannot be recomposed, tested with substitutes, or shielded from
the implementation's dependency subtree.

#### Trade-offs

The requirement surfaces in M's Effect type (`R` gains the key) and some
[composition root](#composition-root) must now provide it — that is the point, but it is a
signature change for every caller; `bun run typecheck` enumerates them.

**Before:**

```ts
// file: src/greetBefore.ts
import { Effect } from "effect"
import { Clock } from "./clock.ts"
import { ClockLive } from "./clockWiring.ts"

// Business logic names its implementation: wiring violation, concrete coupling.
export const greet: Effect.Effect<string> = Effect.provide(
  Effect.gen(function* () {
    const clock = yield* Clock
    return `hello at ${yield* clock.now()}`
  }),
  ClockLive
)
```

**After:**

```ts
// file: src/greetAfter.ts
import { Effect } from "effect"
import { Clock } from "./clock.ts"

// Capability coupling only: the requirement is visible in the type; no layer import.
export const greet: Effect.Effect<string, never, Clock> = Effect.gen(function* () {
  const clock = yield* Clock
  return `hello at ${yield* clock.now()}`
})
```

```ts
// file: src/bin/greetMain.ts
import { Effect } from "effect"
import { ClockLive } from "../clockWiring.ts"
import { greet } from "../greetAfter.ts"

// The implementation choice moved to the composition root.
void Effect.runPromise(Effect.provide(greet, ClockLive))
```

#### Confirmation

Measure; invert the dependency and move the layer reference to a
[composition root](#composition-root); re-measure. Success: `wiringSpread` strictly decreased, no
other [sub-ratio](#sub-ratio) increased, all invariants hold.

**Confirmation implementation:**

```ts
// file: scripts/modularity/confirmInversion.ts
import { confirmLever } from "./confirm.ts"
import type { MeasurementRecord } from "./record.ts"

export const confirmKeyInversion = (
  before: MeasurementRecord,
  after: MeasurementRecord
): boolean => confirmLever(before, after, "wiringSpread")
```

### Hoist provision to composition roots

Every [provision site](#provision-site) in a [wiring violation](#wiring-violation) module MUST move
to a [composition root](#composition-root) or into an exported [layer value](#layer-value) built
with `Layer.provide`.

#### Applicability

The [wiring report](#wiring-violation) lists a module among `violations` whose
[wiring sites](#wiring-site) include a [provision site](#provision-site) (case (a)); distinguished
from the previous lever by the offending node kind in the decomposition.

#### Effect on metric

Moving the provide call removes the module from the `wiringSpread` numerator; if the layer import
leaves with it, `reachDensity` also drops. Mechanism addressed: mid-flow provisioning — satisfying
a requirement deep inside business logic freezes the implementation choice for every transitive
caller and hides the dependency from the signature that callers see.

#### Trade-offs

Requirements propagate outward through Effect types until they reach the root — signatures grow an
`R` parameter; this is information that was previously hidden, not new coupling. Layer memoization
behavior can change if the same layer was provided in several places; the pinned `bun test` guards
observable behavior.

**Before:**

```ts
// file: src/inventoryBefore.ts
import { Effect } from "effect"
import { Clock } from "./clock.ts"
import { ClockLive } from "./clockWiring.ts"

const stampedCount = Effect.gen(function* () {
  const clock = yield* Clock
  return { count: 3, at: yield* clock.now() }
})

// Provision site buried in business logic: callers cannot substitute Clock.
export const inventory = Effect.provide(stampedCount, ClockLive)
```

**After:**

```ts
// file: src/inventoryAfter.ts
import { Effect } from "effect"
import { Clock } from "./clock.ts"

// The requirement stays visible; no provision here.
export const inventory: Effect.Effect<
  { readonly count: number; readonly at: number },
  never,
  Clock
> = Effect.gen(function* () {
  const clock = yield* Clock
  return { count: 3, at: yield* clock.now() }
})
```

```ts
// file: src/bin/inventoryMain.ts
import { Effect } from "effect"
import { ClockLive } from "../clockWiring.ts"
import { inventory } from "../inventoryAfter.ts"

// Provision at the composition root.
void Effect.runPromise(Effect.provide(inventory, ClockLive))
```

#### Confirmation

Measure; hoist every listed provision site; re-measure. Success: `wiringSpread` strictly decreased,
no other [sub-ratio](#sub-ratio) increased, all invariants hold.

**Confirmation implementation:**

```ts
// file: scripts/modularity/confirmHoist.ts
import { confirmLever } from "./confirm.ts"
import type { MeasurementRecord } from "./record.ts"

export const confirmProvisionHoist = (
  before: MeasurementRecord,
  after: MeasurementRecord
): boolean => confirmLever(before, after, "wiringSpread")
```

### Defer import-time effects into layers or functions

Every [import-time effect](#import-time-effect) MUST move inside a function, an Effect value, or a
[layer value](#layer-value) so that loading the module performs no work.

#### Applicability

`importEffectRatio.numerator > 0`; the `perModule` decomposition names the modules and the
[predicate](#import-time-effect) returns the offending statements.

#### Effect on metric

Each cleaned module leaves the `importEffectRatio` numerator. Mechanism addressed: load-order
coupling — a module whose *import* performs work makes every importer (including types-only and
test importers) trigger that work, so importers are coupled to evaluation order and to the effect's
environment even when they never call anything.

#### Trade-offs

Callers must now run the effect explicitly (that is the point); one-time-initialization semantics
previously guaranteed by module evaluation must be reproduced deliberately (a
[layer value](#layer-value) is built once per provision scope — `bun test` confirms behavior).

**Before:**

```ts
// file: src/telemetryBefore.ts
import { Effect } from "effect"

// Import-time effect: connecting happens because someone imported this module.
console.log("connecting telemetry")
export const emit = (event: string): Effect.Effect<void> =>
  Effect.sync(() => console.log(`emit ${event}`))
```

**After:**

```ts
// file: src/telemetryAfter.ts
import { Context, Effect, Layer } from "effect"

export class Telemetry extends Context.Service<
  Telemetry,
  { readonly emit: (event: string) => Effect.Effect<void> }
>()("app/Telemetry") {}

// The connect work now runs when the layer is built, not when the module loads.
export const TelemetryLive: Layer.Layer<Telemetry> = Layer.effect(
  Telemetry,
  Effect.sync(() => {
    console.log("connecting telemetry")
    return { emit: (event) => Effect.sync(() => console.log(`emit ${event}`)) }
  })
)
```

#### Confirmation

Measure; defer every listed statement; re-measure. Success: `importEffectRatio` strictly decreased,
no other [sub-ratio](#sub-ratio) increased, all invariants hold.

**Confirmation implementation:**

```ts
// file: scripts/modularity/confirmDeferred.ts
import { confirmLever } from "./confirm.ts"
import type { MeasurementRecord } from "./record.ts"

export const confirmDeferredEffects = (
  before: MeasurementRecord,
  after: MeasurementRecord
): boolean => confirmLever(before, after, "importEffectRatio")
```

### Replace ambient coupling with explicit contracts

Every [ambient coupling](#ambient-coupling) construct MUST be replaced by an exported declaration
or a [service key](#service-key) that consumers import explicitly.

#### Applicability

`ambientRatio.numerator > 0`; the `perModule` decomposition names the modules and the
[predicate](#ambient-coupling) returns the offending nodes with their case (a)/(b)/(c).

#### Effect on metric

Each cleaned module leaves the `ambientRatio` numerator; new explicit imports add visible, narrow
edges (a strictly better trade: the coupling existed before, invisibly). Mechanism addressed:
invisible contracts — globals and augmentations create dependencies the
[module graph](#module-graph) cannot see, so no reach- or cycle-based reasoning is sound while they
exist.

#### Trade-offs

`reachDensity` can tick up because the hidden edge becomes visible — when the same change also
removes a global, that is an accounting correction, not new coupling; if the Pareto rule blocks the
verdict, apply the change together with one of the density levers in a single measured step.

**Before:**

```ts
// file: src/versionBefore.ts
export const marker = "versionBefore"

// Ambient coupling: a global mutated at import time, read by strangers.
declare global {
  var appBuild: string
}
globalThis.appBuild = "2026.07.28"
```

**After:**

```ts
// file: src/versionAfter.ts
// Explicit contract: consumers import it, creating a visible edge.
export const appBuild = "2026.07.28"
```

```ts
// file: src/versionConsumer.ts
import { appBuild } from "./versionAfter.ts"

export const banner = `build ${appBuild}`
```

#### Confirmation

Measure; replace every listed construct; re-measure. Success: `ambientRatio` strictly decreased,
no other [sub-ratio](#sub-ratio) increased, all invariants hold.

**Confirmation implementation:**

```ts
// file: scripts/modularity/confirmExplicit.ts
import { confirmLever } from "./confirm.ts"
import type { MeasurementRecord } from "./record.ts"

export const confirmExplicitContracts = (
  before: MeasurementRecord,
  after: MeasurementRecord
): boolean => confirmLever(before, after, "ambientRatio")
```

### Type the boundary with schemas

Every [boundary-any export](#boundary-any-export) MUST replace `any` with a concrete type,
`unknown`, or a `Schema`-decoded value at the point where outside data enters.

#### Applicability

`anySurface.numerator > 0`; the `perModule` decomposition names the exporting modules and the
[predicate](#boundary-any-export) identifies each any-carrying export.

#### Effect on metric

Each retyped export leaves the `anySurface` numerator. Mechanism addressed: contract erosion —
`any` at a boundary silently disables checking in every consumer, so implementation changes
propagate as runtime surprises instead of compile errors, defeating the purpose of a typed module
boundary.

#### Trade-offs

Consumers with latent type errors surface immediately (`bun run typecheck` — desirable but
possibly noisy); schema decoding adds a runtime validation cost on the boundary path, detectable
with `bun run bench:self`.

**Before:**

```ts
// file: src/settingsBefore.ts
import { Effect } from "effect"

// Boundary-any export: downstream code is unchecked.
export const loadSettings = (raw: any): Effect.Effect<{ readonly retries: number }> =>
  Effect.succeed({ retries: raw.retries })
```

**After:**

```ts
// file: src/settingsAfter.ts
import { Effect, Schema } from "effect"

const Settings = Schema.Struct({ retries: Schema.Number })

// Typed boundary: unknown in, decoded value or tagged failure out.
export const loadSettings = (
  raw: unknown
): Effect.Effect<{ readonly retries: number }, Schema.SchemaError> =>
  Schema.decodeUnknownEffect(Settings)(raw)
```

#### Confirmation

Measure; retype every listed export; re-measure. Success: `anySurface` strictly decreased, no other
[sub-ratio](#sub-ratio) increased, the [assertion-laundering](#assertion-laundering-site) guard did
not increase, all invariants hold.

**Confirmation implementation:**

```ts
// file: scripts/modularity/confirmTypedBoundary.ts
import { confirmLever } from "./confirm.ts"
import type { MeasurementRecord } from "./record.ts"

export const confirmTypedBoundary = (
  before: MeasurementRecord,
  after: MeasurementRecord
): boolean =>
  confirmLever(before, after, "anySurface") &&
  after.guards.assertionLaunderingSites <= before.guards.assertionLaunderingSites
```

### Tag boundary error channels

Every [untagged-error export](#untagged-error-export) MUST declare its failures as
[tagged error types](#tagged-error-type) built with `Schema.TaggedErrorClass`.

#### Applicability

`untaggedErrorRatio.numerator > 0`; the `perModule` decomposition names the exporting modules and
the [predicate](#untagged-error-export) identifies each offending export.

#### Effect on metric

Each tagged channel leaves the `untaggedErrorRatio` numerator. Mechanism addressed: opaque failure
contracts — an error channel of `Error`/`unknown` forces consumers to treat all failures alike or
to sniff shapes at runtime; the failure surface of the module boundary is unspecified, so error
handling logic couples to implementation details instead of a declared contract.

#### Trade-offs

Error unions surface through callers' types (churn enumerated by `bun run typecheck`); tagged
classes add small runtime constructors. Never satisfy this lever with `Effect.orDie` — that games
the ratio and the [defect-conversion guard](#defect-conversion-site) rejects it.

**Before:**

```ts
// file: src/fetchUserBefore.ts
import { Effect } from "effect"

// Untagged-error export: consumers cannot match on failure cases.
export const fetchUser = (id: string): Effect.Effect<{ readonly id: string }, Error> =>
  id.length > 0
    ? Effect.succeed({ id })
    : Effect.fail(new Error("empty id"))
```

**After:**

```ts
// file: src/fetchUserAfter.ts
import { Effect, Schema } from "effect"

// Tagged failure declared with Schema.TaggedErrorClass (idiomatic Effect v4).
export class EmptyUserId extends Schema.TaggedErrorClass<EmptyUserId>()("EmptyUserId", {
  attempted: Schema.String
}) {}

// Tagged channel: exhaustively matchable by consumers.
export const fetchUser = (id: string): Effect.Effect<{ readonly id: string }, EmptyUserId> =>
  id.length > 0
    ? Effect.succeed({ id })
    : Effect.fail(new EmptyUserId({ attempted: id }))
```

#### Confirmation

Measure; tag every listed channel; re-measure. Success: `untaggedErrorRatio` strictly decreased, no
other [sub-ratio](#sub-ratio) increased, `defectConversionSites` did not increase, all invariants
hold.

**Confirmation implementation:**

```ts
// file: scripts/modularity/confirmTaggedErrors.ts
import { confirmLever } from "./confirm.ts"
import type { MeasurementRecord } from "./record.ts"

export const confirmTaggedErrors = (
  before: MeasurementRecord,
  after: MeasurementRecord
): boolean =>
  confirmLever(before, after, "untaggedErrorRatio") &&
  after.guards.defectConversionSites <= before.guards.defectConversionSites
```

### Deduplicate exported types into one owner

Every [duplicate exported type](#duplicate-exported-type) group SHOULD collapse to a single
declaration in one module, with every other former declarer importing it type-only.

#### Applicability

`dupTypeRatio.numerator > 0`; each [duplicate group](#duplicate-exported-type) lists its members;
the lexicographically first member is the default owner (any member works — pick deterministically).

#### Effect on metric

Each collapsed group removes (size − 1) from the `dupTypeRatio` numerator; the replacement imports
are [type-only edges](#type-only-edge), so no value coupling appears. Mechanism addressed:
copy-coupling — structurally identical contracts in several modules must evolve in lockstep with no
edge announcing the obligation, so they drift, and consumers written against one copy break against
another.

#### Trade-offs

`reachDensity` gains one type-only edge per former duplicate (visible, narrow — usually outweighed;
the Pareto comparison arbitrates). Nominal-identity effects: two previously distinct-but-identical
declarations become one, which can *fix* latent assignability accidents but also merge types that
were duplicated intentionally to diverge later — the divergence intent is unobservable, so the
lever is SHOULD, not MUST.

**Before:**

```ts
// file: src/pricingBefore.ts
// Duplicate declaration #1.
export interface AmountShape {
  readonly value: number
  readonly currency: string
}
export const priceOf = (amount: AmountShape): string => `${amount.value} ${amount.currency}`
```

```ts
// file: src/billingBefore.ts
// Duplicate declaration #2 — must evolve in lockstep with #1, silently.
export interface AmountShape {
  readonly value: number
  readonly currency: string
}
export const invoiceFor = (amount: AmountShape): string => `${amount.currency}${amount.value}`
```

**After:**

```ts
// file: src/amount.ts
// The single owner.
export interface AmountShape {
  readonly value: number
  readonly currency: string
}
```

```ts
// file: src/pricingAfterDedupe.ts
import type { AmountShape } from "./amount.ts"
export const priceOf = (amount: AmountShape): string => `${amount.value} ${amount.currency}`
```

```ts
// file: src/billingAfterDedupe.ts
import type { AmountShape } from "./amount.ts"
export const invoiceFor = (amount: AmountShape): string => `${amount.currency}${amount.value}`
```

#### Confirmation

Measure; collapse every group to its owner; re-measure. Success: `dupTypeRatio` strictly decreased,
no other [sub-ratio](#sub-ratio) increased, all invariants hold.

**Confirmation implementation:**

```ts
// file: scripts/modularity/confirmDedupe.ts
import { confirmLever } from "./confirm.ts"
import type { MeasurementRecord } from "./record.ts"

export const confirmTypeDedupe = (
  before: MeasurementRecord,
  after: MeasurementRecord
): boolean => confirmLever(before, after, "dupTypeRatio")
```

### Route cross-package imports through declared entry points

Every [boundary bypass edge](#boundary-bypass-edge) MUST be rewritten to a bare specifier matching
a key of the target [package](#package)'s `exports` map, adding the key when the target module is
intended surface.

#### Applicability

`bypassRatio.numerator > 0`; the `perModule` decomposition names the importing modules and the
[predicate](#boundary-bypass-edge) lists each offending edge with its specifier.

#### Effect on metric

Each rewritten edge leaves the `bypassRatio` numerator. Mechanism addressed: encapsulation bypass —
a relative or undeclared deep import binds the consumer to the target package's internal layout,
so the target cannot move files or hide internals without breaking strangers it never exposed
anything to.

#### Trade-offs

Adding an `exports` key widens the target's declared surface (a deliberate contract decision);
build order starts to matter when the key resolves into `dist`. Both are visible in review; neither
moves another [sub-ratio](#sub-ratio).

**Before:**

```ts
// file: packages/cli/src/statusBefore.ts
// Boundary bypass: relative path into a sibling package's internals.
import { internalHelper } from "../../core/src/engine/internal.ts"

export const status = (): string => internalHelper()
```

**After:**

```ts
// file: packages/cli/src/statusAfter.ts
// Declared surface: bare specifier matching an exports key of @better-typescript/core.
import { internalHelper } from "@better-typescript/core/engine/internal"

export const status = (): string => internalHelper()
```

```jsonc
// file: packages/core/package.json (fragment) — the key added by this lever
{
  "exports": {
    "./engine/internal": { "default": "./dist/engine/internal.js" }
  }
}
```

#### Confirmation

Measure; rewrite every listed edge (adding `exports` keys as needed); re-measure. Success:
`bypassRatio` strictly decreased, no other [sub-ratio](#sub-ratio) increased, all invariants hold.

**Confirmation implementation:**

```ts
// file: scripts/modularity/confirmRouted.ts
import { confirmLever } from "./confirm.ts"
import type { MeasurementRecord } from "./record.ts"

export const confirmRoutedImports = (
  before: MeasurementRecord,
  after: MeasurementRecord
): boolean => confirmLever(before, after, "bypassRatio")
```

### Diagnostic procedure

Deterministic mapping from a [measurement record](#measurement-record) and its decomposition to the
ordered applicable levers:

1. For each [sub-ratio](#sub-ratio) with `numerator > 0`, compute its potential MCI reduction
   `value / 11` (driving the numerator to zero with denominators fixed).
2. Map each dimension to its levers in the fixed table below; order dimensions by potential
   reduction descending, tie-broken by table order; within a dimension, order target modules by
   `perModule` attribution descending, tie-broken lexicographically.
3. Emit the flat list of (lever, module) pairs; apply the first, confirm, re-run the diagnosis.

| Dimension             | Levers, in order                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------- |
| `typeSufficientRatio` | Convert type-sufficient edges to type-only imports                                                        |
| `surfaceWaste`        | Delete unused exports                                                                                     |
| `reachDensity`        | Replace barrel imports with direct imports; Split modules with partitioned consumers; Depend on service keys instead of implementations |
| `cycleRatio`          | Break dependency cycles by extracting shared declarations                                                 |
| `wiringSpread`        | Depend on service keys instead of implementations; Hoist provision to composition roots                    |
| `importEffectRatio`   | Defer import-time effects into layers or functions                                                        |
| `ambientRatio`        | Replace ambient coupling with explicit contracts                                                          |
| `anySurface`          | Type the boundary with schemas                                                                            |
| `untaggedErrorRatio`  | Tag boundary error channels                                                                               |
| `dupTypeRatio`        | Deduplicate exported types into one owner                                                                 |
| `bypassRatio`         | Route cross-package imports through declared entry points                                                 |

```ts
// file: scripts/modularity/diagnose.ts
import type { MeasurementRecord } from "./record.ts"

const LEVERS: Readonly<Record<string, readonly string[]>> = {
  typeSufficientRatio: ["Convert type-sufficient edges to type-only imports"],
  surfaceWaste: ["Delete unused exports"],
  reachDensity: [
    "Replace barrel imports with direct imports",
    "Split modules with partitioned consumers",
    "Depend on service keys instead of implementations"
  ],
  cycleRatio: ["Break dependency cycles by extracting shared declarations"],
  wiringSpread: [
    "Depend on service keys instead of implementations",
    "Hoist provision to composition roots"
  ],
  importEffectRatio: ["Defer import-time effects into layers or functions"],
  ambientRatio: ["Replace ambient coupling with explicit contracts"],
  anySurface: ["Type the boundary with schemas"],
  untaggedErrorRatio: ["Tag boundary error channels"],
  dupTypeRatio: ["Deduplicate exported types into one owner"],
  bypassRatio: ["Route cross-package imports through declared entry points"]
}

const TABLE_ORDER = Object.keys(LEVERS)

export interface Diagnosis {
  readonly lever: string
  readonly module: string
  readonly potentialMciReduction: number
}

export function diagnose(record: MeasurementRecord): readonly Diagnosis[] {
  const dimensions = TABLE_ORDER.filter(
    (name) => (record.subRatios[name]?.numerator ?? 0) > 0
  ).sort((a, b) => {
    const reduction =
      (record.subRatios[b]?.value ?? 0) / 11 - (record.subRatios[a]?.value ?? 0) / 11
    return reduction !== 0 ? Math.sign(reduction) : TABLE_ORDER.indexOf(a) - TABLE_ORDER.indexOf(b)
  })
  const out: Diagnosis[] = []
  for (const dimension of dimensions) {
    const entry = record.subRatios[dimension]
    if (entry === undefined) continue
    const modules = Object.entries(entry.perModule).sort(([moduleA, countA], [moduleB, countB]) =>
      countB !== countA ? countB - countA : moduleA.localeCompare(moduleB)
    )
    for (const lever of LEVERS[dimension] ?? []) {
      for (const [module] of modules) {
        out.push({ lever, module, potentialMciReduction: entry.value / 11 })
      }
    }
  }
  return out
}
```

## Invariants against gaming

A confirmation is valid only when the primary success criterion **and every applicable invariant
below** hold simultaneously — the `compare` implementation enforces them together; a lever
application whose pair fails any invariant is recorded as `regression`, whatever the
[MCI](#modularity-cost-index) did.

1. **Deleting covered functionality.** Removing features removes their edges, exports, and error
   channels, improving several [sub-ratios](#sub-ratio) while destroying value. Invariant:
   `checksPassed` — the pinned commands `bun run typecheck` and `bun test` exit 0 on the after
   state, so behavior covered by the suite must survive. Residual: uncovered behavior can still be
   deleted; the used-export counts in the decomposition make large deletions visible for review.

2. **Merging everything into one module.** One giant module has no edges, no cycles, no
   cross-module duplicates: near-zero MCI, zero modularity. Invariant: the
   [size concentration](#size-concentration) guard — `sizeConcentration(after)` must not exceed
   `sizeConcentration(before) × 1.05` when any sub-ratio improved. Merging shifts line-share mass
   into one file and trips the bound; ordinary refactors do not.

3. **Padding the module count.** Adding disconnected files inflates N, deflating `reachDensity`,
   `cycleRatio`, `importEffectRatio`, and `ambientRatio` denominators without touching real
   coupling. Invariant: `entryLikeModules` (count of in-degree-0 [modules](#module)) must not
   increase across an improving pair — every padded file has no importer, so it lands in that
   count. Legitimate new binaries or tests also raise it; those changes re-baseline instead of
   claiming a lever confirmation.

4. **Shifting code outside the measurement boundary.** Vendoring a subsystem into `node_modules`,
   a git dependency, or generated build output removes its modules and edges from the
   [project source set](#project-source-set) while the coupling persists at runtime. Invariant:
   the sorted `externalSpecifiers` list must not gain members across an improving pair — moved-out
   code must be imported back by some bare specifier, and any new external specifier invalidates
   the confirmation.

5. **Excluding files via configuration.** Narrowing tsconfig `include` shrinks the measured set
   arbitrarily. Invariant: `tsconfigDigest` equality is required for pair validity — any tsconfig
   change makes the pair `invalid-pair`, forcing an explicit re-baseline rather than a claimed
   improvement.

6. **Laundering errors into defects.** `Effect.orDie` empties the error channel: `E = never`
   passes the [tagged error type](#tagged-error-type) predicate vacuously, improving
   `untaggedErrorRatio` while making the failure contract *worse*. Invariant: when
   `untaggedErrorRatio` improves, the [defect-conversion site](#defect-conversion-site) count must
   not increase.

7. **Laundering `any` through casts.** Replacing an exported `any` with a concrete annotation
   backed by `as unknown as T` (or `as any` internally at the return site) clears
   [boundary-any](#boundary-any-export) detection while the value stays unchecked. Invariant: when
   `anySurface` improves, the [assertion laundering site](#assertion-laundering-site) count must
   not increase.

8. **Inlining shared code to delete edges.** Copy-pasting a helper into each consumer removes
   import edges (improving `reachDensity`) by converting visible coupling into copy-coupling.
   Invariants: [duplicate exported type](#duplicate-exported-type) detection catches the type half
   directly (`dupTypeRatio` rises — Pareto rejects); for value code, when `reachDensity` improves,
   the total [source line count](#source-line-count) must not grow beyond
   `before × 1.02` — inlining N copies of a helper adds N−1 bodies and trips the bound.

9. **Exploiting the mean.** Improving an easy dimension while regressing a hard one can still
   lower the average. Invariant: the Pareto rule in the comparison procedure — *no*
   [sub-ratio](#sub-ratio) may increase in an improving pair; trade-offs across dimensions must be
   split into separately-measured steps, each independently non-regressive.

10. **Hiding wiring in layer-exporting modules.** A business module could export a trivial
    [layer value](#layer-value) solely to claim the [wiring violation](#wiring-violation)
    exemption. Companion measurement: the `wiringSpread` denominator (`wired` module count) is in
    the record; a module gaining a layer export while keeping provision sites keeps the denominator
    flat and the numerator drop is visible per-module — reviewers reject exemption-by-decoration
    when the exported layer has no external use, which simultaneously shows up as a new
    [unused export](#unused-export) in `surfaceWaste` and blocks the Pareto rule.

Counterexample audit (the three required constructions): a degradation the measurement cannot
detect — moving coupling into runtime service state (declared unmeasured in the validity audit; no
invariant claims it); a detected degradation no lever matches — none: every
[sub-ratio](#sub-ratio) numerator maps to at least one lever in the
[diagnostic table](#diagnostic-procedure), and every lever cites the dimension whose numerator it
reduces; a metric improvement that games the property — each known transformation above is rejected
by its named invariant, and any new one must pass all ten simultaneously plus the Pareto rule to be
recorded as an improvement.
