# Semantic project structure measurement and optimization

## Informal definition

Semantic project structure is the degree to which a project's physical layout — its directory
tree, the placement of each file within it, and each file's name — functions as an accurate index
of the code's meaning. In a project with strong semantic structure a reader can predict where a
module lives from what it does, and predict what a module does from where it lives and what it is
called. Physical proximity tracks semantic coupling: files that import one another, or serve the
same dependents, sit near each other in the tree. Directory boundaries fall where dependency
clusters actually separate. A file's name is drawn from the names of the things it exports.
Sibling directories depend on one another in a single direction. A subtree is consumed from
outside through few of its files rather than through arbitrary deep reaches. Files that play the
same structural role — schema definitions, service interfaces, layer wiring, tests — are findable
through one consistent placement or naming scheme.

The property degrades through identifiable mechanisms: a feature's modules smear across distant
directories; a grab-bag directory accumulates mutually unrelated modules; filenames drift away
from their contents (a `helpers.ts` exporting a parser); nesting inserts directories that carry no
branching; two directories come to import each other so their boundary stops meaning anything; a
barrel re-exports files from foreign subtrees so import paths stop reflecting real locations; one
file accretes exports serving disjoint consumers; the interface (service key) and implementation
wiring (layer) of an Effect service fuse into one file whose consumers drag implementation
dependencies; tests drift away from the code they exercise.

Improvement and degradation vary a set of dimensionless ratios in [0, 1] — locality of import
edges in the directory tree, agreement between the directory partition and a dependency-derived
clustering, predictability of a module's role from its location and name, overlap between file
names and export names, narrowness of subtree import interfaces, acyclicity of directory-level
dependencies, and correspondence between tests and their subjects — combined into one weighted
score. The property covers only physical organization as a function of code semantics; it
excludes code quality itself (a well-organized project can contain bad code), identifier
readability inside module bodies, and runtime behavior. The measurement below operationalizes
each dimension as a deterministic function of the type-checked source, and each optimization
lever removes exactly one degradation mechanism in a way the measurement can confirm.

## Definitions

Predicate implementations below reference predicates from earlier entries by re-declaring them
with `declare function` under the exact signature established at their definition, so every
snippet type-checks independently against its stated imports (`typescript` and `effect` at the
versions pinned in [Measurement › Procedure](#procedure)).

### Project module

A file that belongs to the measured project's compilation: it is a member of the file list
produced by parsing the measured `tsconfig.json` (`fileNames` of the parsed command line), and

- it is not a declaration file (its path does not end in `.d.ts`), and
- no path segment of it equals `node_modules`.

Observable inputs: the tsconfig path, the tsconfig contents, and the filesystem visible to the
compiler host. Paths are resolved to absolute canonical form before any comparison.

#### Related terms

| Term             | Relation                                            | Deciding distinction                                             | Why it is not interchangeable here                                                                        |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Source file      | Superset                                            | The compiler loads lib files, `.d.ts`, and dependency files too  | Layout of files the maintainer does not place (libs, dependencies) is not the maintainer's organization    |
| Declaration file | Excluded subset                                     | Path ends in `.d.ts`                                             | Declaration files are generated or ambient surface, not placed semantic content                            |
| External module  | Disjoint                                            | Resolves under `node_modules` or to a runtime builtin            | The project cannot reorganize a dependency's files                                                         |
| Compilation unit | Container                                           | The whole set of project modules for one tsconfig                | The metric's domain is the unit; a project module is one element of it                                     |

```jsonc
// tsconfig.json of the measured project — the parse of this file decides membership
{
  "compilerOptions": { "module": "nodenext", "strict": true },
  // "include" determines fileNames, hence the candidate set
  "include": ["src/**/*.ts"]
}
```

**This:**

```ts
// file: src/user/user.ts
// Project module: matched by "include", not a .d.ts, not under node_modules.
export interface User {
  readonly id: string
}
```

**Not this:**

```ts
// file: src/ambient.d.ts
// NOT a project module: member of fileNames but the path ends in ".d.ts"
// (excluded item: "not a declaration file").
declare module "config-blob" {
  const value: unknown
  export default value
}
```

```ts
// file: node_modules/effect/dist/index.js — path contains a "node_modules" segment
// (excluded item: "no path segment equals node_modules"), so even if a tsconfig
// resolved into it, it is NOT a project module.
// file: scripts/migrate.ts — not matched by "include", absent from fileNames
// (excluded item: "member of the parsed file list"), so it is NOT a project module.
export {}
```

**Mechanical predicate:** input: a tsconfig path and a candidate file path. Parse the tsconfig
with the compiler's config parser; resolve every `fileNames` entry and the candidate to absolute
canonical paths; return `true` iff the candidate is in the resolved list, does not end in
`.d.ts`, and has no `node_modules` path segment.

**Predicate implementation:**

```ts
import ts from "typescript"

export function projectModules(tsconfigPath: string): ReadonlyArray<string> {
  const host: ts.ParseConfigFileHost = {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, "\n"))
    }
  }
  const parsed = ts.getParsedCommandLineOfConfigFile(tsconfigPath, undefined, host)
  if (parsed === undefined) throw new Error(`unreadable tsconfig: ${tsconfigPath}`)
  return parsed.fileNames
    .map((f) => ts.sys.resolvePath(f))
    .filter((f) => !f.endsWith(".d.ts")) // not a declaration file
    .filter((f) => !f.split("/").includes("node_modules")) // not under node_modules
    .sort() // canonical order for every downstream traversal
}

export function isProjectModule(tsconfigPath: string, candidate: string): boolean {
  return projectModules(tsconfigPath).includes(ts.sys.resolvePath(candidate))
}
```

### Source root

The directory against which all physical structure is interpreted: the resolved
`compilerOptions.rootDir` of the measured tsconfig when it is set; otherwise the longest common
directory prefix of the parent directories of all [project modules](#project-module). With zero
[project modules](#project-module) the source root is the tsconfig's directory.

**Mechanical predicate:** input: the tsconfig path. Output (a valuation, unit: absolute path
string): `rootDir` if present in the parsed options; else fold the module list, splitting each
parent directory on `/` and keeping the longest shared prefix.

**Predicate implementation:**

```ts
import ts from "typescript"

declare function projectModules(tsconfigPath: string): ReadonlyArray<string>

export function sourceRoot(tsconfigPath: string): string {
  const host: ts.ParseConfigFileHost = {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: () => {}
  }
  const parsed = ts.getParsedCommandLineOfConfigFile(tsconfigPath, undefined, host)
  if (parsed?.options.rootDir !== undefined) return ts.sys.resolvePath(parsed.options.rootDir)
  const modules = projectModules(tsconfigPath)
  const tsconfigDir = tsconfigPath.split("/").slice(0, -1).join("/") || "/"
  if (modules.length === 0) return tsconfigDir
  let prefix = modules[0]!.split("/").slice(0, -1)
  for (const m of modules) {
    const parts = m.split("/").slice(0, -1)
    let i = 0
    while (i < prefix.length && i < parts.length && prefix[i] === parts[i]) i += 1
    prefix = prefix.slice(0, i)
  }
  return prefix.join("/") || "/"
}
```

```jsonc
// Valuation example — both branches of the predicate:
{
  // branch "rootDir set": tsconfig has "rootDir": "src" → source root = <project>/src
  "withRootDir": { "rootDir": "src", "sourceRoot": "/repo/src" },
  // branch "rootDir unset": modules /repo/src/a/x.ts and /repo/src/b/y.ts
  // → longest common parent-directory prefix = /repo/src
  "withoutRootDir": {
    "modules": ["/repo/src/a/x.ts", "/repo/src/b/y.ts"],
    "sourceRoot": "/repo/src"
  }
}
```

### Directory tree

The rooted tree whose node set contains the [source root](#source-root) and every directory on
the path from the [source root](#source-root) to the parent directory of any
[project module](#project-module); whose edges connect each directory to its filesystem parent;
and in which each [project module](#project-module) is attached to its parent directory node.
Directories containing no [project module](#project-module) anywhere beneath them are not nodes.

**Mechanical predicate:** input: the module list and the [source root](#source-root). For each
module, strip the root prefix, split the remainder on `/`, and emit every proper prefix of the
segment list as a directory node; a candidate directory is a node iff it is emitted for at least
one module. Membership of a module at a node holds iff the node equals the module's parent
directory.

**Predicate implementation:**

```ts
export function directoryNodes(modules: ReadonlyArray<string>, root: string): ReadonlyArray<string> {
  const nodes = new Set<string>([root])
  for (const m of modules) {
    const rel = m.startsWith(`${root}/`) ? m.slice(root.length + 1) : m
    const segments = rel.split("/").slice(0, -1) // drop the filename
    for (let i = 1; i <= segments.length; i += 1) {
      nodes.add(`${root}/${segments.slice(0, i).join("/")}`)
    }
  }
  return [...nodes].sort()
}
```

```jsonc
// Directory tree for modules /repo/src/user/user.ts and /repo/src/billing/invoice.ts
// with source root /repo/src:
{
  // node set: the source root plus every directory on a path to a module's parent
  "nodes": ["/repo/src", "/repo/src/billing", "/repo/src/user"],
  // edges: each directory to its filesystem parent
  "edges": [["/repo/src/billing", "/repo/src"], ["/repo/src/user", "/repo/src"]],
  // attachment: each project module at its parent directory node
  "attachments": {
    "/repo/src/user/user.ts": "/repo/src/user",
    "/repo/src/billing/invoice.ts": "/repo/src/billing"
  },
  // non-node: /repo/src/assets exists on disk but contains no project module → not a node
  "notANode": "/repo/src/assets"
}
```

### Module directory

The parent directory of a [project module](#project-module); the node of the
[directory tree](#directory-tree) at which the module is attached.

**Mechanical predicate:** input: a module path. Output (valuation, unit: absolute path string):
the path with its final segment removed.

**Predicate implementation:**

```ts
export function moduleDirectory(module: string): string {
  return module.split("/").slice(0, -1).join("/") || "/"
}
```

```ts
// The module directory of "/repo/src/user/user.ts" is "/repo/src/user".
declare function moduleDirectory(module: string): string
const dir: string = moduleDirectory("/repo/src/user/user.ts") // "/repo/src/user"
```

### Directory depth

The number of edges between a [directory tree](#directory-tree) node and the
[source root](#source-root). The [source root](#source-root) has depth 0.

**Mechanical predicate:** input: a directory node path and the root path. Output (valuation,
unit: non-negative integer): the count of `/`-separated segments of the node path after removing
the root prefix; 0 when the node equals the root.

**Predicate implementation:**

```ts
export function directoryDepth(dir: string, root: string): number {
  if (dir === root) return 0
  return dir.slice(root.length + 1).split("/").length
}
```

```ts
declare function directoryDepth(dir: string, root: string): number
const d0 = directoryDepth("/repo/src", "/repo/src") // 0 — the source root itself
const d2 = directoryDepth("/repo/src/user/model", "/repo/src") // 2 — two edges below the root
```

### Directory subtree

For a [directory tree](#directory-tree) node `D`: the set containing `D`, every descendant
directory node of `D`, and every [project module](#project-module) attached at `D` or at a
descendant.

**Mechanical predicate:** input: node path `D`, another path `p` (directory or module). `p` is in
the subtree of `D` iff `p === D` or `p` starts with `D + "/"`.

**Predicate implementation:**

```ts
export function inSubtree(root: string, path: string): boolean {
  return path === root || path.startsWith(`${root}/`)
}
```

```ts
declare function inSubtree(root: string, path: string): boolean
// member: a module attached below the node
const a = inSubtree("/repo/src/user", "/repo/src/user/model/user.ts") // true
// member: the node itself
const b = inSubtree("/repo/src/user", "/repo/src/user") // true
// non-member: a sibling subtree
const c = inSubtree("/repo/src/user", "/repo/src/billing/invoice.ts") // false
```

### Name token

The unit of name comparison. Tokenizing a string (an identifier or a filename stem) applies, in
order:

1. insert a boundary between a lowercase letter or digit and an uppercase letter (camel-case
   boundary),
2. insert a boundary between a run of uppercase letters and an uppercase letter followed by a
   lowercase letter (acronym boundary),
3. split on every maximal run of non-alphanumeric characters,
4. lowercase every piece,
5. drop empty pieces.

**Mechanical predicate:** input: a string. Output (valuation, unit: ordered list of lowercase
alphanumeric strings): the result of steps 1–5.

**Predicate implementation:**

```ts
export function nameTokens(text: string): ReadonlyArray<string> {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1\u0000$2") // step 1: camel-case boundary
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1\u0000$2") // step 2: acronym boundary
    .split(/[^A-Za-z0-9]+|\u0000/) // step 3: non-alphanumeric split
    .map((t) => t.toLowerCase()) // step 4: lowercase
    .filter((t) => t.length > 0) // step 5: drop empties
}
```

```ts
declare function nameTokens(text: string): ReadonlyArray<string>
const t1 = nameTokens("UserService") // ["user", "service"] — step 1: camel-case boundary
const t2 = nameTokens("HTTPServer") // ["http", "server"] — step 2: acronym boundary
const t3 = nameTokens("parse-config.v2") // ["parse", "config", "v2"] — step 3: non-alphanumeric split
const t4 = nameTokens("Invoice") // ["invoice"] — step 4: lowercasing
const t5 = nameTokens("__") // [] — step 5: empty pieces dropped
```

### Import edge

A directed relationship `a → b` between two distinct [project modules](#project-module). The edge
exists iff module `a`'s AST contains at least one of:

- an import declaration (`import … from "s"`, including type-only `import type … from "s"`),
- a re-export declaration (`export … from "s"` or `export * from "s"`),
- a dynamic import whose argument is a string literal (`import("s")`),
- an import-equals declaration (`import x = require("s")`),

whose specifier `s`, resolved under the measured tsconfig's module resolution (including `paths`
aliases), names [project module](#project-module) `b`. Multiple qualifying statements collapse to
one edge. Excluded: specifiers that resolve to an external package, specifiers that resolve to an
ambient module declaration, specifiers that do not resolve, dynamic imports whose argument is not
a string literal, and triple-slash reference directives. Type-only imports are included because
the property is navigational: a type dependency is a semantic dependency between files.

#### Related terms

| Term                     | Relation        | Deciding distinction                                              | Why it is not interchangeable here                                                                 |
| ------------------------ | --------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Type-only import         | Included subset | `import type` erases at runtime                                   | Erasure changes runtime shape, not where a reader must navigate; the metric measures navigation      |
| External dependency edge | Excluded        | Resolves outside the [project module](#project-module) set        | The project cannot relocate a dependency; only intra-project edges respond to layout changes         |
| Runtime `require` call   | Excluded        | A call expression to `require`, not a static or `import()` form   | Not resolvable by the compiler's module resolution without evaluation; excluded for determinism      |
| Triple-slash reference   | Excluded        | A comment directive, not a module specifier                       | Declares ambient visibility, not a navigable module relationship                                     |

```ts
// file: src/billing/invoice.ts — comparison example set
import { Schema } from "effect" // external dependency edge: resolves into node_modules → NOT an import edge
import type { User } from "../user/user.js" // type-only import: IS an import edge to src/user/user.ts
export const InvoiceId = Schema.String
export interface Invoice {
  readonly id: string
  readonly owner: User
}
// A runtime `require` (CommonJS call) and a `/// <reference path="…" />` directive
// would create no import edge: neither is one of the four listed syntactic forms.
```

**This:**

```ts
// file: src/user/index.ts — every listed syntactic form, each creating the edge
// src/user/index.ts → src/user/user.ts
import { type User, parseUser } from "./user.js" // form: import declaration (incl. type-only binding)
export { parseUser } from "./user.js" // form: re-export declaration
export const lazyUser = () => import("./user.js") // form: dynamic import with string-literal specifier
import UserNs = require("./user.js") // form: import-equals declaration
export const reexported: typeof UserNs = UserNs
export const parse: typeof parseUser = parseUser
export type { User }
```

**Not this:**

```ts
// file: src/user/no-edges.ts — every listed exclusion; this module has NO import edges
import { Effect } from "effect" // exclusion: resolves to an external package
import config from "config-blob" // exclusion: resolves to an ambient module declaration (a .d.ts declare module)
export const dynamic = (name: string) => import(name) // exclusion: dynamic import without a string literal
// exclusion: an unresolved specifier such as `import "./missing.js"` produces no edge
// exclusion: `/// <reference path="../ambient.d.ts" />` is a directive, not a specifier
export const run = Effect.succeed(config)
```

**Mechanical predicate:** input: a `ts.Program` over the measured tsconfig. For each
[project module](#project-module), walk its AST collecting the string-literal specifiers of the
four listed forms; resolve each with `ts.resolveModuleName` under the program's options; keep the
resolution iff it is not flagged as an external library import and the resolved file is a distinct
[project module](#project-module); the edge set is the deduplicated, sorted set of
(from, to) pairs.

**Predicate implementation:**

```ts
import ts from "typescript"

export function importEdges(program: ts.Program): ReadonlyArray<readonly [string, string]> {
  const universe = new Set(program.getRootFileNames().map((f) => ts.sys.resolvePath(f)))
  const options = program.getCompilerOptions()
  const edges = new Set<string>()
  for (const from of [...universe].sort()) {
    const sf = program.getSourceFile(from)
    if (sf === undefined) continue
    const specifiers: Array<string> = []
    const visit = (node: ts.Node): void => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
        node.moduleSpecifier !== undefined &&
        ts.isStringLiteralLike(node.moduleSpecifier)
      ) {
        specifiers.push(node.moduleSpecifier.text) // import declaration / re-export declaration
      } else if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments.length > 0 &&
        ts.isStringLiteralLike(node.arguments[0]!)
      ) {
        specifiers.push((node.arguments[0] as ts.StringLiteralLike).text) // dynamic import("s")
      } else if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference) &&
        ts.isStringLiteralLike(node.moduleReference.expression)
      ) {
        specifiers.push(node.moduleReference.expression.text) // import x = require("s")
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
    for (const spec of specifiers) {
      const resolved = ts.resolveModuleName(spec, from, options, ts.sys).resolvedModule
      if (resolved === undefined) continue // exclusion: unresolved specifier
      if (resolved.isExternalLibraryImport === true) continue // exclusion: external package
      const to = ts.sys.resolvePath(resolved.resolvedFileName)
      if (!universe.has(to) || to === from) continue // exclusion: non-project target or self
      edges.add(`${from}\u0000${to}`)
    }
  }
  return [...edges].sort().map((e) => {
    const sep = e.indexOf("\u0000")
    return [e.slice(0, sep), e.slice(sep + 1)] as const
  })
}
```

### Module dependency graph

The directed simple graph whose vertices are the [project modules](#project-module) and whose
arcs are the [import edges](#import-edge). "Importer of `m`" means a vertex with an arc into `m`;
"import of `m`" means a vertex `m` has an arc into.

**Mechanical predicate:** input: the module list and [import edge](#import-edge) set. Output
(valuation): the adjacency structure with vertices and arcs in lexicographic order.

**Predicate implementation:**

```ts
export type DependencyGraph = {
  readonly vertices: ReadonlyArray<string>
  readonly arcs: ReadonlyArray<readonly [string, string]>
  readonly importsOf: ReadonlyMap<string, ReadonlyArray<string>>
  readonly importersOf: ReadonlyMap<string, ReadonlyArray<string>>
}

export function dependencyGraph(
  modules: ReadonlyArray<string>,
  edges: ReadonlyArray<readonly [string, string]>
): DependencyGraph {
  const importsOf = new Map<string, Array<string>>(modules.map((m) => [m, []]))
  const importersOf = new Map<string, Array<string>>(modules.map((m) => [m, []]))
  for (const [from, to] of edges) {
    importsOf.get(from)?.push(to)
    importersOf.get(to)?.push(from)
  }
  for (const list of importsOf.values()) list.sort()
  for (const list of importersOf.values()) list.sort()
  return { vertices: [...modules].sort(), arcs: [...edges].sort(), importsOf, importersOf }
}
```

```jsonc
// Module dependency graph for three modules:
{
  "vertices": ["/repo/src/app.ts", "/repo/src/user/user.ts", "/repo/src/user/userRepo.ts"],
  // arcs: import edges, sorted
  "arcs": [
    ["/repo/src/app.ts", "/repo/src/user/userRepo.ts"],
    ["/repo/src/user/userRepo.ts", "/repo/src/user/user.ts"]
  ],
  // "importer of user.ts" = userRepo.ts; "import of app.ts" = userRepo.ts
  "importersOf": { "/repo/src/user/user.ts": ["/repo/src/user/userRepo.ts"] }
}
```

### Exported declaration

A symbol in a [project module](#project-module)'s export table as computed by the type checker
(`getExportsOfModule` on the module symbol). Each carries a name (the exported name, which for a
default export is `default`) and a type-only flag: an exported declaration is **type-only** when
the symbol it resolves to (through aliases) has no value meaning — interfaces, type aliases, and
type-only re-exports are type-only; classes, enums, functions, and variables are not.
Re-exported symbols are exported declarations of the re-exporting module as well as of the origin
module.

**Mechanical predicate:** input: a `ts.Program` and a module. Obtain the module symbol at the
source file node; list `getExportsOfModule`; for each symbol, resolve aliases and test
`SymbolFlags.Value`; output the sorted list of (name, typeOnly) pairs. Modules that are not
external modules (no import/export syntax) have an empty export table.

**Predicate implementation:**

```ts
import ts from "typescript"

export type ExportedDeclaration = { readonly name: string; readonly typeOnly: boolean }

export function exportedDeclarations(
  program: ts.Program,
  file: ts.SourceFile
): ReadonlyArray<ExportedDeclaration> {
  const checker = program.getTypeChecker()
  const moduleSymbol = checker.getSymbolAtLocation(file)
  if (moduleSymbol === undefined) return [] // not an external module: empty export table
  return checker
    .getExportsOfModule(moduleSymbol)
    .map((sym) => {
      const resolved = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym
      return {
        name: sym.getName(),
        typeOnly: (resolved.flags & ts.SymbolFlags.Value) === 0 // no value meaning ⇒ type-only
      }
    })
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}
```

```ts
// file: src/user/user.ts — one example per enumerated case
import { Schema } from "effect"
export const UserSchema = Schema.Struct({ id: Schema.String }) // exported declaration, NOT type-only (variable)
export interface UserProps {
  readonly id: string
} // exported declaration, type-only (interface)
export type UserId = string // exported declaration, type-only (type alias)
export default function makeUser(id: UserId): UserProps {
  // exported declaration named "default", NOT type-only (function)
  return { id }
}
```

```ts
// file: src/user/index.ts — a re-exported symbol is an exported declaration
// of BOTH this module and src/user/user.ts.
export { UserSchema } from "./user.js"
```

### Module role

A classification of a [project module](#project-module) into exactly one of nine categories,
inferred exclusively from the module's source AST, its checker-resolved symbols and types, and
the [module dependency graph](#module-dependency-graph) — never from its path, directory,
basename, extension, or any user-maintained mapping. The role is the first matching entry of
this ordered decision list:

1. **test** — the module's AST contains one of the four [import edge](#import-edge) syntactic
   forms whose literal specifier is a member of the fixed set
   `{"bun:test", "node:test", "vitest", "@jest/globals", "jest", "mocha"}`. (The set is a
   universal constant of this protocol, not a per-project mapping; the specifier is content of
   the classified module's AST.)
2. **barrel** — the module has at least one top-level statement, and every top-level statement
   is a re-export declaration (`export … from` / `export * from`).
3. **entrypoint** — the module has zero importers in the
   [module dependency graph](#module-dependency-graph) and at least one executable top-level
   statement: a statement that is none of import declaration, import-equals declaration, export
   declaration, export assignment, function/class/interface/enum/module declaration, type alias,
   or variable statement.
4. **service** — at least one non-type-only [exported declaration](#exported-declaration) has a
   resolved type carrying the Effect service-key brand: a property named
   `"~effect/Context/Service"` (present on `Context.Key`, `Context.Service`, and class-style
   `Context.Service` keys).
5. **layer** — at least one non-type-only [exported declaration](#exported-declaration) has a
   resolved type carrying the Effect layer brand: a property named `"~effect/Layer"`.
6. **error** — the module has at least one non-type-only
   [exported declaration](#exported-declaration), and every one is a class whose declared
   instance type has a `_tag` property of string-literal type together with `message` and
   `stack` properties (the observable shape of `Schema.TaggedErrorClass` and other tagged error
   classes).
7. **schema** — at least half of the non-type-only
   [exported declarations](#exported-declaration) (and at least one) have a resolved type
   carrying the Effect schema brand: a property named `"~effect/Schema/Schema"`.
8. **types** — the module has at least one [exported declaration](#exported-declaration) and
   every one is type-only.
9. **logic** — none of the above.

Ordering rationale: `error` precedes `schema` because a `Schema.TaggedErrorClass` constructor is
itself a schema; `service` precedes `layer` so a module exporting both a key and its layer
classifies as the interface it defines; `test` precedes `entrypoint` because test files also
have zero importers and executable top-level calls.

#### Related terms

| Term                    | Relation   | Deciding distinction                                                    | Why it is not interchangeable here                                                                       |
| ----------------------- | ---------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Architectural layer     | Orthogonal | A position in an intended dependency ordering, declared by convention   | Not observable from one module's content; role is decided by content alone                                  |
| Module format (ESM/CJS) | Orthogonal | How the file is loaded at runtime                                       | Two modules of identical format can have any two roles                                                      |
| File-extension kind     | Prohibited | `.test.ts` / `.tsx` naming conventions                                  | Role MUST NOT read paths or basenames; a physical rule may, but it never feeds this classification          |
| [Exported declaration](#exported-declaration) | Input | One symbol, not a whole-module category           | Role aggregates over all exported declarations plus statements and the dependency graph                     |

```ts
// Comparison example — role (content-derived) vs file-extension kind (physical):
// file: src/user/user.spec.ts — despite the ".spec.ts" basename, this module's role
// is "logic": it imports no test-runner specifier, so the decision list never
// reaches a test classification. The basename is invisible to the role predicate.
export const double = (n: number): number => n * 2
```

One example per enumerated category:

```ts
// role: test — imports the fixed-set specifier "bun:test"
import { expect, test } from "bun:test"
import { double } from "../src/user/user.js"
test("double", () => {
  expect(double(2)).toBe(4)
})
```

```ts
// role: barrel — every top-level statement is a re-export declaration
export * from "./user.js"
export { UserRepo } from "./userRepo.js"
```

```ts
// role: entrypoint — zero importers (assumed) and an executable top-level statement
import { Effect } from "effect"
const main = Effect.log("started")
Effect.runPromise(main) // executable top-level statement: an expression statement
```

```ts
// role: service — exports a value whose type carries the "~effect/Context/Service" brand
import { Context } from "effect"
export class Clock extends Context.Service<Clock, { readonly now: () => number }>()("Clock") {}
```

```ts
// role: layer — exports a value whose type carries the "~effect/Layer" brand
import { Context, Layer } from "effect"
export class Clock extends Context.Service<Clock, { readonly now: () => number }>()("Clock") {}
export const ClockLive = Layer.succeed(Clock, { now: () => Date.now() })
// (This module also matches "service" — rule 4 — which precedes "layer";
// a module exporting ONLY ClockLive would classify as "layer".)
```

```ts
// role: error — every value export is a class with a string-literal `_tag`,
// `message`, and `stack` (the Schema.TaggedErrorClass shape)
import { Schema } from "effect"
export class UserNotFound extends Schema.TaggedErrorClass<UserNotFound>()("UserNotFound", {
  id: Schema.String
}) {}
```

```ts
// role: schema — at least half of the value exports carry "~effect/Schema/Schema"
import { Schema } from "effect"
export const User = Schema.Struct({ id: Schema.String, name: Schema.String })
export const UserList = Schema.Array(User)
```

```ts
// role: types — every exported declaration is type-only
export interface Money {
  readonly cents: number
}
export type Currency = "usd" | "eur"
```

```ts
// role: logic — default: none of the eight preceding rules match
export const totalCents = (items: ReadonlyArray<{ readonly cents: number }>): number =>
  items.reduce((sum, item) => sum + item.cents, 0)
```

**Mechanical predicate:** input: a `ts.Program`, a module's source file, and the module's
importer count from the [module dependency graph](#module-dependency-graph). Apply the decision
list in order using AST statement kinds, literal import specifiers, and
`checker.getPropertyOfType` brand probes on the resolved types of
[exported declarations](#exported-declaration); return the first matching category name.

**Predicate implementation:**

```ts
import ts from "typescript"

export type ModuleRole =
  | "test"
  | "barrel"
  | "entrypoint"
  | "service"
  | "layer"
  | "error"
  | "schema"
  | "types"
  | "logic"

const TEST_SPECIFIERS: ReadonlySet<string> = new Set([
  "bun:test",
  "node:test",
  "vitest",
  "@jest/globals",
  "jest",
  "mocha"
])

const SERVICE_BRAND = "~effect/Context/Service"
const LAYER_BRAND = "~effect/Layer"
const SCHEMA_BRAND = "~effect/Schema/Schema"

const DECLARATION_KINDS: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.ImportDeclaration,
  ts.SyntaxKind.ImportEqualsDeclaration,
  ts.SyntaxKind.ExportDeclaration,
  ts.SyntaxKind.ExportAssignment,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.ModuleDeclaration,
  ts.SyntaxKind.VariableStatement
])

function literalSpecifiers(sf: ts.SourceFile): ReadonlyArray<string> {
  const out: Array<string> = []
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      out.push(node.moduleSpecifier.text)
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0]!)
    ) {
      out.push((node.arguments[0] as ts.StringLiteralLike).text)
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      ts.isStringLiteralLike(node.moduleReference.expression)
    ) {
      out.push(node.moduleReference.expression.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return out
}

function hasBrand(checker: ts.TypeChecker, type: ts.Type, brand: string): boolean {
  return checker.getPropertyOfType(type, brand) !== undefined
}

function isTaggedErrorClass(checker: ts.TypeChecker, sym: ts.Symbol): boolean {
  const resolved = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym
  if ((resolved.flags & ts.SymbolFlags.Class) === 0) return false
  const instance = checker.getDeclaredTypeOfSymbol(resolved)
  const tag = checker.getPropertyOfType(instance, "_tag")
  if (tag === undefined) return false
  const tagType = checker.getTypeOfSymbol(tag)
  return (
    (tagType.flags & ts.TypeFlags.StringLiteral) !== 0 &&
    checker.getPropertyOfType(instance, "message") !== undefined &&
    checker.getPropertyOfType(instance, "stack") !== undefined
  )
}

export function moduleRole(
  program: ts.Program,
  file: ts.SourceFile,
  importerCount: number
): ModuleRole {
  const checker = program.getTypeChecker()
  // rule 1: test
  if (literalSpecifiers(file).some((s) => TEST_SPECIFIERS.has(s))) return "test"
  // rule 2: barrel
  const statements = file.statements
  if (
    statements.length > 0 &&
    statements.every((s) => ts.isExportDeclaration(s) && s.moduleSpecifier !== undefined)
  ) {
    return "barrel"
  }
  // rule 3: entrypoint
  if (importerCount === 0 && statements.some((s) => !DECLARATION_KINDS.has(s.kind))) {
    return "entrypoint"
  }
  const moduleSymbol = checker.getSymbolAtLocation(file)
  const exports = moduleSymbol === undefined ? [] : checker.getExportsOfModule(moduleSymbol)
  const valueExports = exports.filter((sym) => {
    const resolved = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym
    return (resolved.flags & ts.SymbolFlags.Value) !== 0
  })
  const valueTypes = valueExports.map((sym) => checker.getTypeOfSymbol(sym))
  // rule 4: service
  if (valueTypes.some((t) => hasBrand(checker, t, SERVICE_BRAND))) return "service"
  // rule 5: layer
  if (valueTypes.some((t) => hasBrand(checker, t, LAYER_BRAND))) return "layer"
  // rule 6: error
  if (valueExports.length > 0 && valueExports.every((sym) => isTaggedErrorClass(checker, sym))) {
    return "error"
  }
  // rule 7: schema
  const schemaCount = valueTypes.filter((t) => hasBrand(checker, t, SCHEMA_BRAND)).length
  if (schemaCount >= 1 && schemaCount * 2 >= valueTypes.length) return "schema"
  // rule 8: types
  if (exports.length > 0 && valueExports.length === 0) return "types"
  // rule 9: logic
  return "logic"
}
```

### Tree distance

For two [project modules](#project-module) `a` and `b`: the number of edges on the unique path in
the [directory tree](#directory-tree) between the [module directory](#module-directory) of `a`
and the [module directory](#module-directory) of `b`. Equivalently
`depth(dir(a)) + depth(dir(b)) − 2·depth(lca)` where `lca` is the deepest common ancestor of the
two directories and depths are [directory depths](#directory-depth). Two modules in the same
directory have tree distance 0.

#### Related terms

| Term                           | Relation      | Deciding distinction                                       | Why it is not interchangeable here                                                          |
| ------------------------------ | ------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Relative-import segment count  | Near-equal    | Counts `..` plus descent segments in a written specifier    | Depends on how the author wrote the specifier (aliases, extensions); tree distance does not    |
| Dependency-graph distance      | Different graph | Hops along [import edges](#import-edge)                   | Measures reachability through code, not physical placement; both are needed, separately        |
| Path string edit distance      | Different unit | Character operations on path strings                       | Sensitive to segment name lengths, which carry no placement information                        |

```ts
// Comparison example set:
declare function treeDistance(a: string, b: string, root: string): number
// tree distance (the defined term): counts directory-tree edges between parents
const same = treeDistance("/r/src/u/a.ts", "/r/src/u/b.ts", "/r/src") // 0 — same module directory
const sibling = treeDistance("/r/src/u/a.ts", "/r/src/v/b.ts", "/r/src") // 2 — up 1 to /r/src, down 1
const skew = treeDistance("/r/src/u/deep/a.ts", "/r/src/v/b.ts", "/r/src") // 3 — up 2, down 1
// relative-import segment count (related term): "../v/b.js" from /r/src/u has 2 segments
// before the filename, but "@v/b" via a paths alias has none — author-dependent, unlike
// tree distance, which is 2 in both spellings.
// dependency-graph distance (related term): if a.ts does not import b.ts at all, their
// dependency-graph distance is infinite while their tree distance is still 2.
```

**Mechanical predicate:** input: two module paths and the [source root](#source-root). Output
(valuation, unit: non-negative integer edge count): split both
[module directories](#module-directory) into segments relative to the root, drop the shared
prefix, and return the sum of the remaining segment counts.

**Predicate implementation:**

```ts
declare function moduleDirectory(module: string): string

function relativeSegments(dir: string, root: string): ReadonlyArray<string> {
  return dir === root ? [] : dir.slice(root.length + 1).split("/")
}

export function treeDistance(a: string, b: string, root: string): number {
  const sa = relativeSegments(moduleDirectory(a), root)
  const sb = relativeSegments(moduleDirectory(b), root)
  let shared = 0
  while (shared < sa.length && shared < sb.length && sa[shared] === sb[shared]) shared += 1
  return sa.length - shared + (sb.length - shared)
}
```

### Normalized tree distance

The [tree distance](#tree-distance) `d` of an [import edge](#import-edge) mapped into [0, 1) by
`d / (d + 2)`. The offset 2 anchors the scale at the smallest cross-directory separation: modules
in sibling directories ([tree distance](#tree-distance) 2) score `0.5`; same-directory edges
score `0`; the value approaches 1 as distance grows. The normalization is per-edge and uses no
global quantity, so one edge's normalized value never changes because an unrelated part of the
tree changed.

**Mechanical predicate:** input: an [import edge](#import-edge) and the
[source root](#source-root). Output (valuation, unit: dimensionless ratio in [0, 1)):
`treeDistance(from, to, root) / (treeDistance(from, to, root) + 2)`.

**Predicate implementation:**

```ts
declare function treeDistance(a: string, b: string, root: string): number

export function normalizedTreeDistance(from: string, to: string, root: string): number {
  const d = treeDistance(from, to, root)
  return d / (d + 2)
}
```

```ts
declare function normalizedTreeDistance(from: string, to: string, root: string): number
const n0 = normalizedTreeDistance("/r/src/u/a.ts", "/r/src/u/b.ts", "/r/src") // 0    (d = 0, same directory)
const n2 = normalizedTreeDistance("/r/src/u/a.ts", "/r/src/v/b.ts", "/r/src") // 0.5  (d = 2, siblings)
const n6 = normalizedTreeDistance("/r/src/u/x/y/a.ts", "/r/src/v/w/z/b.ts", "/r/src") // 0.75 (d = 6)
```

### Graph universe

The subset of [project modules](#project-module) whose [module role](#module-role) is not
`test`, together with the [import edges](#import-edge) whose endpoints both lie in that subset.
All placement, clustering, encapsulation, and cycle measurements below run on the graph
universe; test modules are measured separately by
[test placement correspondence](#test-placement-correspondence) so that test wiring cannot
dominate the production layout signal.

**Mechanical predicate:** input: the module list, [import edge](#import-edge) set, and each
module's [module role](#module-role). Membership: a module is in the graph universe iff
`moduleRole(m) !== "test"`; an edge is in it iff both endpoints are.

**Predicate implementation:**

```ts
export type ModuleRole =
  | "test"
  | "barrel"
  | "entrypoint"
  | "service"
  | "layer"
  | "error"
  | "schema"
  | "types"
  | "logic"

export function graphUniverse(
  modules: ReadonlyArray<string>,
  edges: ReadonlyArray<readonly [string, string]>,
  roleOf: ReadonlyMap<string, ModuleRole>
): {
  readonly modules: ReadonlyArray<string>
  readonly edges: ReadonlyArray<readonly [string, string]>
} {
  const keep = new Set(modules.filter((m) => roleOf.get(m) !== "test"))
  return {
    modules: [...keep].sort(),
    edges: edges.filter(([from, to]) => keep.has(from) && keep.has(to))
  }
}
```

```jsonc
// Graph universe example: one test module removed together with its edges.
{
  "roles": { "/r/src/a.ts": "logic", "/r/src/b.ts": "logic", "/r/tests/a.test.ts": "test" },
  "allEdges": [
    ["/r/src/a.ts", "/r/src/b.ts"],
    ["/r/tests/a.test.ts", "/r/src/a.ts"]
  ],
  // membership: roles other than "test"; edges with both endpoints kept
  "universe": {
    "modules": ["/r/src/a.ts", "/r/src/b.ts"],
    "edges": [["/r/src/a.ts", "/r/src/b.ts"]]
  }
}
```

### Dependency locality

Component **L**: one minus the arithmetic mean of the
[normalized tree distance](#normalized-tree-distance) over all [import edges](#import-edge) of
the [graph universe](#graph-universe). A project whose every edge stays inside one directory
scores 1; a project whose edges all span great depths approaches 0. With zero edges, L = 1
(vacuously local). Unit: dimensionless ratio in (0, 1]; larger is better.

#### Related terms

| Term                | Relation       | Deciding distinction                                                     | Why it is not interchangeable here                                                                |
| ------------------- | -------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Coupling (edge count) | Different unit | Counts how many dependencies exist                                       | L measures where dependencies land physically, not how many there are; deleting edges is not a layout fix |
| Modularity Q        | Different formula | Compares intra-group edge share to a degree-preserving random expectation | Q rates the graph's community quality; L rates the tree placement of each edge independently          |
| Cohesion            | Different scope | Internal relatedness of one unit                                          | A directory can be cohesive while its members' outbound edges are all distant; L sees the outbound edges |

```ts
// Comparison example set:
// coupling (edge count): 2 in both layouts below — insensitive to placement.
// dependency locality: distinguishes the layouts.
declare function normalizedTreeDistance(from: string, to: string, root: string): number
const root = "/r/src"
// Layout 1 — both edges inside one directory: L = 1 − (0 + 0)/2 = 1
const layout1 = [
  normalizedTreeDistance("/r/src/user/a.ts", "/r/src/user/b.ts", root), // 0
  normalizedTreeDistance("/r/src/user/b.ts", "/r/src/user/c.ts", root) // 0
]
// Layout 2 — same modules scattered: L = 1 − (0.5 + 0.5)/2 = 0.5
const layout2 = [
  normalizedTreeDistance("/r/src/user/a.ts", "/r/src/util/b.ts", root), // 0.5
  normalizedTreeDistance("/r/src/util/b.ts", "/r/src/misc/c.ts", root) // 0.5
]
```

**Mechanical predicate:** input: the [graph universe](#graph-universe) and the
[source root](#source-root). Output (valuation, unit: ratio): iterate edges in lexicographic
order, sum [normalized tree distances](#normalized-tree-distance), divide by the edge count,
subtract from 1; return 1 when the edge set is empty.

**Predicate implementation:**

```ts
declare function normalizedTreeDistance(from: string, to: string, root: string): number

export function dependencyLocality(
  edges: ReadonlyArray<readonly [string, string]>,
  root: string
): number {
  if (edges.length === 0) return 1
  const sorted = [...edges].sort()
  let sum = 0
  for (const [from, to] of sorted) sum += normalizedTreeDistance(from, to, root)
  return 1 - sum / sorted.length
}
```

### Neighborhood

For a module `m` of the [graph universe](#graph-universe): the set containing `m` itself, every
import of `m`, and every importer of `m` in the
[module dependency graph](#module-dependency-graph) restricted to the
[graph universe](#graph-universe).

**Mechanical predicate:** input: a module and the [graph universe](#graph-universe) edge set.
Output (valuation): `{m} ∪ {to : (m, to) ∈ E} ∪ {from : (from, m) ∈ E}`.

**Predicate implementation:**

```ts
export function neighborhood(
  m: string,
  edges: ReadonlyArray<readonly [string, string]>
): ReadonlySet<string> {
  const out = new Set<string>([m]) // m itself
  for (const [from, to] of edges) {
    if (from === m) out.add(to) // an import of m
    if (to === m) out.add(from) // an importer of m
  }
  return out
}
```

```jsonc
// Neighborhood of b.ts under edges a→b, b→c:
{
  "edges": [
    ["/r/src/a.ts", "/r/src/b.ts"],
    ["/r/src/b.ts", "/r/src/c.ts"]
  ],
  // "m itself" = b.ts; "importer of m" = a.ts; "import of m" = c.ts
  "neighborhoodOfB": ["/r/src/a.ts", "/r/src/b.ts", "/r/src/c.ts"]
}
```

### Coupling similarity

For two modules `a`, `b` of the [graph universe](#graph-universe): the Jaccard index of their
[neighborhoods](#neighborhood), `|N(a) ∩ N(b)| / |N(a) ∪ N(b)|`. Two modules that import each
other and nothing else score 1; modules sharing no dependency context score 0. Because each
[neighborhood](#neighborhood) contains its own module, a direct [import edge](#import-edge)
alone already yields a positive similarity.

#### Related terms

| Term                   | Relation        | Deciding distinction                                          | Why it is not interchangeable here                                                                     |
| ---------------------- | --------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Direct dependency      | Contributing case | A single [import edge](#import-edge) `a → b`                  | Similarity also captures modules that never import each other but share importers/imports                  |
| Structural equivalence | Stricter        | Identical neighbor sets                                        | All-or-nothing; the clustering needs a graded value with a threshold                                        |
| Co-change coupling     | Different input | Files modified in the same version-control commits             | Requires history, not the compiled source; excluded from this metric's inputs (see Metric § exclusions)     |

```jsonc
// Comparison example set (numeric; derived from edges a→c, b→c):
{
  "edges": [
    ["/r/a.ts", "/r/c.ts"],
    ["/r/b.ts", "/r/c.ts"]
  ],
  "neighborhoods": { "a": ["a", "c"], "b": ["b", "c"], "c": ["a", "b", "c"] },
  // coupling similarity (defined term): a and b never import each other,
  // yet sim(a,b) = |{c}| / |{a,b,c}| = 1/3 — shared context is visible.
  "simAB": 0.3333333333333333,
  // direct dependency (related term): absent between a and b (no edge a→b),
  // so a direct-dependency test alone would call them unrelated.
  "directAB": false,
  // structural equivalence (related term): N(a) ≠ N(b), so equivalence is false
  // even though similarity is positive.
  "structurallyEquivalent": false
}
```

**Mechanical predicate:** input: two modules and the [graph universe](#graph-universe) edge set.
Output (valuation, unit: ratio in [0, 1]): Jaccard of the two [neighborhoods](#neighborhood).

**Predicate implementation:**

```ts
declare function neighborhood(
  m: string,
  edges: ReadonlyArray<readonly [string, string]>
): ReadonlySet<string>

export function couplingSimilarity(
  a: string,
  b: string,
  edges: ReadonlyArray<readonly [string, string]>
): number {
  const na = neighborhood(a, edges)
  const nb = neighborhood(b, edges)
  let intersection = 0
  for (const x of na) if (nb.has(x)) intersection += 1
  const union = na.size + nb.size - intersection
  return union === 0 ? 0 : intersection / union
}
```

### Semantic partition

The partition of the [graph universe](#graph-universe) into the connected components of the
undirected similarity graph that joins `a` and `b` iff
[coupling similarity](#coupling-similarity)(a, b) ≥ τ with the fixed threshold **τ = 1/3**.
Components are canonically ordered by their lexicographically smallest member, and each
component is labeled by that member. This is the dependency-derived clustering that the physical
layout is scored against.

#### Related terms

| Term                                              | Relation      | Deciding distinction                                       | Why it is not interchangeable here                                                                 |
| ------------------------------------------------- | ------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [Physical partition at depth d](#physical-partition-at-depth-d) | Compared against | Derived from paths, not from edges                | The metric's whole point is to compare the two; conflating them makes agreement trivially 1              |
| Strongly connected component                      | Different graph | Directed mutual reachability over [import edges](#import-edge) | SCCs find cycles; the semantic partition groups by shared context, including acyclic clusters       |
| Package boundary                                  | Coarser       | A workspace `package.json` unit                             | One package usually contains many semantic clusters; the partition must see structure inside a package   |

```jsonc
// Comparison example set. Edges: a→b, b→a (a cycle), a→c; d→e.
{
  "similarities": {
    // sim(a,b): N(a)={a,b,c}, N(b)={a,b} → 2/3 ≥ 1/3 → joined (edge ≥ τ demonstrated)
    "a,b": 0.667,
    // sim(c,d): disjoint neighborhoods → 0 < 1/3 → not joined (non-edge < τ demonstrated)
    "c,d": 0
  },
  // semantic partition (defined term): components of the ≥ τ graph,
  // ordered and labeled by smallest member
  "semanticPartition": [
    ["/r/a.ts", "/r/b.ts", "/r/c.ts"],
    ["/r/d.ts", "/r/e.ts"]
  ],
  // strongly connected component (related term): only {a, b} — it needs directed
  // mutual reachability, so it misses c, which the semantic partition includes.
  "scc": [["/r/a.ts", "/r/b.ts"]],
  // physical partition (related term): whatever the directories say — possibly
  // ["/r/a.ts", "/r/d.ts"] together — path-derived, not edge-derived.
  "physicalGroupExample": [["/r/a.ts", "/r/d.ts"]]
}
```

**Mechanical predicate:** input: the [graph universe](#graph-universe). Build the similarity
graph with threshold τ = 1/3; run union-find over module pairs in lexicographic order; output
components sorted by smallest member.

**Predicate implementation:**

```ts
declare function couplingSimilarity(
  a: string,
  b: string,
  edges: ReadonlyArray<readonly [string, string]>
): number

const TAU = 1 / 3

export function semanticPartition(
  modules: ReadonlyArray<string>,
  edges: ReadonlyArray<readonly [string, string]>
): ReadonlyArray<ReadonlyArray<string>> {
  const sorted = [...modules].sort()
  const parent = new Map<string, string>(sorted.map((m) => [m, m]))
  const find = (m: string): string => {
    let cur = m
    while (parent.get(cur) !== cur) cur = parent.get(cur)!
    return cur
  }
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (couplingSimilarity(sorted[i]!, sorted[j]!, edges) >= TAU) {
        const ri = find(sorted[i]!)
        const rj = find(sorted[j]!)
        if (ri !== rj) parent.set(ri < rj ? rj : ri, ri < rj ? ri : rj)
      }
    }
  }
  const groups = new Map<string, Array<string>>()
  for (const m of sorted) {
    const root = find(m)
    const group = groups.get(root) ?? []
    group.push(m)
    groups.set(root, group)
  }
  return [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, g]) => g)
}
```

### Physical partition at depth d

For a positive integer `d`: the partition of the [graph universe](#graph-universe) that groups
modules by their depth-`d` prefix — the [directory tree](#directory-tree) node obtained by
truncating each [module directory](#module-directory)'s path below the
[source root](#source-root) to at most `d` segments. Modules attached at
[directory depth](#directory-depth) less than `d` keep their own
[module directory](#module-directory) as the group label. Depth 1 groups by top-level directory;
the maximum meaningful `d` is the greatest [directory depth](#directory-depth) among modules.

**Mechanical predicate:** input: a module path, the [source root](#source-root), and `d`. Output
(valuation, unit: path string used as a group label): join the first `min(d, depth)` relative
segments of the [module directory](#module-directory) under the root.

**Predicate implementation:**

```ts
declare function moduleDirectory(module: string): string

export function physicalGroupAtDepth(module: string, root: string, d: number): string {
  const dir = moduleDirectory(module)
  if (dir === root) return root
  const segments = dir.slice(root.length + 1).split("/")
  return `${root}/${segments.slice(0, Math.min(d, segments.length)).join("/")}`
}
```

```jsonc
// Physical partition at depths 1 and 2 for three modules under /r/src:
{
  "modules": ["/r/src/user/model/user.ts", "/r/src/user/repo.ts", "/r/src/billing/invoice.ts"],
  // d = 1: group by top-level directory
  "depth1": {
    "/r/src/user/model/user.ts": "/r/src/user",
    "/r/src/user/repo.ts": "/r/src/user",
    "/r/src/billing/invoice.ts": "/r/src/billing"
  },
  // d = 2: user/model splits off; repo.ts sits at depth 1 < d and keeps its own directory
  "depth2": {
    "/r/src/user/model/user.ts": "/r/src/user/model",
    "/r/src/user/repo.ts": "/r/src/user",
    "/r/src/billing/invoice.ts": "/r/src/billing"
  }
}
```

### Partition agreement

Component **A**: the maximum over depths `d ∈ {1, …, maxDepth}` of the adjusted Rand index (ARI)
between the [semantic partition](#semantic-partition) and the
[physical partition at depth d](#physical-partition-at-depth-d), clamped below at 0. Taking the
maximum rewards agreement at whichever level of the [directory tree](#directory-tree) the
clustering is actually expressed. ARI is computed from the contingency table `n_ij` (modules in
physical group `i` and semantic component `j`):
`ARI = (Σ_ij C(n_ij,2) − e) / (½(Σ_i C(a_i,2) + Σ_j C(b_j,2)) − e)` with
`e = Σ_i C(a_i,2) · Σ_j C(b_j,2) / C(n,2)`, where `a_i`, `b_j` are group sizes and `C(x,2)` is
the binomial coefficient. Degenerate cases: fewer than 2 modules → A = 1; denominator 0 → 1 when
the partitions are identical, else 0; maxDepth 0 (every module at the root) → A is evaluated at
d = 1 where the partition is the single trivial group. Unit: ratio in [0, 1]; larger is better.

#### Related terms

| Term                          | Relation    | Deciding distinction                                              | Why it is not interchangeable here                                                                     |
| ----------------------------- | ----------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Rand index                    | Uncorrected | No adjustment for chance agreement                                 | Scores ≈ 0.5+ for random labelings with many groups; ARI is 0 in expectation for random placement            |
| Normalized mutual information | Alternative | Information-theoretic, biased toward many small clusters           | Reserved for [role predictability](#role-predictability), where variables are categorical labels, not partitions of unequal granularity |
| Purity                        | One-sided   | Fraction of each physical group's majority component               | Trivially 1 when every module gets its own directory; ARI penalizes that shredding                           |

```jsonc
// Comparison example set: 6 modules, semantic components {a,b,c} and {d,e,f}.
{
  // physical partition at depth 1 groups them as {a,b,c} and {d,e,f}:
  // ARI (defined term) = 1 — perfect agreement.
  "perfect": { "physical": [["a", "b", "c"], ["d", "e", "f"]], "ari": 1 },
  // one directory per module: purity (related term) = 1 (every singleton is "pure"),
  // Rand index (related term) = 0.6 (agreeing non-pairs inflate it),
  // ARI = 0 — chance-corrected, exposes the shredded layout.
  "shredded": {
    "physical": [["a"], ["b"], ["c"], ["d"], ["e"], ["f"]],
    "purity": 1,
    "rand": 0.6,
    "ari": 0
  }
}
```

**Mechanical predicate:** input: the [graph universe](#graph-universe),
[semantic partition](#semantic-partition), and [source root](#source-root). For each depth `d`
from 1 to the maximum module [directory depth](#directory-depth) (at least 1), label every
module with its [physical partition at depth d](#physical-partition-at-depth-d) group and its
[semantic partition](#semantic-partition) component; compute ARI from the contingency table;
return the maximum over `d`, clamped to [0, 1].

**Predicate implementation:**

```ts
declare function physicalGroupAtDepth(module: string, root: string, d: number): string
declare function moduleDirectory(module: string): string
declare function directoryDepth(dir: string, root: string): number

export function adjustedRandIndex(
  labelsA: ReadonlyMap<string, string>,
  labelsB: ReadonlyMap<string, string>
): number {
  const items = [...labelsA.keys()].filter((k) => labelsB.has(k)).sort()
  const n = items.length
  if (n < 2) return 1
  const choose2 = (x: number): number => (x * (x - 1)) / 2
  const rows = new Map<string, Map<string, number>>()
  const aCount = new Map<string, number>()
  const bCount = new Map<string, number>()
  for (const it of items) {
    const a = labelsA.get(it)!
    const b = labelsB.get(it)!
    aCount.set(a, (aCount.get(a) ?? 0) + 1)
    bCount.set(b, (bCount.get(b) ?? 0) + 1)
    const row = rows.get(a) ?? new Map<string, number>()
    row.set(b, (row.get(b) ?? 0) + 1)
    rows.set(a, row)
  }
  let sumIJ = 0
  for (const row of rows.values()) for (const nij of row.values()) sumIJ += choose2(nij)
  let sumA = 0
  for (const c of aCount.values()) sumA += choose2(c)
  let sumB = 0
  for (const c of bCount.values()) sumB += choose2(c)
  const expected = (sumA * sumB) / choose2(n)
  const max = (sumA + sumB) / 2
  if (max === expected) {
    const identical = sumIJ === max
    return identical ? 1 : 0
  }
  return (sumIJ - expected) / (max - expected)
}

export function partitionAgreement(
  modules: ReadonlyArray<string>,
  components: ReadonlyArray<ReadonlyArray<string>>,
  root: string
): number {
  if (modules.length < 2) return 1
  const semanticLabel = new Map<string, string>()
  for (const component of components) {
    const label = component[0]!
    for (const m of component) semanticLabel.set(m, label)
  }
  const maxDepth = Math.max(
    1,
    ...modules.map((m) => directoryDepth(moduleDirectory(m), root))
  )
  let best = 0
  for (let d = 1; d <= maxDepth; d += 1) {
    const physicalLabel = new Map<string, string>(
      modules.map((m) => [m, physicalGroupAtDepth(m, root, d)])
    )
    best = Math.max(best, adjustedRandIndex(physicalLabel, semanticLabel))
  }
  return Math.min(1, best)
}
```

### Role predictability

Component **R**: how well a module's location or naming scheme predicts its
[module role](#module-role), measured as the larger of two normalized mutual information (NMI)
values over all [project modules](#project-module) (tests included):

- `NMI(role ; directory)` where the second variable is the module's
  [module directory](#module-directory) path, and
- `NMI(role ; suffix)` where the second variable is the last [name token](#name-token) of the
  module's filename stem (the basename without its final extension).

`NMI(X;Y) = I(X;Y) / max(H(X), H(Y))` with entropies in natural log over the empirical joint
distribution; the convention `0 · ln 0 = 0` applies; when `max(H(X), H(Y)) = 0` (a constant
variable on both sides), NMI is 1. Taking the maximum of the two variables accepts both
organizing conventions — role-per-directory (services live together) and role-per-suffix
(`*Service.ts` anywhere) — while penalizing projects with neither. Unit: ratio in [0, 1]; larger
is better.

#### Related terms

| Term                          | Relation      | Deciding distinction                                            | Why it is not interchangeable here                                                                        |
| ----------------------------- | ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [Name agreement](#name-agreement) | Confusable | Compares a file's stem tokens to its own export names            | R is a project-wide association between locations and role categories; N is a per-file lexical overlap         |
| [Partition agreement](#partition-agreement) | Different signal | Compares partitions of the dependency graph        | A can be perfect while every role is scattered unpredictably, and vice versa                                    |
| Convention compliance         | Prohibited form | Checking paths against a declared naming policy                 | Requires a user-maintained policy; R needs no declared convention — it detects whatever consistent scheme exists |

```jsonc
// Comparison example set. Four modules; roles derived from content.
{
  "modules": [
    { "path": "/r/src/user/userService.ts", "role": "service", "suffix": "service" },
    { "path": "/r/src/billing/billingService.ts", "role": "service", "suffix": "service" },
    { "path": "/r/src/user/user.ts", "role": "schema", "suffix": "user" },
    { "path": "/r/src/billing/invoice.ts", "role": "schema", "suffix": "invoice" }
  ],
  // role predictability (defined term): the suffix variable separates service
  // from schema wherever files live → NMI(role; suffix) high; directories mix
  // roles → NMI(role; directory) low; R = max(...) is high.
  // name agreement (related term) would instead check e.g. that
  // "userService.ts" exports something named like "user service" — a different,
  // per-file question that is high here too but for unrelated reasons.
  "nmiSuffix": 0.61,
  "nmiDirectory": 0.0,
  "R": 0.61
}
```

**Mechanical predicate:** input: every module's [module role](#module-role),
[module directory](#module-directory), and stem's last [name token](#name-token). Build both
joint category-count tables; compute the two NMI values iterating categories in lexicographic
order; return the maximum.

**Predicate implementation:**

```ts
export type ModuleRole =
  | "test"
  | "barrel"
  | "entrypoint"
  | "service"
  | "layer"
  | "error"
  | "schema"
  | "types"
  | "logic"

function nmi(pairs: ReadonlyArray<readonly [string, string]>): number {
  const n = pairs.length
  if (n === 0) return 1
  const cx = new Map<string, number>()
  const cy = new Map<string, number>()
  const cxy = new Map<string, number>()
  for (const [x, y] of pairs) {
    cx.set(x, (cx.get(x) ?? 0) + 1)
    cy.set(y, (cy.get(y) ?? 0) + 1)
    const key = `${x}\u0000${y}`
    cxy.set(key, (cxy.get(key) ?? 0) + 1)
  }
  const entropy = (counts: ReadonlyMap<string, number>): number => {
    let h = 0
    for (const key of [...counts.keys()].sort()) {
      const p = counts.get(key)! / n
      h -= p * Math.log(p)
    }
    return h
  }
  const hx = entropy(cx)
  const hy = entropy(cy)
  if (Math.max(hx, hy) === 0) return 1
  let mutual = 0
  for (const key of [...cxy.keys()].sort()) {
    const pxy = cxy.get(key)! / n
    const sep = key.indexOf("\u0000")
    const px = cx.get(key.slice(0, sep))! / n
    const py = cy.get(key.slice(sep + 1))! / n
    mutual += pxy * Math.log(pxy / (px * py))
  }
  return Math.max(0, Math.min(1, mutual / Math.max(hx, hy)))
}

declare function moduleDirectory(module: string): string
declare function nameTokens(text: string): ReadonlyArray<string>

export function rolePredictability(
  modules: ReadonlyArray<string>,
  roleOf: ReadonlyMap<string, ModuleRole>
): number {
  const sorted = [...modules].sort()
  const stem = (m: string): string => m.split("/").at(-1)!.replace(/\.[^.]+$/, "")
  const byDirectory = sorted.map(
    (m) => [roleOf.get(m)!, moduleDirectory(m)] as const
  )
  const bySuffix = sorted.map(
    (m) => [roleOf.get(m)!, nameTokens(stem(m)).at(-1) ?? ""] as const
  )
  return Math.max(nmi(byDirectory), nmi(bySuffix))
}
```

### Name agreement

Component **N**: how well filenames announce their contents. For a
[project module](#project-module) with at least one [exported declaration](#exported-declaration):

- its **effective name tokens** are the [name tokens](#name-token) of its filename stem, except
  that when the stem is exactly `index` (a physical-file rule, independent of any semantic
  classification) the [name tokens](#name-token) of the
  [module directory](#module-directory)'s basename are used instead;
- its **export tokens** are the union of the [name tokens](#name-token) of every
  [exported declaration](#exported-declaration)'s name, where a declaration named `default`
  contributes the [name tokens](#name-token) of the declared name of the default-exported
  declaration when it has one, and nothing otherwise;
- its agreement is `|effective ∩ exportTokens| / |effective|`, or 0 when `effective` is empty.

N is the arithmetic mean of agreement over all modules with at least one
[exported declaration](#exported-declaration); modules with none (e.g. entrypoints) are
excluded. With no qualifying modules, N = 1. Unit: ratio in [0, 1]; larger is better. The
direction of containment (name tokens must be evidenced by exports, not vice versa) means a
short honest name over many exports scores 1, while a name claiming absent content scores low.

#### Related terms

| Term                              | Relation   | Deciding distinction                                          | Why it is not interchangeable here                                                             |
| --------------------------------- | ---------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [Role predictability](#role-predictability) | Confusable | Project-wide association of location/suffix with role | N is per-file lexical evidence; a project can name every file after its exports yet scatter roles     |
| Identifier readability            | Out of scope | Quality of names inside module bodies                        | N never judges a name's quality, only the overlap between two name sets                              |

```ts
// Comparison example set:
// name agreement (defined term) is about stem tokens vs export tokens.
// identifier readability (related term) would ask whether `q` is a good name —
// N does not: the file below scores 1 because {invoice} ⊆ {parse, invoice, q}.
// file: src/billing/invoice.ts
export const parseInvoice = (q: string): number => q.length
export interface Invoice {
  readonly cents: number
}
```

One example per enumerated item:

```ts
// file: src/user/userRepo.ts — effective name tokens from the stem: {user, repo}
// export tokens: {user, repo} ∪ {user} = {user, repo}
// agreement = |{user, repo} ∩ {user, repo}| / 2 = 1
export interface UserRepo {
  readonly byId: (id: string) => string
}
export type User = string
```

```ts
// file: src/billing/index.ts — stem "index" → the physical-file rule substitutes
// the module directory basename "billing": effective name tokens = {billing}
export const billingTotal = (cents: ReadonlyArray<number>): number =>
  cents.reduce((a, b) => a + b, 0) // export tokens {billing, total} ⊇ {billing} → agreement 1
```

```ts
// file: src/user/makeUser.ts — a default export contributes the declared name
// of the default-exported declaration: {make, user}
export default function makeUser(id: string): { readonly id: string } {
  return { id }
}
```

**Not this:**

```ts
// file: src/util/helpers.ts — effective name tokens {helpers};
// export tokens {parse, invoice}; agreement = 0/1 = 0 — the name claims
// content ("helpers") that no export evidences.
export const parseInvoice = (raw: string): number => raw.length
```

```ts
// file: src/main.ts — zero exported declarations: excluded from N entirely,
// NOT scored 0 (exclusion: "modules with none are excluded").
import { Effect } from "effect"
Effect.runPromise(Effect.log("boot"))
```

**Mechanical predicate:** input: each module's stem, [module directory](#module-directory)
basename, and [exported declaration](#exported-declaration) names. Compute effective name tokens
(with the `index` substitution), export tokens (with the `default` substitution), the
containment ratio per module, and the mean over qualifying modules in lexicographic order.

**Predicate implementation:**

```ts
import ts from "typescript"

declare function nameTokens(text: string): ReadonlyArray<string>
declare function moduleDirectory(module: string): string
declare function exportedDeclarations(
  program: ts.Program,
  file: ts.SourceFile
): ReadonlyArray<{ readonly name: string; readonly typeOnly: boolean }>

export function moduleNameAgreement(program: ts.Program, module: string): number | undefined {
  const file = program.getSourceFile(module)
  if (file === undefined) return undefined
  const exports = exportedDeclarations(program, file)
  if (exports.length === 0) return undefined // excluded, not zero
  const stem = module.split("/").at(-1)!.replace(/\.[^.]+$/, "")
  const effective =
    stem === "index"
      ? nameTokens(moduleDirectory(module).split("/").at(-1)!) // index rule
      : nameTokens(stem)
  const exportTokens = new Set<string>()
  for (const e of exports) {
    if (e.name === "default") {
      const checker = program.getTypeChecker()
      const moduleSymbol = checker.getSymbolAtLocation(file)
      const def = moduleSymbol
        ? checker.getExportsOfModule(moduleSymbol).find((s) => s.getName() === "default")
        : undefined
      const target =
        def && def.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(def) : def
      const declared = target?.getName()
      if (declared !== undefined && declared !== "default") {
        for (const t of nameTokens(declared)) exportTokens.add(t) // default-name rule
      }
    } else {
      for (const t of nameTokens(e.name)) exportTokens.add(t)
    }
  }
  const effectiveSet = new Set(effective)
  if (effectiveSet.size === 0) return 0
  let hits = 0
  for (const t of effectiveSet) if (exportTokens.has(t)) hits += 1
  return hits / effectiveSet.size
}

export function nameAgreement(program: ts.Program, modules: ReadonlyArray<string>): number {
  const values = [...modules]
    .sort()
    .map((m) => moduleNameAgreement(program, m))
    .filter((v): v is number => v !== undefined)
  if (values.length === 0) return 1
  return values.reduce((a, b) => a + b, 0) / values.length
}
```

### Subtree encapsulation

Component **E**: how narrowly [directory subtrees](#directory-subtree) are consumed from
outside. For a [directory tree](#directory-tree) node `D` strictly below the
[source root](#source-root) whose [directory subtree](#directory-subtree) contains `n ≥ 2`
modules of the [graph universe](#graph-universe), the **exposed count** is the number of subtree
modules that are the target of at least one [import edge](#import-edge) whose source lies
outside the subtree. The encapsulation of `D` is 1 when the exposed count is ≤ 1 (one facade or
none), else `(n − exposed) / (n − 1)`. E is the mean of encapsulation over all qualifying nodes,
weighted by each node's `n`; with no qualifying node, E = 1. Unit: ratio in [0, 1]; larger is
better.

#### Related terms

| Term                      | Relation      | Deciding distinction                                     | Why it is not interchangeable here                                                                        |
| ------------------------- | ------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Export visibility         | Different layer | `export` keyword on a declaration                        | A symbol can be exported for siblings yet never deep-imported across the subtree boundary; E sees actual edges |
| Package `exports` field   | Enforced variant | `package.json` subpath allowlist                         | Enforces at package granularity only; E measures every directory level, without requiring enforcement          |
| [Dependency locality](#dependency-locality) | Complementary | Distance of each edge                    | An edge can be short yet still pierce a subtree boundary one level up; E counts piercings, not lengths          |

```jsonc
// Comparison example set. Subtree /r/src/user contains 3 graph-universe modules;
// index.ts and repo.ts are imported from outside, model.ts is not.
{
  "subtree": "/r/src/user",
  "n": 3,
  // exposed count: modules targeted by an edge whose source is outside the subtree
  "exposed": ["index.ts", "repo.ts"],
  // encapsulation = (n − exposed)/(n − 1) = (3 − 2)/2 = 0.5
  "encapsulation": 0.5,
  // boundary case "exposed ≤ 1 → 1": if only index.ts were imported externally,
  // encapsulation would be 1 (a single facade).
  "facadeCase": 1,
  // export visibility (related term): model.ts may export everything and still
  // count as unexposed — only actual cross-boundary edges matter.
  "exportVisibilityIrrelevant": true
}
```

**Mechanical predicate:** input: the [graph universe](#graph-universe),
[directory tree](#directory-tree), and [source root](#source-root). For each qualifying node in
lexicographic order: count subtree modules (`n`), compute the exposed count from edges crossing
into the subtree, apply the formula, and accumulate the n-weighted mean.

**Predicate implementation:**

```ts
declare function directoryNodes(modules: ReadonlyArray<string>, root: string): ReadonlyArray<string>
declare function inSubtree(root: string, path: string): boolean

export function subtreeEncapsulation(
  modules: ReadonlyArray<string>,
  edges: ReadonlyArray<readonly [string, string]>,
  root: string
): number {
  let weighted = 0
  let weight = 0
  for (const node of directoryNodes(modules, root)) {
    if (node === root) continue // strictly below the source root
    const inside = modules.filter((m) => inSubtree(node, m))
    const n = inside.length
    if (n < 2) continue // qualifying nodes contain at least 2 modules
    const exposed = new Set(
      edges
        .filter(([from, to]) => !inSubtree(node, from) && inSubtree(node, to))
        .map(([, to]) => to)
    ).size
    const enc = exposed <= 1 ? 1 : (n - exposed) / (n - 1)
    weighted += n * enc
    weight += n
  }
  return weight === 0 ? 1 : weighted / weight
}
```

### Directory acyclicity

Component **Y**: the absence of dependency cycles between directories. For each depth
`d ∈ {1, …, maxDepth}`, contract every [graph universe](#graph-universe) module to its
[physical partition at depth d](#physical-partition-at-depth-d) group and keep
[import edges](#import-edge) between distinct groups; `Y_d` is 1 minus the fraction of groups
that belong to a strongly connected component of size ≥ 2 in that contracted digraph. Y is the
minimum of `Y_d` over all depths (a cycle at any level of the [directory tree](#directory-tree)
is a boundary that does not separate). With maxDepth 0 (all modules at the root), Y = 1
(vacuous). Unit: ratio in [0, 1]; larger is better.

**Mechanical predicate:** input: the [graph universe](#graph-universe) and
[source root](#source-root). For each depth, build the contracted digraph with groups sorted
lexicographically, run Tarjan's SCC algorithm (deterministic given the sorted order), and count
groups in components of size ≥ 2; return the minimum `Y_d`.

**Predicate implementation:**

```ts
declare function physicalGroupAtDepth(module: string, root: string, d: number): string
declare function moduleDirectory(module: string): string
declare function directoryDepth(dir: string, root: string): number

function groupsInCycles(
  nodes: ReadonlyArray<string>,
  arcs: ReadonlyArray<readonly [string, string]>
): number {
  const adjacency = new Map<string, Array<string>>(nodes.map((v) => [v, []]))
  for (const [from, to] of arcs) adjacency.get(from)?.push(to)
  for (const list of adjacency.values()) list.sort()
  const index = new Map<string, number>()
  const low = new Map<string, number>()
  const onStack = new Set<string>()
  const stack: Array<string> = []
  let counter = 0
  let cyclic = 0
  const strongConnect = (v: string): void => {
    index.set(v, counter)
    low.set(v, counter)
    counter += 1
    stack.push(v)
    onStack.add(v)
    for (const w of adjacency.get(v) ?? []) {
      if (!index.has(w)) {
        strongConnect(w)
        low.set(v, Math.min(low.get(v)!, low.get(w)!))
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!))
      }
    }
    if (low.get(v) === index.get(v)) {
      const component: Array<string> = []
      let w = ""
      do {
        w = stack.pop()!
        onStack.delete(w)
        component.push(w)
      } while (w !== v)
      if (component.length >= 2) cyclic += component.length
    }
  }
  for (const v of nodes) if (!index.has(v)) strongConnect(v)
  return cyclic
}

export function directoryAcyclicity(
  modules: ReadonlyArray<string>,
  edges: ReadonlyArray<readonly [string, string]>,
  root: string
): number {
  const maxDepth = Math.max(0, ...modules.map((m) => directoryDepth(moduleDirectory(m), root)))
  if (maxDepth === 0) return 1
  let worst = 1
  for (let d = 1; d <= maxDepth; d += 1) {
    const groupOf = new Map<string, string>(
      modules.map((m) => [m, physicalGroupAtDepth(m, root, d)])
    )
    const nodes = [...new Set(groupOf.values())].sort()
    const arcs = [
      ...new Set(
        edges
          .map(([from, to]) => [groupOf.get(from)!, groupOf.get(to)!] as const)
          .filter(([from, to]) => from !== to)
          .map(([from, to]) => `${from}\u0000${to}`)
      )
    ]
      .sort()
      .map((k) => {
        const sep = k.indexOf("\u0000")
        return [k.slice(0, sep), k.slice(sep + 1)] as const
      })
    const cyclic = groupsInCycles(nodes, arcs)
    worst = Math.min(worst, nodes.length === 0 ? 1 : 1 - cyclic / nodes.length)
  }
  return worst
}
```

```jsonc
// Directory acyclicity at depth 1: user → billing → user is a 2-cycle.
{
  "depth1Groups": ["/r/src/billing", "/r/src/payments", "/r/src/user"],
  "contractedArcs": [
    ["/r/src/billing", "/r/src/user"],
    ["/r/src/user", "/r/src/billing"],
    ["/r/src/payments", "/r/src/billing"]
  ],
  // groups in an SCC of size ≥ 2: billing and user → 2 of 3 groups
  "Y_1": 0.3333333333333333,
  // Y = min over depths; with no deeper cycles Y = Y_1
  "Y": 0.3333333333333333
}
```

### Test subject

For a [project module](#project-module) with [module role](#module-role) `test`: the non-test
[project module](#project-module) from which the test imports the most bindings, where each
named import specifier, default import, or namespace import in an import declaration counts as
one binding. Ties break to the lexicographically smallest module path. A test importing no
non-test [project module](#project-module) has no test subject.

**Mechanical predicate:** input: the test module's AST and the [import edge](#import-edge)
resolution. Count bindings per resolved non-test target; return the argmax with lexicographic
tie-break, or `undefined` when no target exists.

**Predicate implementation:**

```ts
import ts from "typescript"

export function testSubject(
  program: ts.Program,
  testModule: string,
  resolveTarget: (specifier: string) => string | undefined // non-test project module or undefined
): string | undefined {
  const sf = program.getSourceFile(testModule)
  if (sf === undefined) return undefined
  const counts = new Map<string, number>()
  for (const statement of sf.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteralLike(statement.moduleSpecifier)) {
      continue
    }
    const target = resolveTarget(statement.moduleSpecifier.text)
    if (target === undefined) continue
    let bindings = 0
    const clause = statement.importClause
    if (clause?.name !== undefined) bindings += 1 // default import
    if (clause?.namedBindings !== undefined) {
      bindings += ts.isNamespaceImport(clause.namedBindings)
        ? 1 // namespace import
        : clause.namedBindings.elements.length // named import specifiers
    }
    counts.set(target, (counts.get(target) ?? 0) + bindings)
  }
  const ranked = [...counts.entries()].sort(
    ([pa, ca], [pb, cb]) => cb - ca || (pa < pb ? -1 : 1) // max count, then smallest path
  )
  return ranked[0]?.[0]
}
```

```ts
// file: tests/user/userRepo.test.ts — subject determination
import { expect, test } from "bun:test" // external: never a subject candidate
import { makeUserRepo, UserRepo } from "../../src/user/userRepo.js" // 2 bindings
import { User } from "../../src/user/user.js" // 1 binding
// test subject = src/user/userRepo.ts (2 > 1); a 1–1 tie would break to the
// lexicographically smaller path, src/user/user.ts.
test("repo", () => {
  const repo: UserRepo = makeUserRepo()
  const u: typeof User = User
  expect(repo).toBeDefined()
  expect(u).toBeDefined()
})
```

### Test placement correspondence

Component **T**: how recognizably tests are placed relative to their
[test subjects](#test-subject). For a test module `t` with subject `s`, let `P(x)` be the union
of [name tokens](#name-token) over every path segment of `x` relative to the
[source root](#source-root)'s parent (directories and filename stem), minus the fixed stop-token
set `{test, tests, spec, specs, src, index, main, mod}`. The correspondence of `t` is the
Jaccard index `|P(t) ∩ P(s)| / |P(t) ∪ P(s)|`, or 1 when both sets are empty. T is the mean of
correspondence over all test modules that have a subject; with none, T = 1. Both co-located
tests (`src/user/user.test.ts` beside `src/user/user.ts`) and mirrored trees
(`tests/user/user.test.ts` for `src/user/user.ts`) score 1; a test whose path shares no
meaningful token with its subject scores 0. Unit: ratio in [0, 1]; larger is better.

**Mechanical predicate:** input: each test module's path, its [test subject](#test-subject)'s
path, and the [source root](#source-root). Tokenize both paths, subtract stop tokens, compute
Jaccard, average in lexicographic order of test paths.

**Predicate implementation:**

```ts
declare function nameTokens(text: string): ReadonlyArray<string>

const STOP_TOKENS: ReadonlySet<string> = new Set([
  "test",
  "tests",
  "spec",
  "specs",
  "src",
  "index",
  "main",
  "mod"
])

function pathTokens(path: string, rootParent: string): ReadonlySet<string> {
  const rel = path.startsWith(`${rootParent}/`) ? path.slice(rootParent.length + 1) : path
  const segments = rel.split("/")
  const stem = segments.at(-1)!.replace(/\.[^.]+$/, "")
  const out = new Set<string>()
  for (const segment of [...segments.slice(0, -1), stem]) {
    for (const token of nameTokens(segment)) if (!STOP_TOKENS.has(token)) out.add(token)
  }
  return out
}

export function testPlacementCorrespondence(
  pairs: ReadonlyArray<readonly [test: string, subject: string]>,
  rootParent: string
): number {
  if (pairs.length === 0) return 1
  const sorted = [...pairs].sort()
  let sum = 0
  for (const [test, subject] of sorted) {
    const pt = pathTokens(test, rootParent)
    const ps = pathTokens(subject, rootParent)
    let intersection = 0
    for (const token of pt) if (ps.has(token)) intersection += 1
    const union = pt.size + ps.size - intersection
    sum += union === 0 ? 1 : intersection / union
  }
  return sum / sorted.length
}
```

```jsonc
// Correspondence example. Root parent /repo; stop tokens strip "tests", "src", "test".
{
  // mirrored: /repo/tests/user/user.test.ts → tokens {user}
  //           /repo/src/user/user.ts        → tokens {user}
  "mirrored": { "jaccard": 1 },
  // co-located: /repo/src/user/user.test.ts vs /repo/src/user/user.ts → {user} vs {user}
  "coLocated": { "jaccard": 1 },
  // adrift: /repo/tests/misc/checks.test.ts → {misc, checks}
  //         /repo/src/user/user.ts          → {user}  → 0/3
  "adrift": { "jaccard": 0 },
  // "both sets empty → 1": /repo/tests/index.test.ts vs /repo/src/index.ts
  "bothEmpty": { "jaccard": 1 }
}
```

### Placement cost

For a [graph universe](#graph-universe) module `m` and a candidate
[directory tree](#directory-tree) node `D`: the sum over all [import edges](#import-edge)
incident to `m` (in either direction) of the [tree distance](#tree-distance) that the edge would
have if `m` were attached at `D`, other modules staying where they are. Unit: non-negative
integer (edge-count sum).

**Mechanical predicate:** input: `m`, `D`, the [graph universe](#graph-universe) edge set, and
the [source root](#source-root). For each incident edge, compute the
[tree distance](#tree-distance) between `D` and the other endpoint's
[module directory](#module-directory); sum.

**Predicate implementation:**

```ts
declare function moduleDirectory(module: string): string
declare function treeDistance(a: string, b: string, root: string): number

export function placementCost(
  m: string,
  candidate: string,
  edges: ReadonlyArray<readonly [string, string]>,
  root: string
): number {
  let cost = 0
  for (const [from, to] of edges) {
    const other = from === m ? to : to === m ? from : undefined
    if (other === undefined) continue
    // distance as if m sat in `candidate`: use a phantom filename inside it
    cost += treeDistance(`${candidate}/_.ts`, other, root)
  }
  return cost
}
```

```jsonc
// Placement cost of m with importers in /r/src/user (2 edges) and /r/src/billing (1 edge):
{
  "costAt": {
    "/r/src/util": 6, // 2·2 + 1·2 — current home, far from everyone
    "/r/src/user": 2, // 2·0 + 1·2 — beside the majority
    "/r/src": 3 // 2·1 + 1·1 — at the shared ancestor
  }
}
```

### Dependency median

For a [graph universe](#graph-universe) module `m` with at least one incident
[import edge](#import-edge): the [directory tree](#directory-tree) node with minimal
[placement cost](#placement-cost) for `m`; ties break to the smallest
[directory depth](#directory-depth), then to the lexicographically smallest path. A module with
no incident edges has no dependency median.

#### Related terms

| Term                      | Relation    | Deciding distinction                                             | Why it is not interchangeable here                                                                 |
| ------------------------- | ----------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| LCA of importers          | Special case | Deepest common ancestor of importer directories only              | Ignores `m`'s own imports and edge multiplicity; the median minimizes total distance over all incident edges |
| Barycenter (average path) | Continuous  | Averages coordinates rather than minimizing tree metric           | Not a tree node; cannot be a move target                                                                    |

```jsonc
// Comparison example set. m imported twice from /r/src/user, once from /r/src/billing;
// m itself imports /r/src/user/model.ts.
{
  // dependency median (defined term): /r/src/user — cost 2 beats /r/src (cost 4)
  "median": "/r/src/user",
  // LCA of importers (related term): /r/src — the common ancestor of user and
  // billing, which ignores that 3 of 4 incident edges pull toward user.
  "lcaOfImporters": "/r/src"
}
```

**Mechanical predicate:** input: `m`, the [directory tree](#directory-tree) node list, the edge
set, and the [source root](#source-root). Evaluate [placement cost](#placement-cost) at every
node in lexicographic order; return the argmin under the stated tie-break.

**Predicate implementation:**

```ts
declare function placementCost(
  m: string,
  candidate: string,
  edges: ReadonlyArray<readonly [string, string]>,
  root: string
): number
declare function directoryDepth(dir: string, root: string): number

export function dependencyMedian(
  m: string,
  nodes: ReadonlyArray<string>,
  edges: ReadonlyArray<readonly [string, string]>,
  root: string
): string | undefined {
  if (!edges.some(([from, to]) => from === m || to === m)) return undefined
  let best: { readonly node: string; readonly cost: number; readonly depth: number } | undefined
  for (const node of [...nodes].sort()) {
    const cost = placementCost(m, node, edges, root)
    const depth = directoryDepth(node, root)
    if (
      best === undefined ||
      cost < best.cost ||
      (cost === best.cost && depth < best.depth) // tie-break 1: smallest depth
      // tie-break 2 (lexicographic) is implied by sorted iteration
    ) {
      best = { node, cost, depth }
    }
  }
  return best?.node
}
```

### Misplacement distance

For a [graph universe](#graph-universe) module `m` with a
[dependency median](#dependency-median): the [placement cost](#placement-cost) of `m` at its
current [module directory](#module-directory) minus its [placement cost](#placement-cost) at the
[dependency median](#dependency-median). Always ≥ 0; 0 means the module already sits optimally.
Unit: non-negative integer.

**Mechanical predicate:** input: `m`, the tree, edges, root. Output (valuation):
`placementCost(m, dir(m)) − placementCost(m, median(m))`, or 0 when no median exists.

**Predicate implementation:**

```ts
declare function placementCost(
  m: string,
  candidate: string,
  edges: ReadonlyArray<readonly [string, string]>,
  root: string
): number
declare function dependencyMedian(
  m: string,
  nodes: ReadonlyArray<string>,
  edges: ReadonlyArray<readonly [string, string]>,
  root: string
): string | undefined
declare function moduleDirectory(module: string): string

export function misplacementDistance(
  m: string,
  nodes: ReadonlyArray<string>,
  edges: ReadonlyArray<readonly [string, string]>,
  root: string
): number {
  const median = dependencyMedian(m, nodes, edges, root)
  if (median === undefined) return 0
  return (
    placementCost(m, moduleDirectory(m), edges, root) - placementCost(m, median, edges, root)
  )
}
```

```jsonc
// Misplacement of /r/src/util/format.ts, imported only by /r/src/billing modules:
{
  "costAtCurrent": 6, // /r/src/util
  "costAtMedian": 0, // /r/src/billing
  "misplacementDistance": 6
}
```

### Divergent module

A [graph universe](#graph-universe) module `m` whose exports serve disjoint consumer groups:
`m` has at least two [exported declarations](#exported-declaration) and at least two importers,
and the **export-usage graph** — vertices are `m`'s [exported declarations](#exported-declaration);
two are joined when some importer references both (a namespace import references all of them) or
when one's declaration references the other inside `m` — has at least two connected components
each referenced by at least one importer. "References" means: appears as a named import
specifier of an import from `m`, or is named in an `export { … } from` clause targeting `m`.

**Mechanical predicate:** input: `m`'s [exported declarations](#exported-declaration) and, for
each importer, the set of `m`-exports it references (checker-resolved), plus intra-module
references between exported declarations. Build the export-usage graph; `m` is divergent iff the
components-with-consumers count is ≥ 2.

**Predicate implementation:**

```ts
export function isDivergent(
  exportNames: ReadonlyArray<string>,
  usageByImporter: ReadonlyArray<ReadonlySet<string>>, // per importer: referenced export names
  internalLinks: ReadonlyArray<readonly [string, string]> // intra-module references
): boolean {
  if (exportNames.length < 2 || usageByImporter.length < 2) return false
  const parent = new Map<string, string>(exportNames.map((e) => [e, e]))
  const find = (x: string): string => {
    let cur = x
    while (parent.get(cur) !== cur) cur = parent.get(cur)!
    return cur
  }
  const union = (a: string, b: string): void => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb)
  }
  for (const used of usageByImporter) {
    const list = [...used].sort()
    for (let i = 1; i < list.length; i += 1) union(list[0]!, list[i]!) // co-referenced by an importer
  }
  for (const [a, b] of internalLinks) union(a, b) // referenced inside m
  const consumedRoots = new Set<string>()
  for (const used of usageByImporter) for (const e of used) consumedRoots.add(find(e))
  return consumedRoots.size >= 2
}
```

**This:**

```ts
// file: src/shared/stuff.ts — divergent: parseInvoice is used only by billing
// importers, hashPassword only by auth importers, and neither references the
// other internally → two consumed components.
export const parseInvoice = (raw: string): number => raw.length
export const hashPassword = (pw: string): string => pw.split("").reverse().join("")
```

**Not this:**

```ts
// file: src/user/user.ts — NOT divergent: even if importers split between the
// two exports, makeUser references User internally, joining the components.
export interface User {
  readonly id: string
}
export const makeUser = (id: string): User => ({ id }) // internal reference joins User
```

### Cross-subtree barrel

A module with [module role](#module-role) `barrel` that has at least one
[import edge](#import-edge) (necessarily an `export … from`) whose target lies outside the
barrel's own [directory subtree](#directory-subtree) — the subtree rooted at the barrel's
[module directory](#module-directory).

**Mechanical predicate:** input: a barrel module, its [import edges](#import-edge), and the
[directory tree](#directory-tree). The module is a cross-subtree barrel iff some edge target `t`
fails `inSubtree(moduleDirectory(barrel), t)`.

**Predicate implementation:**

```ts
declare function moduleDirectory(module: string): string
declare function inSubtree(root: string, path: string): boolean

export function isCrossSubtreeBarrel(
  barrel: string,
  edges: ReadonlyArray<readonly [string, string]> // graph-universe import edges
): boolean {
  const home = moduleDirectory(barrel)
  return edges.some(([from, to]) => from === barrel && !inSubtree(home, to))
}
```

**This:**

```ts
// file: src/user/index.ts — cross-subtree barrel: re-exports from a foreign subtree
export * from "./user.js" // inside src/user — fine on its own
export { formatMoney } from "../billing/money.js" // OUTSIDE src/user → cross-subtree
```

**Not this:**

```ts
// file: src/user/index.ts — NOT cross-subtree: every target is a descendant
export * from "./user.js"
export { UserRepo } from "./repo/userRepo.js"
```

### Pass-through directory

A [directory tree](#directory-tree) node with exactly one child directory node and zero attached
[graph universe](#graph-universe) modules. It adds one edge of [tree distance](#tree-distance)
to every path crossing it while contributing no branching information.

**Mechanical predicate:** input: the [directory tree](#directory-tree). A node qualifies iff its
attached-module count is 0 and its child-directory count is exactly 1.

**Predicate implementation:**

```ts
declare function directoryNodes(modules: ReadonlyArray<string>, root: string): ReadonlyArray<string>
declare function moduleDirectory(module: string): string

export function passThroughDirectories(
  modules: ReadonlyArray<string>,
  root: string
): ReadonlyArray<string> {
  const nodes = directoryNodes(modules, root)
  const childCount = new Map<string, number>(nodes.map((n) => [n, 0]))
  for (const node of nodes) {
    const parent = node.split("/").slice(0, -1).join("/")
    if (childCount.has(parent)) childCount.set(parent, childCount.get(parent)! + 1)
  }
  const attached = new Set(modules.map((m) => moduleDirectory(m)))
  return nodes.filter((n) => n !== root && childCount.get(n) === 1 && !attached.has(n))
}
```

```jsonc
// This: /r/src/domain has one child (model) and no attached modules → pass-through.
// Not this: /r/src/user has one child but also an attached module → not pass-through.
{
  "tree": {
    "/r/src/domain": { "children": ["/r/src/domain/model"], "modules": [] },
    "/r/src/user": { "children": ["/r/src/user/repo"], "modules": ["/r/src/user/user.ts"] }
  },
  "passThrough": ["/r/src/domain"]
}
```

### Semantic organization score

The aggregate metric value: the fixed-weight sum

```text
SOS = 0.25·L + 0.25·A + 0.15·R + 0.15·N + 0.10·E + 0.05·Y + 0.05·T
```

over the seven components [dependency locality](#dependency-locality) (L),
[partition agreement](#partition-agreement) (A), [role predictability](#role-predictability) (R),
[name agreement](#name-agreement) (N), [subtree encapsulation](#subtree-encapsulation) (E),
[directory acyclicity](#directory-acyclicity) (Y), and
[test placement correspondence](#test-placement-correspondence) (T). The weights are protocol
constants: the two graph-versus-tree comparisons carry half the weight because they encode the
core of the property (placement tracks semantics); naming carries 0.30; the three structural
hygiene components share 0.20. Unit: dimensionless ratio in [0, 1]; larger is better.

**Mechanical predicate:** input: the seven component values. Output (valuation, unit: ratio):
the weighted sum above, computed in the component order L, A, R, N, E, Y, T.

**Predicate implementation:**

```ts
export type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}

export const WEIGHTS: Components = {
  L: 0.25,
  A: 0.25,
  R: 0.15,
  N: 0.15,
  E: 0.1,
  Y: 0.05,
  T: 0.05
}

export function semanticOrganizationScore(components: Components): number {
  return (
    WEIGHTS.L * components.L +
    WEIGHTS.A * components.A +
    WEIGHTS.R * components.R +
    WEIGHTS.N * components.N +
    WEIGHTS.E * components.E +
    WEIGHTS.Y * components.Y +
    WEIGHTS.T * components.T
  )
}
```

```jsonc
// Valuation example — every component and weight demonstrated:
{
  "components": { "L": 0.8, "A": 0.6, "R": 0.9, "N": 0.7, "E": 1.0, "Y": 1.0, "T": 1.0 },
  // 0.25·0.8 + 0.25·0.6 + 0.15·0.9 + 0.15·0.7 + 0.10·1 + 0.05·1 + 0.05·1
  "sos": 0.79
}
```

### Noise floor

The smallest difference between two measured values of the same metric over the same inputs that
the protocol treats as a real change rather than variance. For the
[semantic organization score](#semantic-organization-score) the noise floor is **zero**: the
metric is a pure function of the pinned inputs (see [Procedure](#procedure)) with no execution,
sampling, timing, or randomness, and every floating-point aggregation iterates in a specified
lexicographic order, so two conforming runs produce bit-identical values.

**Mechanical predicate:** input: two measured values `v1`, `v2` of the same metric over the same
inputs digest. The difference is real iff `|v1 − v2| > 0`.

**Predicate implementation:**

```ts
export const NOISE_FLOOR = 0

export function isRealChange(v1: number, v2: number): boolean {
  return Math.abs(v1 - v2) > NOISE_FLOOR
}
```

```ts
declare function isRealChange(v1: number, v2: number): boolean
const same = isRealChange(0.79, 0.79) // false — identical values are no-change
const differs = isRealChange(0.79, 0.7900000001) // true — any nonzero delta is real at floor 0
```

### Measurement record

The machine-readable output of one measurement run: the
[semantic organization score](#semantic-organization-score), its unit, all seven component
values, the decomposition (see [Decomposition](#decomposition)), the counts and digests that pin
the inputs, the environment controls, and a timestamp. The **inputs digest** is the SHA-256 of
the concatenation, in lexicographic path order, of every [project module](#project-module)'s
path and content hash, followed by the tsconfig contents, the TypeScript version string, and the
protocol version.

**Mechanical predicate:** input: a candidate JSON document. It is a measurement record iff it
carries all fields shown below with the stated types, `unit === "ratio"`, and
`protocolVersion === "1"`.

**Predicate implementation:**

```ts
import { Schema } from "effect"

export const ComponentsSchema = Schema.Struct({
  L: Schema.Number,
  A: Schema.Number,
  R: Schema.Number,
  N: Schema.Number,
  E: Schema.Number,
  Y: Schema.Number,
  T: Schema.Number
})

export const MeasurementRecord = Schema.Struct({
  metric: Schema.Literal("semantic-organization-score"),
  protocolVersion: Schema.Literal("1"),
  value: Schema.Number,
  unit: Schema.Literal("ratio"),
  components: ComponentsSchema,
  counts: Schema.Struct({
    modules: Schema.Number,
    graphModules: Schema.Number,
    edges: Schema.Number,
    directories: Schema.Number,
    tests: Schema.Number
  }),
  moduleList: Schema.Array(Schema.String), // sorted project-module paths
  exportInventoryDigest: Schema.String, // sha256 of sorted exported-declaration names
  inputsDigest: Schema.String,
  environment: Schema.Struct({ typescript: Schema.String, runtime: Schema.String }),
  timestamp: Schema.String
})
export type MeasurementRecord = typeof MeasurementRecord.Type
```

```jsonc
// Complete example record — every field demonstrated:
{
  "metric": "semantic-organization-score",
  "protocolVersion": "1", // pins the constants: weights, τ, stop tokens, test specifiers
  "value": 0.79, // the semantic organization score
  "unit": "ratio", // dimensionless, [0, 1], larger is better
  "components": { "L": 0.8, "A": 0.6, "R": 0.9, "N": 0.7, "E": 1.0, "Y": 1.0, "T": 1.0 },
  "counts": { "modules": 214, "graphModules": 180, "edges": 402, "directories": 31, "tests": 34 },
  "moduleList": ["/repo/src/app.ts", "/repo/src/user/user.ts"],
  "exportInventoryDigest": "sha256:6b1f…", // invariant input: sorted export names
  "inputsDigest": "sha256:9c2e…", // module paths+content, tsconfig, TS version, protocol version
  "environment": { "typescript": "6.0.3", "runtime": "bun@1.3.14" },
  "timestamp": "2026-07-28T12:00:00Z"
}
```

### Confirmation pair

Two [measurement records](#measurement-record) — a *before* record and an *after* record — with
identical `protocolVersion` and identical `environment`, where the after record is measured on
the project after exactly one lever's transformation. All lever confirmations and all invariants
in this document are predicates over a confirmation pair.

**Mechanical predicate:** input: two [measurement records](#measurement-record). They form a
confirmation pair iff `before.protocolVersion === after.protocolVersion`,
`before.environment.typescript === after.environment.typescript`, and
`before.inputsDigest !== after.inputsDigest` (something was actually transformed).

**Predicate implementation:**

```ts
type Environment = { readonly typescript: string; readonly runtime: string }
type RecordLike = {
  readonly protocolVersion: string
  readonly environment: Environment
  readonly inputsDigest: string
}

export function isConfirmationPair(before: RecordLike, after: RecordLike): boolean {
  return (
    before.protocolVersion === after.protocolVersion &&
    before.environment.typescript === after.environment.typescript &&
    before.inputsDigest !== after.inputsDigest
  )
}
```

```jsonc
// Confirmation pair skeleton — the three predicate conditions annotated:
{
  "before": { "protocolVersion": "1", "environment": { "typescript": "6.0.3" }, "inputsDigest": "sha256:aaaa" },
  "after": { "protocolVersion": "1", "environment": { "typescript": "6.0.3" }, "inputsDigest": "sha256:bbbb" }
  // protocolVersion equal ✓, typescript equal ✓, inputsDigest differs ✓
}
```

## Measurement

### Metric

- **Name:** [semantic organization score](#semantic-organization-score) (SOS).
- **Unit:** dimensionless ratio.
- **Scale:** ratio scale on [0, 1] (differences and ratios of values are meaningful).
- **Direction of goodness:** larger is better.
- **Domain:** one compilation unit — the set of [project modules](#project-module) of one
  measured tsconfig. Per-module, per-edge, per-directory, and per-test values exist through the
  [decomposition](#decomposition). For a workspace of several tsconfig projects, each project is
  measured separately and reported as the module-count-weighted mean, with each project's record
  retained.
- **Observable inputs (exhaustive):**
  1. the measured `tsconfig.json` (its `include`/`files`/`exclude`, `compilerOptions.rootDir`,
     module-resolution options, and `paths` aliases),
  2. the source text of every [project module](#project-module),
  3. compiler resolutions derived from 1–2: [import edges](#import-edge),
     [exported declarations](#exported-declaration), and the resolved types probed by
     [module role](#module-role) — including the type declarations of resolved external packages
     (the `effect` brand properties live there),
  4. the pinned TypeScript compiler version,
  5. the protocol constants pinned by `protocolVersion` (component weights, τ = 1/3, the
     distance offset 2, the test-specifier set, the stop-token set, the brand property names).
- **Explicitly excluded inputs:** execution traces and runtime behavior; wall-clock or CPU time;
  version-control history (co-change coupling is a divergence noted below); comments and
  formatting; file sizes except where an invariant names them; declaration files; anything under
  `node_modules` beyond type declarations reached by resolution; editor or tooling state.
- **Proxy validity:** SOS is a proxy for "the layout is an accurate index of meaning." Known
  divergences, stated plainly:
  1. **Synonym blindness.** [Name agreement](#name-agreement) and
     [test placement correspondence](#test-placement-correspondence) compare
     [name tokens](#name-token) literally; `cart.ts` exporting `Basket` scores 0 though the
     names are synonyms. No companion measurement exists; treat low-N modules as candidates, not
     verdicts, when tokens are synonymous.
  2. **Co-change coupling.** Two modules never linked by [import edges](#import-edge) but always
     edited together are semantically coupled in a way the
     [module dependency graph](#module-dependency-graph) cannot see. A companion measurement —
     the adjusted Rand index between the physical partition and a clustering of git co-change
     pairs over a pinned revision range — is deterministic given the range and can be added
     beside A; it is outside this metric's inputs by design (history is excluded).
  3. **Directory-name meaningfulness.** A directory named `stuff/` whose members cluster
     perfectly scores full A and L; only the `index`-stem rule of
     [name agreement](#name-agreement) touches directory basenames. Residual gap: directory
     basename vocabulary is otherwise unmeasured.
  4. **Closed role list.** [Module role](#module-role) has nine categories; genuinely novel
     roles land in `logic`, weakening R's resolution but never fabricating structure.
  5. **Uniform edge weight.** A type-only [import edge](#import-edge) counts like a value edge;
     layouts optimized for runtime-only navigation may look worse than they feel.

### Procedure

**Environment controls.** The metric is static; controls pin inputs, not execution conditions:

1. TypeScript version: the workspace-pinned compiler (`typescript@6.0.3` from the lockfile);
   recorded in the record's `environment.typescript`. Two records compare only when equal.
2. Runtime for the measurement harness: `bun@1.3.14` (recorded; the value of SOS does not depend
   on it, since all arithmetic is IEEE-754 double precision with specified iteration order).
3. Protocol constants: fixed by `protocolVersion: "1"` — weights
   `{L: 0.25, A: 0.25, R: 0.15, N: 0.15, E: 0.10, Y: 0.05, T: 0.05}`, τ = 1/3, distance offset
   2, test specifiers `{bun:test, node:test, vitest, @jest/globals, jest, mocha}`, stop tokens
   `{test, tests, spec, specs, src, index, main, mod}`, brands `~effect/Context/Service`,
   `~effect/Layer`, `~effect/Schema/Schema`.
4. Determinism rules: paths resolved to absolute canonical form; every traversal, union-find,
   SCC, and floating-point summation iterates in lexicographic order; no randomness, no
   wall-clock reads inside valuation (the timestamp is metadata only); no warmup, repetition, or
   aggregation across runs is needed because a single run is exact.

**Noise floor: 0.** Justification: the value is a pure function of the inputs digest. Given
equal digests and equal environment, every step — config parsing, AST walks, resolution, brand
probes, union-find with lexicographic tie-breaks, Tarjan in sorted order, fixed-order double
summation — is specified deterministically, so re-runs are bit-identical (see
[noise floor](#noise-floor)).

**Ordered deterministic procedure.**

1. Parse the tsconfig; compute the [project module](#project-module) list (sorted) and the
   [source root](#source-root).
2. Create one `ts.Program`; compute the [import edge](#import-edge) set and the
   [module dependency graph](#module-dependency-graph).
3. Classify every module's [module role](#module-role); derive the
   [graph universe](#graph-universe).
4. Compute L = [dependency locality](#dependency-locality) over graph-universe edges.
5. Compute the [semantic partition](#semantic-partition), then A =
   [partition agreement](#partition-agreement).
6. Compute R = [role predictability](#role-predictability) over all modules.
7. Compute N = [name agreement](#name-agreement) over all modules with exports.
8. Compute E = [subtree encapsulation](#subtree-encapsulation).
9. Compute Y = [directory acyclicity](#directory-acyclicity).
10. Compute every test's [test subject](#test-subject), then T =
    [test placement correspondence](#test-placement-correspondence).
11. Combine into the [semantic organization score](#semantic-organization-score).
12. Emit the [measurement record](#measurement-record) with the decomposition, counts, inputs
    digest, export inventory digest, environment, and timestamp.

**Measurement implementation:**

```ts
import { createHash } from "node:crypto"
import ts from "typescript"

export type ModuleRole =
  | "test"
  | "barrel"
  | "entrypoint"
  | "service"
  | "layer"
  | "error"
  | "schema"
  | "types"
  | "logic"
export type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}

// Predicates established in ## Definitions:
declare function projectModules(tsconfigPath: string): ReadonlyArray<string>
declare function sourceRoot(tsconfigPath: string): string
declare function importEdges(program: ts.Program): ReadonlyArray<readonly [string, string]>
declare function moduleRole(
  program: ts.Program,
  file: ts.SourceFile,
  importerCount: number
): ModuleRole
declare function graphUniverse(
  modules: ReadonlyArray<string>,
  edges: ReadonlyArray<readonly [string, string]>,
  roleOf: ReadonlyMap<string, ModuleRole>
): {
  readonly modules: ReadonlyArray<string>
  readonly edges: ReadonlyArray<readonly [string, string]>
}
declare function dependencyLocality(
  edges: ReadonlyArray<readonly [string, string]>,
  root: string
): number
declare function semanticPartition(
  modules: ReadonlyArray<string>,
  edges: ReadonlyArray<readonly [string, string]>
): ReadonlyArray<ReadonlyArray<string>>
declare function partitionAgreement(
  modules: ReadonlyArray<string>,
  components: ReadonlyArray<ReadonlyArray<string>>,
  root: string
): number
declare function rolePredictability(
  modules: ReadonlyArray<string>,
  roleOf: ReadonlyMap<string, ModuleRole>
): number
declare function nameAgreement(program: ts.Program, modules: ReadonlyArray<string>): number
declare function subtreeEncapsulation(
  modules: ReadonlyArray<string>,
  edges: ReadonlyArray<readonly [string, string]>,
  root: string
): number
declare function directoryAcyclicity(
  modules: ReadonlyArray<string>,
  edges: ReadonlyArray<readonly [string, string]>,
  root: string
): number
declare function testSubject(
  program: ts.Program,
  testModule: string,
  resolveTarget: (specifier: string) => string | undefined
): string | undefined
declare function testPlacementCorrespondence(
  pairs: ReadonlyArray<readonly [test: string, subject: string]>,
  rootParent: string
): number
declare function semanticOrganizationScore(components: Components): number
declare function exportedDeclarations(
  program: ts.Program,
  file: ts.SourceFile
): ReadonlyArray<{ readonly name: string; readonly typeOnly: boolean }>

export type Measurement = {
  readonly value: number
  readonly components: Components
  readonly moduleList: ReadonlyArray<string>
  readonly inputsDigest: string
  readonly exportInventoryDigest: string
}

export function measure(tsconfigPath: string): Measurement {
  // step 1: inputs
  const modules = projectModules(tsconfigPath)
  const root = sourceRoot(tsconfigPath)
  const host: ts.ParseConfigFileHost = {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: () => {}
  }
  const parsed = ts.getParsedCommandLineOfConfigFile(tsconfigPath, undefined, host)
  const program = ts.createProgram(modules, {
    ...(parsed?.options ?? ts.getDefaultCompilerOptions()),
    noEmit: true
  })
  // step 2: edges
  const edges = importEdges(program)
  const importerCount = new Map<string, number>(modules.map((m) => [m, 0]))
  for (const [, to] of edges) importerCount.set(to, (importerCount.get(to) ?? 0) + 1)
  // step 3: roles and universe
  const roleOf = new Map<string, ModuleRole>()
  for (const m of modules) {
    const sf = program.getSourceFile(m)
    if (sf !== undefined) roleOf.set(m, moduleRole(program, sf, importerCount.get(m) ?? 0))
  }
  const universe = graphUniverse(modules, edges, roleOf)
  // steps 4–5
  const L = dependencyLocality(universe.edges, root)
  const componentsOfGraph = semanticPartition(universe.modules, universe.edges)
  const A = partitionAgreement(universe.modules, componentsOfGraph, root)
  // steps 6–9
  const R = rolePredictability(modules, roleOf)
  const N = nameAgreement(program, modules)
  const E = subtreeEncapsulation(universe.modules, universe.edges, root)
  const Y = directoryAcyclicity(universe.modules, universe.edges, root)
  // step 10: tests
  const nonTest = new Set(universe.modules)
  const options = program.getCompilerOptions()
  const pairs: Array<readonly [string, string]> = []
  for (const t of modules.filter((m) => roleOf.get(m) === "test")) {
    const subject = testSubject(program, t, (specifier) => {
      const resolved = ts.resolveModuleName(specifier, t, options, ts.sys).resolvedModule
      if (resolved === undefined || resolved.isExternalLibraryImport === true) return undefined
      const target = ts.sys.resolvePath(resolved.resolvedFileName)
      return nonTest.has(target) ? target : undefined
    })
    if (subject !== undefined) pairs.push([t, subject] as const)
  }
  const rootParent = root.split("/").slice(0, -1).join("/") || "/"
  const T = testPlacementCorrespondence(pairs, rootParent)
  // steps 11–12: aggregate and digests
  const components: Components = { L, A, R, N, E, Y, T }
  const value = semanticOrganizationScore(components)
  const inputs = createHash("sha256")
  for (const m of modules) {
    inputs.update(m)
    inputs.update(createHash("sha256").update(ts.sys.readFile(m) ?? "").digest("hex"))
  }
  inputs.update(ts.sys.readFile(tsconfigPath) ?? "")
  inputs.update(ts.version)
  inputs.update("protocol:1")
  const exportNames: Array<string> = []
  for (const m of universe.modules) {
    const sf = program.getSourceFile(m)
    if (sf === undefined) continue
    for (const e of exportedDeclarations(program, sf)) exportNames.push(`${e.name}`)
  }
  const exportInventoryDigest = `sha256:${createHash("sha256")
    .update(exportNames.sort().join("\u0000"))
    .digest("hex")}`
  return {
    value,
    components,
    moduleList: modules,
    inputsDigest: `sha256:${inputs.digest("hex")}`,
    exportInventoryDigest
  }
}
```

### Decomposition

The aggregate attributes to constituent units with the same predicates as the aggregate — every
number below is computed by the identical functions, restricted or grouped:

- **L (per edge → per module).** The locality deficit `1 − L` equals the mean of
  [normalized tree distance](#normalized-tree-distance) over graph-universe edges. Each edge's
  normalized distance is attributed half to each endpoint; a module's locality contribution is
  the sum of its half-shares. Composition law: the sum of all per-module contributions equals
  `(1 − L) · |E|`.
- **A (per directory × component).** Report the contingency table at the maximizing depth `d*`:
  for each [physical partition at depth d](#physical-partition-at-depth-d) group, its module
  count, majority [semantic partition](#semantic-partition) component, and minority members
  (mixing evidence); for each component, its spread over groups (fragmentation evidence).
  Composition law: ARI at `d*` recomputed from this table equals A.
- **R (per role).** For each [module role](#module-role) and each conditioning variable
  (directory, suffix), report the role's modal category value, its share, and the straggler
  modules. Composition law: the NMI recomputed from the reported joint counts equals R's inner
  values.
- **N (per module).** Every qualifying module's agreement value, ascending. Composition law:
  their mean is N.
- **E (per directory).** Every qualifying node's `n`, exposed count, exposed module list, and
  encapsulation. Composition law: the n-weighted mean is E.
- **Y (per SCC).** At the minimizing depth: each strongly connected component of size ≥ 2 with
  its member directories and the module-level back edges realizing it. Composition law:
  `1 − (Σ |SCC_i|) / |groups|` equals Y at that depth.
- **T (per test).** Every ([test subject](#test-subject)-bearing) test's correspondence value,
  ascending. Composition law: their mean is T.
- **Lever feeds.** The record also lists, computed with the definitions' predicates:
  every module's [misplacement distance](#misplacement-distance) (descending), all
  [divergent modules](#divergent-module), all [cross-subtree barrels](#cross-subtree-barrel),
  and all [pass-through directories](#pass-through-directory).

### Baseline and regression tracking

**Record format.** The [measurement record](#measurement-record) (schema and complete JSONC
example at its definition) is written to `docs/metrics/semantic-structure/<timestamp>.json`; the
newest committed record is the baseline.

**Comparison procedure.** Given a baseline record `b` and a candidate record `c`:

1. Reject unless `isConfirmationPair(b, c)` conditions on `protocolVersion` and
   `environment.typescript` hold ([confirmation pair](#confirmation-pair)); records under
   different pins are incomparable.
2. If `b.inputsDigest === c.inputsDigest`, require `b.value === c.value` (else the measurement
   tooling itself is broken — the [noise floor](#noise-floor) is zero).
3. Compute `Δ = c.value − b.value` and per-component deltas.
4. Evaluate every applicable invariant from
   [Invariants against gaming](#invariants-against-gaming) over the pair.

**Success criterion.**

- **Improvement:** `Δ > 0` and every applicable invariant holds.
- **Regression:** `Δ < 0`, or any invariant violated (regardless of Δ).
- **No-change:** `Δ = 0` and every applicable invariant holds.

A lever application is **confirmed** only when, additionally, the component its
`#### Effect on metric` names improved strictly (see each lever's `#### Confirmation`).

```ts
// Comparison implementation over two records:
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = {
  readonly protocolVersion: string
  readonly environment: { readonly typescript: string; readonly runtime: string }
  readonly inputsDigest: string
  readonly value: number
  readonly components: Components
}

export type Verdict = "improvement" | "regression" | "no-change"

export function compareRecords(
  baseline: Rec,
  candidate: Rec,
  invariantViolations: ReadonlyArray<string> // from the invariants section
): Verdict {
  if (
    baseline.protocolVersion !== candidate.protocolVersion ||
    baseline.environment.typescript !== candidate.environment.typescript
  ) {
    throw new Error("incomparable records: different protocol or compiler pin")
  }
  if (invariantViolations.length > 0) return "regression"
  const delta = candidate.value - baseline.value
  return delta > 0 ? "improvement" : delta < 0 ? "regression" : "no-change"
}
```

## Optimization

Levers are ordered by expected impact per unit of change risk. Every confirmation below is valid
only when its stated success criterion **and every applicable invariant** from
[Invariants against gaming](#invariants-against-gaming) hold simultaneously over the
[confirmation pair](#confirmation-pair); the shared helper `invariantViolations` referenced in
each snippet is specified there, applied with the lever's declared module delta already bound.

### Relocate misplaced modules to their dependency median

A [graph universe](#graph-universe) module with positive
[misplacement distance](#misplacement-distance) SHOULD be moved to its
[dependency median](#dependency-median), updating every import specifier that references it.

#### Applicability

The [measurement record](#measurement-record)'s decomposition lists a module with
[misplacement distance](#misplacement-distance) ≥ 1. Targets are processed in descending
[misplacement distance](#misplacement-distance) order.

#### Effect on metric

Degradation mechanism: a module attached far from its dependency context stretches every
incident [import edge](#import-edge), inflating their
[normalized tree distances](#normalized-tree-distance) and depressing
[dependency locality](#dependency-locality). Moving the module to the
[dependency median](#dependency-median) reduces the raw incident distance sum by exactly the
[misplacement distance](#misplacement-distance) `md`, so L rises by at least
`md · 2 / ((d_max + 2) · (d_max + 3) · |E|)`, where `d_max` is the largest affected edge
distance — strictly positive whenever `md ≥ 1`. [Partition agreement](#partition-agreement)
typically rises too, because the module's physical group joins its
[semantic partition](#semantic-partition) component's majority group.

#### Trade-offs

- Version-control continuity: the move breaks naive blame; detect via history tooling requiring
  `--follow` after the change.
- In-flight changesets touching the old path conflict; detect via merge conflicts on the moved
  path.
- [Partition agreement](#partition-agreement) can dip when the module's cluster genuinely lives
  elsewhere than its edges suggest (rare: edges define the cluster); detect via the A delta in
  the [confirmation pair](#confirmation-pair).

**Before:**

```ts
// file: src/util/format.ts — imported only by billing modules; misplacement distance 4
export const formatCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`
```

```ts
// file: src/billing/invoice.ts — importer reaching across the tree (distance 2)
import { formatCents } from "../util/format.js"
export const renderInvoice = (cents: number): string => `total: ${formatCents(cents)}`
```

**After:**

```ts
// file: src/billing/format.ts — moved to the dependency median (billing)
export const formatCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`
```

```ts
// file: src/billing/invoice.ts — same-directory import (distance 0)
import { formatCents } from "./format.js"
export const renderInvoice = (cents: number): string => `total: ${formatCents(cents)}`
```

#### Confirmation

Measure, apply the single move (with specifier updates), measure again. Confirmed iff
[dependency locality](#dependency-locality) strictly increased, the
[semantic organization score](#semantic-organization-score) strictly increased, and no
applicable invariant is violated — all exceeding the zero [noise floor](#noise-floor).

**Confirmation implementation:**

```ts
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = { readonly value: number; readonly components: Components }

declare function invariantViolations(before: Rec, after: Rec): ReadonlyArray<string>

export function confirmRelocation(before: Rec, after: Rec): boolean {
  return (
    invariantViolations(before, after).length === 0 &&
    after.components.L > before.components.L && // targeted component strictly up
    after.value > before.value // aggregate strictly up
  )
}
```

### Collapse pass-through directories

A [pass-through directory](#pass-through-directory) crossed by at least one
[graph universe](#graph-universe) [import edge](#import-edge) MUST be collapsed: its single
child directory's subtree moves up one level and the emptied directory is deleted.

#### Applicability

The decomposition's [pass-through directory](#pass-through-directory) list contains a node `P`
such that some [import edge](#import-edge) has exactly one endpoint inside `P`'s
[directory subtree](#directory-subtree).

#### Effect on metric

Degradation mechanism: a unary, module-less directory adds one edge of
[tree distance](#tree-distance) to every crossing path while encoding no grouping decision —
pure distance without information. Collapsing it shortens every crossing edge's
[tree distance](#tree-distance) by exactly 1, so
[dependency locality](#dependency-locality) strictly increases by
`Σ_crossing (nd(d) − nd(d − 1)) / |E| > 0` where `nd(d) = d/(d+2)`.

#### Trade-offs

- Path churn on every file below the collapsed node; detect via the rename set in the
  changeset.
- [Partition agreement](#partition-agreement) can shift when the collapsed level was the
  ARI-maximizing depth; detect via the A delta in the [confirmation pair](#confirmation-pair).

**Before:**

```ts
// file: src/domain/model/user.ts — "domain" holds no modules and only one child ("model")
export interface User {
  readonly id: string
}
```

```ts
// file: src/app.ts — crossing edge with tree distance 2
import type { User } from "./domain/model/user.js"
export const greet = (u: User): string => `hi ${u.id}`
```

**After:**

```ts
// file: src/model/user.ts — the pass-through "domain" collapsed away
export interface User {
  readonly id: string
}
```

```ts
// file: src/app.ts — the same edge now has tree distance 1
import type { User } from "./model/user.js"
export const greet = (u: User): string => `hi ${u.id}`
```

#### Confirmation

Measure, collapse one [pass-through directory](#pass-through-directory), measure again.
Confirmed iff [dependency locality](#dependency-locality) strictly increased, the
[semantic organization score](#semantic-organization-score) strictly increased, the
[pass-through directory](#pass-through-directory) count decreased by one, and no applicable
invariant is violated.

**Confirmation implementation:**

```ts
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = {
  readonly value: number
  readonly components: Components
  readonly passThroughCount: number // from the decomposition's lever feeds
}

declare function invariantViolations(before: Rec, after: Rec): ReadonlyArray<string>

export function confirmCollapse(before: Rec, after: Rec): boolean {
  return (
    invariantViolations(before, after).length === 0 &&
    after.components.L > before.components.L &&
    after.passThroughCount === before.passThroughCount - 1 &&
    after.value > before.value
  )
}
```

### Restrict barrels to their own subtree

A [cross-subtree barrel](#cross-subtree-barrel) MUST stop re-exporting foreign modules: every
re-export whose target lies outside the barrel's [directory subtree](#directory-subtree) is
removed, and each consumer of those re-exports imports the target module (or the target
subtree's own entry module) directly.

#### Applicability

The decomposition's [cross-subtree barrel](#cross-subtree-barrel) list is non-empty.

#### Effect on metric

Degradation mechanism: a foreign re-export manufactures a long [import edge](#import-edge) from
the barrel to a distant module (depressing [dependency locality](#dependency-locality)) and
inserts the barrel into the [neighborhood](#neighborhood) of modules from unrelated clusters,
inflating [coupling similarity](#coupling-similarity) between strangers and merging
[semantic partition](#semantic-partition) components that the directory layout then cannot
match (depressing [partition agreement](#partition-agreement)). Removing the foreign re-export
deletes the long edge (L strictly up when the target was outside the barrel's directory) and
lets the [semantic partition](#semantic-partition) separate, raising A.

#### Trade-offs

- Consumers gain one import declaration per formerly-bundled foreign symbol; detect via total
  import-declaration count across the project.
- If consumers now deep-import a non-facade module of the foreign subtree,
  [subtree encapsulation](#subtree-encapsulation) can dip; detect via the E delta and remedy
  with [Narrow subtree import interfaces](#narrow-subtree-import-interfaces).

**Before:**

```ts
// file: src/user/index.ts — cross-subtree barrel
export * from "./user.js"
export { formatCents } from "../billing/money.js" // foreign re-export
```

```ts
// file: src/reports/summary.ts — consumer gets billing code "from user"
import { formatCents } from "../user/index.js"
export const line = (cents: number): string => formatCents(cents)
```

**After:**

```ts
// file: src/user/index.ts — re-exports only descendants
export * from "./user.js"
```

```ts
// file: src/reports/summary.ts — consumer imports the true location
import { formatCents } from "../billing/money.js"
export const line = (cents: number): string => formatCents(cents)
```

#### Confirmation

Measure, strip one barrel's foreign re-exports and retarget consumers, measure again. Confirmed
iff the [cross-subtree barrel](#cross-subtree-barrel) count strictly decreased, the
[semantic organization score](#semantic-organization-score) strictly increased, and no
applicable invariant is violated.

**Confirmation implementation:**

```ts
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = {
  readonly value: number
  readonly components: Components
  readonly crossSubtreeBarrelCount: number // from the decomposition's lever feeds
}

declare function invariantViolations(before: Rec, after: Rec): ReadonlyArray<string>

export function confirmBarrelRestriction(before: Rec, after: Rec): boolean {
  return (
    invariantViolations(before, after).length === 0 &&
    after.crossSubtreeBarrelCount < before.crossSubtreeBarrelCount &&
    after.value > before.value
  )
}
```

### Dissolve grab-bag directories

A directory whose attached modules share no dependency context SHOULD be dissolved by relocating
each attached module to its [dependency median](#dependency-median).

#### Applicability

A [directory tree](#directory-tree) node has ≥ 2 attached [graph universe](#graph-universe)
modules, no [import edge](#import-edge) joins any two modules of its
[directory subtree](#directory-subtree), and the maximum pairwise
[coupling similarity](#coupling-similarity) between attached modules is < τ (1/3). All three
conditions are decidable from the recorded edge set and similarity values.

#### Effect on metric

Degradation mechanism: a grab-bag (`util/`, `helpers/`, `misc/`) is a physical group whose
members the [semantic partition](#semantic-partition) scatters across components, contributing
a maximally impure contingency row (depressing
[partition agreement](#partition-agreement)) while every member's edges reach into its real
cluster's directory (depressing [dependency locality](#dependency-locality)). Relocating each
member to its [dependency median](#dependency-median) removes the impure row entirely and
reduces the raw distance sum by the sum of the members'
[misplacement distances](#misplacement-distance): both A and L rise.

#### Trade-offs

- Same churn profile as
  [Relocate misplaced modules to their dependency median](#relocate-misplaced-modules-to-their-dependency-median),
  multiplied by the directory's module count.
- A member with no incident edges has no [dependency median](#dependency-median) and stays;
  the directory may survive smaller. Detect: grab-bag count in the decomposition.

**Before:**

```ts
// file: src/util/format.ts — used only by billing
export const formatCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`
```

```ts
// file: src/util/session.ts — used only by auth; no edge or shared neighbor with format.ts
export const sessionKey = (userId: string): string => `session:${userId}`
```

**After:**

```ts
// file: src/billing/format.ts — moved to its dependency median
export const formatCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`
```

```ts
// file: src/auth/session.ts — moved to its dependency median; src/util deleted
export const sessionKey = (userId: string): string => `session:${userId}`
```

#### Confirmation

Measure, dissolve one grab-bag directory, measure again. Confirmed iff
[dependency locality](#dependency-locality) strictly increased,
[partition agreement](#partition-agreement) did not decrease, the aggregate strictly increased,
and no applicable invariant is violated.

**Confirmation implementation:**

```ts
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = { readonly value: number; readonly components: Components }

declare function invariantViolations(before: Rec, after: Rec): ReadonlyArray<string>

export function confirmGrabBagDissolution(before: Rec, after: Rec): boolean {
  return (
    invariantViolations(before, after).length === 0 &&
    after.components.L > before.components.L &&
    after.components.A >= before.components.A &&
    after.value > before.value
  )
}
```

### Co-locate fragmented semantic clusters

A [semantic partition](#semantic-partition) component whose members are physically scattered
SHOULD be co-located: every member moves into the component's plurality physical group.

#### Applicability

At the [partition agreement](#partition-agreement)-maximizing depth `d*`, some
[semantic partition](#semantic-partition) component of size ≥ 3 has no
[physical partition at depth d](#physical-partition-at-depth-d) group containing at least half
of its members. The move target is the group holding the plurality of members; ties break to
the group of the lexicographically smallest member.

#### Effect on metric

Degradation mechanism: a feature's modules spread over several directories split one semantic
component across several contingency cells, capping
[partition agreement](#partition-agreement), while intra-component
[import edges](#import-edge) span directories, depressing
[dependency locality](#dependency-locality). Consolidation concentrates the component in one
cell (A strictly up at `d*`) and zeroes the [tree distance](#tree-distance) of intra-component
edges into the target group (L up).

#### Trade-offs

- The target directory grows; the balance invariant bounds this by the component's own size
  (see [Invariants against gaming](#invariants-against-gaming)).
- Cross-component edges from moved members lengthen when their other endpoints stay; detect via
  the per-module [misplacement distance](#misplacement-distance) list after the move.
- Multiplied path churn, as in
  [Relocate misplaced modules to their dependency median](#relocate-misplaced-modules-to-their-dependency-median).

**Before:**

```ts
// file: src/checkout/cart.ts — component {cart, pricing, discounts} scattered
import { applyDiscount } from "../promo/discounts.js"
import { price } from "../pricing/pricing.js"
export const total = (base: number): number => applyDiscount(price(base))
```

```ts
// file: src/pricing/pricing.ts
export const price = (base: number): number => base * 1.2
```

```ts
// file: src/promo/discounts.ts
export const applyDiscount = (amount: number): number => amount * 0.9
```

**After:**

```ts
// file: src/checkout/cart.ts — the whole component lives in checkout/
import { applyDiscount } from "./discounts.js"
import { price } from "./pricing.js"
export const total = (base: number): number => applyDiscount(price(base))
```

```ts
// file: src/checkout/pricing.ts
export const price = (base: number): number => base * 1.2
```

```ts
// file: src/checkout/discounts.ts
export const applyDiscount = (amount: number): number => amount * 0.9
```

#### Confirmation

Measure, co-locate one component, measure again. Confirmed iff
[partition agreement](#partition-agreement) strictly increased, aggregate strictly increased,
and no applicable invariant is violated.

**Confirmation implementation:**

```ts
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = { readonly value: number; readonly components: Components }

declare function invariantViolations(before: Rec, after: Rec): ReadonlyArray<string>

export function confirmColocation(before: Rec, after: Rec): boolean {
  return (
    invariantViolations(before, after).length === 0 &&
    after.components.A > before.components.A &&
    after.value > before.value
  )
}
```

### Split semantically mixed directories

A directory whose modules span several [semantic partition](#semantic-partition) components
SHOULD be split into one directory per component.

#### Applicability

At the [partition agreement](#partition-agreement)-maximizing depth `d*`, some
[physical partition at depth d](#physical-partition-at-depth-d) group contains members of ≥ 2
[semantic partition](#semantic-partition) components with ≥ 2 members each. (The
[source root](#source-root) itself qualifying at `d* = 1` is the everything-in-one-directory
case.)

#### Effect on metric

Degradation mechanism: a mixed directory is one contingency row spanning several components;
ARI's index term loses every cross-component pair in that row, capping
[partition agreement](#partition-agreement). Splitting the directory by component yields pure
rows: A strictly increases toward the pairs' agreement bound. Intra-component edges keep
distance 0 (members move together); only cross-component edges inside the old directory grow
from 0 to 2.

#### Trade-offs

- [Dependency locality](#dependency-locality) dips by the (by-construction sparse)
  cross-component edges inside the old directory; detect via the L delta.
- Deeper nesting where the split creates subdirectories: external edges gain +1 distance;
  prefer sibling directories at the same depth when the old directory had no other content.
- Path churn for all moved modules.

**Before:**

```ts
// file: src/core/user.ts — "core" mixes two unrelated components
export interface User {
  readonly id: string
}
```

```ts
// file: src/core/render.ts — no edge or shared neighbor with user.ts
export const render = (html: string): string => html.trim()
```

**After:**

```ts
// file: src/user/user.ts — one directory per semantic component
export interface User {
  readonly id: string
}
```

```ts
// file: src/render/render.ts
export const render = (html: string): string => html.trim()
```

#### Confirmation

Measure, split one mixed directory along recorded component boundaries, measure again.
Confirmed iff [partition agreement](#partition-agreement) strictly increased, aggregate
strictly increased, and no applicable invariant is violated.

**Confirmation implementation:**

```ts
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = { readonly value: number; readonly components: Components }

declare function invariantViolations(before: Rec, after: Rec): ReadonlyArray<string>

export function confirmDirectorySplit(before: Rec, after: Rec): boolean {
  return (
    invariantViolations(before, after).length === 0 &&
    after.components.A > before.components.A &&
    after.value > before.value
  )
}
```

### Break sibling-directory cycles

Directories locked in a dependency cycle SHOULD be untangled by relocating, for the group pair's
minority direction, each edge-target module to its [dependency median](#dependency-median).

#### Applicability

[Directory acyclicity](#directory-acyclicity) < 1. The decomposition names, at the minimizing
depth, each strongly connected component, its member groups, and the module-level edges
realizing each direction. For the two groups with the fewest module-level edges in one
direction (ties: lexicographically smallest group pair, then direction with fewer edges), the
targets of that minority direction's edges are the relocation set.

#### Effect on metric

Degradation mechanism: two directories importing each other means the boundary between them
separates nothing — no reading order, no layering, no ownership is encoded, and every group in
the cycle counts against [directory acyclicity](#directory-acyclicity). Moving the minority
direction's target modules to their [dependency medians](#dependency-median) (which lie in or
above the importing group, since that is where their importers concentrate) deletes the back
edges: the SCC dissolves and Y rises by `|SCC| / |groups|` at that depth once no bidirectional
pair remains. L rises simultaneously by the moved modules'
[misplacement distances](#misplacement-distance).

#### Trade-offs

- The moved module changes conceptual home; [role predictability](#role-predictability) via the
  directory variable can dip when the source directory was role-pure; detect via the R delta.
- When both directions are heavy, relocation is large; consider whether the two directories are
  one [semantic partition](#semantic-partition) component — then
  [Co-locate fragmented semantic clusters](#co-locate-fragmented-semantic-clusters) (a merge)
  is the smaller intervention. The choice is decidable: merge iff the two groups' modules share
  one component.

**Before:**

```ts
// file: src/billing/invoice.ts
import { userName } from "../user/user.js" // billing → user
export const invoiceHeader = (id: string): string => `for ${userName(id)}`
```

```ts
// file: src/user/user.ts
export const userName = (id: string): string => `user-${id}`
```

```ts
// file: src/user/quota.ts — user → billing: the back edge (minority direction)
import { invoiceHeader } from "../billing/invoice.js"
export const quotaNote = (id: string): string => invoiceHeader(id)
```

**After:**

```ts
// file: src/billing/quota.ts — back-edge target relocated to its dependency median;
// the directory pair is now one-directional (billing → user)
import { invoiceHeader } from "./invoice.js"
export const quotaNote = (id: string): string => invoiceHeader(id)
```

```ts
// file: src/billing/invoice.ts — unchanged content
import { userName } from "../user/user.js"
export const invoiceHeader = (id: string): string => `for ${userName(id)}`
```

```ts
// file: src/user/user.ts — unchanged
export const userName = (id: string): string => `user-${id}`
```

#### Confirmation

Measure, relocate one minority-direction target set, measure again. Confirmed iff
[directory acyclicity](#directory-acyclicity) strictly increased, aggregate strictly increased,
and no applicable invariant is violated.

**Confirmation implementation:**

```ts
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = { readonly value: number; readonly components: Components }

declare function invariantViolations(before: Rec, after: Rec): ReadonlyArray<string>

export function confirmCycleBreak(before: Rec, after: Rec): boolean {
  return (
    invariantViolations(before, after).length === 0 &&
    after.components.Y > before.components.Y &&
    after.value > before.value
  )
}
```

### Split divergent modules

A [divergent module](#divergent-module) SHOULD be split into one module per consumed
export-usage component, each named from its own exports, with importers retargeted.

#### Applicability

The decomposition's [divergent module](#divergent-module) list is non-empty. The split
boundaries are the export-usage components recorded by the
[divergent module](#divergent-module) predicate.

#### Effect on metric

Degradation mechanism: a module serving disjoint consumer groups fuses their
[neighborhoods](#neighborhood): unrelated importers gain a shared neighbor, their
[coupling similarity](#coupling-similarity) crosses τ, and the
[semantic partition](#semantic-partition) merges components the directory layout rightly keeps
apart — depressing [partition agreement](#partition-agreement). Its filename also cannot cover
both export groups, depressing [name agreement](#name-agreement). Splitting restores separate
[neighborhoods](#neighborhood) (A up) and lets each fragment's stem match its exports (N up);
each fragment then has its own [dependency median](#dependency-median), enabling
[Relocate misplaced modules to their dependency median](#relocate-misplaced-modules-to-their-dependency-median)
as a follow-up.

#### Trade-offs

- Module count rises by (components − 1); the module-mass invariant requires this declared
  delta (see [Invariants against gaming](#invariants-against-gaming)).
- Importers of several fragments need several import declarations; detect via total
  import-declaration count.

**Before:**

```ts
// file: src/shared/stuff.ts — divergent: billing imports only parseInvoice,
// auth imports only hashPassword; no internal reference joins them
export const parseInvoice = (raw: string): number => raw.length
export const hashPassword = (pw: string): string => pw.split("").reverse().join("")
```

**After:**

```ts
// file: src/shared/parseInvoice.ts — one consumed component per module,
// stem drawn from its exports
export const parseInvoice = (raw: string): number => raw.length
```

```ts
// file: src/shared/hashPassword.ts
export const hashPassword = (pw: string): string => pw.split("").reverse().join("")
```

#### Confirmation

Measure, split one [divergent module](#divergent-module), measure again. Confirmed iff the
[divergent module](#divergent-module) count strictly decreased,
[partition agreement](#partition-agreement) did not decrease, aggregate strictly increased, and
no applicable invariant is violated (the declared module-count delta equals the component
count minus one).

**Confirmation implementation:**

```ts
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = {
  readonly value: number
  readonly components: Components
  readonly divergentModuleCount: number // from the decomposition's lever feeds
}

declare function invariantViolations(before: Rec, after: Rec): ReadonlyArray<string>

export function confirmDivergentSplit(before: Rec, after: Rec): boolean {
  return (
    invariantViolations(before, after).length === 0 &&
    after.divergentModuleCount < before.divergentModuleCount &&
    after.components.A >= before.components.A &&
    after.value > before.value
  )
}
```

### Rename files to their exports

A module whose stem is not evidenced by its exports SHOULD be renamed so its stem is composed of
[name tokens](#name-token) of its dominant export.

#### Applicability

The decomposition's per-module [name agreement](#name-agreement) list contains a module with
agreement < 1/2. The dominant export is the [exported declaration](#exported-declaration)
referenced by the most importers; ties break to the lexicographically smallest export name. The
new stem joins the dominant export's [name tokens](#name-token) in camel case.

#### Effect on metric

Degradation mechanism: a stem whose tokens no export evidences (`helpers.ts`, `stuff.ts`,
`utils2.ts`) forces readers to open the file to learn its contents — exactly the failure
[name agreement](#name-agreement) counts. Renaming to the dominant export's tokens raises that
module's agreement to 1, raising N by `(1 − old) / |qualifying modules|`.

#### Trade-offs

- Every importer's specifier changes; detect via the changeset.
- The suffix variable of [role predictability](#role-predictability) can shift when the old
  (bad) stem accidentally carried the role's modal suffix; detect via the R delta.
- Blame continuity, as with any rename.

**Before:**

```ts
// file: src/billing/helpers.ts — stem tokens {helpers}; export tokens
// {parse, invoice}; agreement 0
export const parseInvoice = (raw: string): number => raw.length
```

**After:**

```ts
// file: src/billing/parseInvoice.ts — stem tokens {parse, invoice} ⊆ export tokens;
// agreement 1. Exports themselves are unchanged (the export-inventory invariant).
export const parseInvoice = (raw: string): number => raw.length
```

#### Confirmation

Measure, rename one file (specifiers updated, exports untouched), measure again. Confirmed iff
[name agreement](#name-agreement) strictly increased, aggregate strictly increased, the
export-inventory digest is unchanged, and no applicable invariant is violated.

**Confirmation implementation:**

```ts
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = {
  readonly value: number
  readonly components: Components
  readonly exportInventoryDigest: string
}

declare function invariantViolations(before: Rec, after: Rec): ReadonlyArray<string>

export function confirmRename(before: Rec, after: Rec): boolean {
  return (
    invariantViolations(before, after).length === 0 &&
    after.components.N > before.components.N &&
    after.exportInventoryDigest === before.exportInventoryDigest &&
    after.value > before.value
  )
}
```

### Harmonize role naming schemes

Stragglers from a role's dominant filename-suffix scheme SHOULD be renamed to the modal suffix
of that [module role](#module-role).

#### Applicability

From the [role predictability](#role-predictability) decomposition, for the suffix variable:
some [module role](#module-role) with ≥ 3 modules has a modal last-[name token](#name-token)
whose share `p` satisfies `1/2 < p < 1`. The stragglers (modules of that role with a different
last token) are the rename set: each keeps its other stem tokens and gains the modal token as
its final token.

#### Effect on metric

Degradation mechanism: a role named `*Service.ts` in nine files and `userSvc.ts` in the tenth
makes the scheme unreliable — the conditional distribution `p(suffix | role)` flattens, lowering
`I(role; suffix)` and therefore [role predictability](#role-predictability). Renaming
stragglers to the modal token sharpens the conditional toward a point mass: R strictly
increases (mutual information is strictly larger when a conditional merges toward the mode,
entropies held comparable).

#### Trade-offs

- [Name agreement](#name-agreement) can dip when the appended modal token is not among the
  module's export tokens; detect via the N delta (usually nil: a `service`-role module's
  exports carry the service's name).
- Importer specifier churn, as with any rename.

**Before:**

```ts
// file: src/user/userSvc.ts — role "service"; last stem token "svc" while the
// role's modal last token in this project is "service" (share 0.9)
import { Context } from "effect"
export class UserService extends Context.Service<
  UserService,
  { readonly byId: (id: string) => string }
>()("UserService") {}
```

**After:**

```ts
// file: src/user/userService.ts — straggler renamed to the modal suffix
import { Context } from "effect"
export class UserService extends Context.Service<
  UserService,
  { readonly byId: (id: string) => string }
>()("UserService") {}
```

#### Confirmation

Measure, rename the stragglers of one role, measure again. Confirmed iff
[role predictability](#role-predictability) strictly increased, aggregate strictly increased,
and no applicable invariant is violated.

**Confirmation implementation:**

```ts
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = { readonly value: number; readonly components: Components }

declare function invariantViolations(before: Rec, after: Rec): ReadonlyArray<string>

export function confirmSuffixHarmonization(before: Rec, after: Rec): boolean {
  return (
    invariantViolations(before, after).length === 0 &&
    after.components.R > before.components.R &&
    after.value > before.value
  )
}
```

### Separate service keys from layer wiring

A module exporting both an Effect service key and a `Layer`, at least one of whose importers
references only the key, SHOULD be split: the key stays; the layer moves to a sibling module
named from the layer export.

#### Applicability

A [graph universe](#graph-universe) module has [module role](#module-role) `service`, also has a
non-type-only [exported declaration](#exported-declaration) whose resolved type carries the
`"~effect/Layer"` brand, and at least one importer's referenced-export set (the same
checker-resolved sets used by the [divergent module](#divergent-module) predicate) contains a
service-branded export and no layer-branded export.

#### Effect on metric

Degradation mechanism: fusing interface and wiring makes every key-only consumer a graph
neighbor of the layer's implementation dependencies; their
[coupling similarity](#coupling-similarity) to unrelated infrastructure crosses τ and the
[semantic partition](#semantic-partition) glues consumer clusters to implementation clusters
that no directory layout can simultaneously match — depressing
[partition agreement](#partition-agreement). After the split, the key module's
[neighborhood](#neighborhood) holds consumers, the layer module's holds implementation inputs
and the composition root: A rises; the layer module also becomes independently relocatable
toward its [dependency median](#dependency-median).

#### Trade-offs

- Module count rises by one (declared delta for the module-mass invariant).
- Composition roots must import the layer from its new module; one extra import declaration.
- The Effect convenience of one-stop `import { Clock, ClockLive }` is lost; detect via total
  import-declaration count.

**Before:**

```ts
// file: src/clock/clock.ts — key and layer fused; key-only consumers drag the wiring
import { Context, Layer } from "effect"
export class Clock extends Context.Service<Clock, { readonly now: () => number }>()("Clock") {}
export const ClockLive = Layer.succeed(Clock, { now: () => Date.now() })
```

```ts
// file: src/scheduler/scheduler.ts — references only the key
import { Effect } from "effect"
import { Clock } from "../clock/clock.js"
export const timestamp = Effect.gen(function* () {
  const clock = yield* Clock
  return clock.now()
})
```

**After:**

```ts
// file: src/clock/clock.ts — interface only
import { Context } from "effect"
export class Clock extends Context.Service<Clock, { readonly now: () => number }>()("Clock") {}
```

```ts
// file: src/clock/clockLive.ts — wiring only; imported by the composition root alone
import { Layer } from "effect"
import { Clock } from "./clock.js"
export const ClockLive = Layer.succeed(Clock, { now: () => Date.now() })
```

```ts
// file: src/scheduler/scheduler.ts — unchanged consumer, now decoupled from wiring
import { Effect } from "effect"
import { Clock } from "../clock/clock.js"
export const timestamp = Effect.gen(function* () {
  const clock = yield* Clock
  return clock.now()
})
```

#### Confirmation

Measure, split one fused service module, measure again. Confirmed iff
[partition agreement](#partition-agreement) strictly increased (or, when the partition was
already separated at every depth, aggregate alone) — criterion: A not down, aggregate strictly
up, declared module delta +1, and no applicable invariant violated.

**Confirmation implementation:**

```ts
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = {
  readonly value: number
  readonly components: Components
  readonly counts: { readonly graphModules: number }
}

declare function invariantViolations(before: Rec, after: Rec): ReadonlyArray<string>

export function confirmServiceLayerSplit(before: Rec, after: Rec): boolean {
  return (
    invariantViolations(before, after).length === 0 &&
    after.components.A >= before.components.A &&
    after.counts.graphModules === before.counts.graphModules + 1 &&
    after.value > before.value
  )
}
```

### Narrow subtree import interfaces

A [directory subtree](#directory-subtree) deep-imported through many of its modules SHOULD gain
an entry module re-exporting exactly the externally referenced exports, with external importers
retargeted to it.

#### Applicability

The [subtree encapsulation](#subtree-encapsulation) decomposition lists a qualifying node with
exposed count ≥ 3. The entry module's re-export list is the union of externally referenced
exports of the exposed modules (checker-resolved, as in the
[divergent module](#divergent-module) predicate); internal modules never import the entry
module.

#### Effect on metric

Degradation mechanism: when outside code reaches individual internals, the subtree has no
interface — every internal move breaks external importers, and the exposed count drives
encapsulation toward 0. Retargeting external edges onto one entry module reduces the exposed
count to 1, raising that node's encapsulation to 1 and
[subtree encapsulation](#subtree-encapsulation) by `n · (1 − enc_before) / Σ n` of the
qualifying weight.

#### Trade-offs

- The entry module is a within-subtree barrel: importing it loads every re-exported module at
  runtime; detect via the module graph fan-out of the entry module.
- Cycle risk if an internal module ever imports the entry module; detect: the module-level
  strongly-connected-component count must not increase across the pair.
- One extra module (declared delta), and the entry module's own edges are same-directory
  (distance 0), so L is unaffected or slightly up.

**Before:**

```ts
// file: src/reports/summary.ts — external code deep-imports three user internals
import { User } from "../user/model.js"
import { makeUserRepo } from "../user/repo.js"
import { userName } from "../user/format.js"
export const summary = (u: User): string => `${userName(u.id)} ${makeUserRepo().size}`
```

**After:**

```ts
// file: src/user/index.ts — entry module re-exporting exactly the used exports
export { User } from "./model.js"
export { makeUserRepo } from "./repo.js"
export { userName } from "./format.js"
```

```ts
// file: src/reports/summary.ts — one boundary crossing, one facade
import { makeUserRepo, User, userName } from "../user/index.js"
export const summary = (u: User): string => `${userName(u.id)} ${makeUserRepo().size}`
```

#### Confirmation

Measure, add one entry module and retarget that subtree's external importers, measure again.
Confirmed iff [subtree encapsulation](#subtree-encapsulation) strictly increased, aggregate
strictly increased, module-level SCC count did not increase, and no applicable invariant is
violated.

**Confirmation implementation:**

```ts
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = {
  readonly value: number
  readonly components: Components
  readonly moduleSccCount: number // module-level SCCs of size ≥ 2, from the decomposition
}

declare function invariantViolations(before: Rec, after: Rec): ReadonlyArray<string>

export function confirmInterfaceNarrowing(before: Rec, after: Rec): boolean {
  return (
    invariantViolations(before, after).length === 0 &&
    after.components.E > before.components.E &&
    after.moduleSccCount <= before.moduleSccCount &&
    after.value > before.value
  )
}
```

### Align test placement with subjects

A test whose path shares little vocabulary with its [test subject](#test-subject) SHOULD be
moved or renamed so its stop-token-stripped path tokens match the subject's.

#### Applicability

The [test placement correspondence](#test-placement-correspondence) decomposition lists a test
with correspondence < 1/2. The target scheme is decided deterministically: among tests with
correspondence ≥ 1/2, count those co-located with their subject (same
[module directory](#module-directory)) versus mirrored (different directory); the majority
scheme wins, ties go to mirrored. The new path applies that scheme to the subject's path.

#### Effect on metric

Degradation mechanism: a test named and placed without its subject's vocabulary
(`tests/misc/checks.test.ts` for `src/user/user.ts`) cannot be found from the subject nor
traced back from a failure without opening it. Re-placing it makes the token sets coincide,
raising that test's correspondence toward 1 and
[test placement correspondence](#test-placement-correspondence) by
`(new − old) / |tests with subjects|`.

#### Trade-offs

- Test-runner globs may need widening when the scheme moves tests between `tests/` and `src/`;
  detect: the record's test count must be unchanged across the pair (a shrinking test count
  means the runner or tsconfig lost files).
- Path churn in CI configuration referencing individual test files.

**Before:**

```ts
// file: tests/misc/checks.test.ts — subject is src/user/user.ts; token sets
// {misc, checks} vs {user}: correspondence 0
import { expect, test } from "bun:test"
import { userName } from "../../src/user/user.js"
test("names users", () => {
  expect(userName("1")).toBe("user-1")
})
```

**After:**

```ts
// file: tests/user/user.test.ts — mirrored scheme; token sets {user} vs {user}:
// correspondence 1
import { expect, test } from "bun:test"
import { userName } from "../../src/user/user.js"
test("names users", () => {
  expect(userName("1")).toBe("user-1")
})
```

#### Confirmation

Measure, re-place one test, measure again. Confirmed iff
[test placement correspondence](#test-placement-correspondence) strictly increased, the test
count is unchanged, aggregate strictly increased, and no applicable invariant is violated.

**Confirmation implementation:**

```ts
type Components = {
  readonly L: number
  readonly A: number
  readonly R: number
  readonly N: number
  readonly E: number
  readonly Y: number
  readonly T: number
}
type Rec = {
  readonly value: number
  readonly components: Components
  readonly counts: { readonly tests: number }
}

declare function invariantViolations(before: Rec, after: Rec): ReadonlyArray<string>

export function confirmTestAlignment(before: Rec, after: Rec): boolean {
  return (
    invariantViolations(before, after).length === 0 &&
    after.components.T > before.components.T &&
    after.counts.tests === before.counts.tests &&
    after.value > before.value
  )
}
```

### Diagnostic procedure

A deterministic mapping from a [measurement record](#measurement-record) and its
[decomposition](#decomposition) to the ordered list of applicable levers:

1. Evaluate each lever's `#### Applicability` predicate against the record's decomposition, in
   the order the levers appear above (impact per unit risk).
2. For each applicable lever, order its targets by contribution, descending:
   [misplacement distance](#misplacement-distance) for relocation and grab-bag dissolution;
   crossing-edge count for pass-through collapse; foreign re-export count for barrel
   restriction; component size for co-location and directory splits; SCC size for cycle breaks;
   consumed-component count for divergent splits; `1 − agreement` for renames; straggler count
   for suffix harmonization; key-only importer count for service/layer splits; exposed count
   for interface narrowing; `1 − correspondence` for test alignment. Ties break
   lexicographically by path.
3. Emit the flat list of (lever, target) pairs; apply the first entry, produce the
   [confirmation pair](#confirmation-pair), and re-run the diagnostic on the after record.

```ts
// Diagnostic implementation over the recorded decomposition:
export type Decomposition = {
  readonly misplacements: ReadonlyArray<{ readonly module: string; readonly distance: number }>
  readonly passThrough: ReadonlyArray<{ readonly dir: string; readonly crossingEdges: number }>
  readonly crossSubtreeBarrels: ReadonlyArray<{ readonly module: string; readonly foreign: number }>
  readonly grabBags: ReadonlyArray<{ readonly dir: string; readonly totalMisplacement: number }>
  readonly fragmentedComponents: ReadonlyArray<{ readonly label: string; readonly size: number }>
  readonly mixedDirectories: ReadonlyArray<{ readonly dir: string; readonly components: number }>
  readonly directorySccs: ReadonlyArray<{ readonly members: ReadonlyArray<string> }>
  readonly divergentModules: ReadonlyArray<{ readonly module: string; readonly consumed: number }>
  readonly lowNameAgreement: ReadonlyArray<{ readonly module: string; readonly agreement: number }>
  readonly suffixStragglers: ReadonlyArray<{ readonly role: string; readonly stragglers: number }>
  readonly fusedServices: ReadonlyArray<{ readonly module: string; readonly keyOnlyImporters: number }>
  readonly exposedSubtrees: ReadonlyArray<{ readonly dir: string; readonly exposed: number }>
  readonly adriftTests: ReadonlyArray<{ readonly test: string; readonly correspondence: number }>
}

export type Diagnostic = { readonly lever: string; readonly target: string; readonly weight: number }

export function diagnose(d: Decomposition): ReadonlyArray<Diagnostic> {
  const out: Array<Diagnostic> = []
  const push = (
    lever: string,
    items: ReadonlyArray<{ readonly target: string; readonly weight: number }>
  ): void => {
    const sorted = [...items].sort(
      (a, b) => b.weight - a.weight || (a.target < b.target ? -1 : 1)
    )
    for (const item of sorted) out.push({ lever, ...item })
  }
  push("relocate-to-dependency-median", d.misplacements
    .filter((m) => m.distance >= 1)
    .map((m) => ({ target: m.module, weight: m.distance })))
  push("collapse-pass-through", d.passThrough
    .filter((p) => p.crossingEdges >= 1)
    .map((p) => ({ target: p.dir, weight: p.crossingEdges })))
  push("restrict-barrels", d.crossSubtreeBarrels
    .map((b) => ({ target: b.module, weight: b.foreign })))
  push("dissolve-grab-bag", d.grabBags
    .map((g) => ({ target: g.dir, weight: g.totalMisplacement })))
  push("co-locate-cluster", d.fragmentedComponents
    .filter((c) => c.size >= 3)
    .map((c) => ({ target: c.label, weight: c.size })))
  push("split-mixed-directory", d.mixedDirectories
    .filter((m) => m.components >= 2)
    .map((m) => ({ target: m.dir, weight: m.components })))
  push("break-directory-cycle", d.directorySccs
    .map((s) => ({ target: s.members[0] ?? "", weight: s.members.length })))
  push("split-divergent-module", d.divergentModules
    .map((m) => ({ target: m.module, weight: m.consumed })))
  push("rename-to-exports", d.lowNameAgreement
    .filter((m) => m.agreement < 0.5)
    .map((m) => ({ target: m.module, weight: 1 - m.agreement })))
  push("harmonize-suffix", d.suffixStragglers
    .map((s) => ({ target: s.role, weight: s.stragglers })))
  push("separate-key-from-layer", d.fusedServices
    .map((f) => ({ target: f.module, weight: f.keyOnlyImporters })))
  push("narrow-subtree-interface", d.exposedSubtrees
    .filter((e) => e.exposed >= 3)
    .map((e) => ({ target: e.dir, weight: e.exposed })))
  push("align-test-placement", d.adriftTests
    .filter((t) => t.correspondence < 0.5)
    .map((t) => ({ target: t.test, weight: 1 - t.correspondence })))
  return out
}
```

## Invariants against gaming

Each entry names a transformation that raises the
[semantic organization score](#semantic-organization-score) without improving the property, and
the invariant or companion measurement that rejects it. The invariant statistics below —
per-module export counts, stem token counts, unreferenced import bindings, largest-directory
share, largest-component share, and module-level SCC count — are computed during step 12 of the
[Procedure](#procedure) with the definitions' own predicates and stored in the record's
[decomposition](#decomposition), so every invariant is decidable from a
[confirmation pair](#confirmation-pair) alone. **A confirmation is valid only when the lever's
primary success criterion and every applicable invariant hold simultaneously**; the
`invariantViolations` helper referenced by every lever confirmation returns the names of the
violated invariants below.

1. **Deleting covered functionality.** Deleting modules or exports removes long
   [import edges](#import-edge) and impure directories, raising L and A while destroying
   behavior. *Invariant I1 — export inventory preservation:* the record's
   `exportInventoryDigest` (SHA-256 over the sorted multiset of
   [exported declaration](#exported-declaration) names of the [graph universe](#graph-universe))
   must be equal across the pair. No lever in this document adds, removes, or renames an
   [exported declaration](#exported-declaration).
2. **Renaming exports to match bad filenames.** Renaming `parseInvoice` to `helpers` makes
   `helpers.ts` score 1 on [name agreement](#name-agreement) without informing anyone.
   *Rejected by I1:* the export-name multiset changed.
3. **Merging everything into few files.** Concatenating modules erases
   [import edges](#import-edge) (L → 1) and exposure (E → 1) while making every file a
   grab-bag. *Invariant I2 — module mass:* the [graph universe](#graph-universe) module count
   may change only by the lever's declared delta (+k for splits and entry modules, 0
   otherwise), and the maximum
   [exported declaration](#exported-declaration) count per module must not increase.
4. **Flattening or mega-merging directories.** Moving every module into one directory zeroes
   all distances (L → 1) and hides directory cycles (Y → 1). *Invariant I3 — directory
   balance:* the largest [module directory](#module-directory)'s share of
   [graph universe](#graph-universe) modules must not exceed the larger of its before-value and
   the largest [semantic partition](#semantic-partition) component's share — a directory may
   not grow beyond the biggest real cluster. (When the whole project is one genuine cluster,
   one directory is an honest layout and the invariant permits it.)
5. **Dead imports shaping neighborhoods or test subjects.** Adding unused imports manufactures
   [coupling similarity](#coupling-similarity) (bending the
   [semantic partition](#semantic-partition) toward the existing layout) or reweights a
   [test subject](#test-subject). *Invariant I4 — live import hygiene:* the count of imported
   bindings with zero references in the importing module (checker-resolved, the compiler's
   unused-import analysis) must not increase across the pair.
6. **Shrinking the measured universe.** Excluding awkward files from the tsconfig removes their
   penalty without organizing anything. *Invariant I5 — universe integrity:* the set difference
   between the two records' `moduleList`s must equal exactly the lever's declared
   moves, renames, and splits (a bijection plus declared additions); any undeclared
   disappearance is a violation. Cost cannot leave the boundary silently.
7. **Token-stuffing filenames.** Naming a file after every export
   (`parseInvoiceAndHashPasswordAndRender.ts`) scores [name agreement](#name-agreement) 1 while
   destroying scanability. *Invariant I6 — stem economy:* the 95th percentile of per-module
   stem [name token](#name-token) count must not increase across the pair.
8. **Exporting cost to a sibling package.** Moving disorganized modules into another workspace
   package removes them from this project's record. *Invariant I7 — workspace closure:* when
   `moduleList` shrinks by modules that reappear in another workspace project, the
   [confirmation pair](#confirmation-pair) must be formed over the union measurement of all
   workspace tsconfigs (the metric's stated multi-project domain), where the move is internal
   and I5 applies to the union.
9. **Overfitting to fixed inputs.** Not applicable by construction: the metric has no sampled
   workload, seed, or fixture to overfit — its input is the entire project, and every
   transformation of the project is, by definition, inside the measurement boundary. The only
   boundary crossings are files leaving the tsconfig (I5) or the workspace (I7).

```ts
// Combined invariant evaluation over a confirmation pair:
export type InvariantStats = {
  readonly exportInventoryDigest: string
  readonly graphModules: number
  readonly maxExportsPerModule: number
  readonly largestDirectoryShare: number
  readonly largestComponentShare: number
  readonly unreferencedImportBindings: number
  readonly p95StemTokenCount: number
  readonly moduleList: ReadonlyArray<string>
}

export type DeclaredDelta = {
  readonly addedModules: ReadonlyArray<string> // splits, entry modules
  readonly renamed: ReadonlyArray<readonly [from: string, to: string]> // moves and renames
}

export function invariantViolations(
  before: InvariantStats,
  after: InvariantStats,
  declared: DeclaredDelta
): ReadonlyArray<string> {
  const violations: Array<string> = []
  // I1 — export inventory preservation
  if (after.exportInventoryDigest !== before.exportInventoryDigest) {
    violations.push("I1: export inventory changed")
  }
  // I2 — module mass
  if (after.graphModules !== before.graphModules + declared.addedModules.length) {
    violations.push("I2: undeclared module count change")
  }
  if (after.maxExportsPerModule > before.maxExportsPerModule) {
    violations.push("I2: a module absorbed exports")
  }
  // I3 — directory balance
  const shareBound = Math.max(before.largestDirectoryShare, after.largestComponentShare)
  if (after.largestDirectoryShare > shareBound) {
    violations.push("I3: a directory outgrew the largest semantic cluster")
  }
  // I4 — live import hygiene
  if (after.unreferencedImportBindings > before.unreferencedImportBindings) {
    violations.push("I4: unused imports increased")
  }
  // I5 — universe integrity
  const renamedFrom = new Set(declared.renamed.map(([from]) => from))
  const renamedTo = new Set(declared.renamed.map(([, to]) => to))
  const added = new Set(declared.addedModules)
  const beforeSet = new Set(before.moduleList)
  const afterSet = new Set(after.moduleList)
  for (const m of before.moduleList) {
    if (!afterSet.has(m) && !renamedFrom.has(m)) {
      violations.push(`I5: undeclared disappearance: ${m}`)
    }
  }
  for (const m of after.moduleList) {
    if (!beforeSet.has(m) && !renamedTo.has(m) && !added.has(m)) {
      violations.push(`I5: undeclared appearance: ${m}`)
    }
  }
  // I6 — stem economy
  if (after.p95StemTokenCount > before.p95StemTokenCount) {
    violations.push("I6: filename token stuffing")
  }
  // I7 is procedural: cross-workspace moves require measuring the workspace union,
  // at which point I5 over the union detects silent departures.
  return violations
}
```
