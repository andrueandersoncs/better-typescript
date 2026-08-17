# Readability measurement and optimization

## Informal definition

Readability is the effort a competent maintainer — fluent in TypeScript and Effect but new to this
repository — must spend to correctly reconstruct three facts about a region of code from its source
alone: what it computes, what it can fail with, and what it needs from its environment. The
property improves when that reconstruction requires fewer simultaneous facts held in working memory
and fewer jumps away from the code being read. It degrades when understanding demands tracking deep
nesting, long combinator chains, mutable or shadowed state, failure paths that the types do not
show, or symbols whose meaning lives far from their point of use.

Readability is naturally expressed as a cost — points of comprehension work — attributed to
functions, summed over modules, and summed again over the project; smaller is better. It excludes
runtime performance, functional correctness, whitespace and formatting (delegated entirely to the
pinned formatter), and inter-module coupling, which is a distinct architectural property with its
own measurement.

The primary degradation mechanisms the playbook addresses are: control flow that nests instead of
exiting early; effect pipelines chained past what a reader can track in one pass; failure paths
invisible in types (thrown errors, untagged failure payloads); type-level escape hatches (`any`,
`as`, non-null assertions, suppression comments); exported values whose large types exist only in
the compiler's head; near-empty names in wide scopes; shadowed and reassigned bindings; conditions
and ternaries grown past scanning; unexplained numeric literals; bare boolean arguments; wide
parameter lists; references that force upward-then-downward scrolling; the same combinator used in
two call orientations; and exported declarations with no documentation.

The measurement below assigns each mechanism a deterministic count taken from the compiler's own
view of the code, weights it, and sums it into one project total. Each optimization lever removes
exactly one mechanism and predicts the exact component count that must fall; the invariants at the
end reject changes that lower the total without making the code easier to read.

## Definitions

Every predicate implementation in this section is a module under `tools/readability/predicates/`,
one file per term, named in the header comment of its snippet. Later snippets import earlier ones
by those paths. All snippets type-check against `typescript@6` and `effect@4.0.0-beta.98` (the
versions pinned in `bun.lock`).

### Program under measurement

The program under measurement is the TypeScript program produced by parsing one fixed `tsconfig`
file — for this repository, `tsconfig.selfhost.json` — with a pinned TypeScript version, and
resolving every root file and every transitively imported file with that configuration's compiler
options. It is the single observable input universe for every measurement in this document: a
construct contributes to the metric only if it occurs in a file of this program.

**Mechanical predicate:** Given a `tsconfig` path and a TypeScript version: parse the config with
the compiler's own config parser, then create a program from the parsed root names and options. A
file belongs to the program under measurement iff `program.getSourceFiles()` contains it. The
result is a `ts.Program`; membership of a file is Boolean.

**Predicate implementation:**

```ts
// tools/readability/predicates/programUnderMeasurement.ts
import * as ts from "typescript";

export function programUnderMeasurement(tsconfigPath: string): ts.Program {
  const host: ts.ParseConfigFileHost = {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    },
  };
  const parsed = ts.getParsedCommandLineOfConfigFile(tsconfigPath, {}, host);
  if (parsed === undefined) throw new Error(`unparsable tsconfig: ${tsconfigPath}`);
  return ts.createProgram(parsed.fileNames, parsed.options);
}
```

**Example:** the machine-readable input that fixes the program under measurement.

```jsonc
// tsconfig.selfhost.json — the one fixed config file that defines the program
{
  // compiler options are observable inputs: they change resolution and checking
  "compilerOptions": {
    "strict": true, // strictness flags are part of the measurement environment
    "module": "esnext",
    "moduleResolution": "bundler",
  },
  // root files: every listed file and everything it transitively imports is in the program
  "include": ["packages/*/src/**/*.ts"],
  // excluded paths never become root files (they can still enter via imports)
  "exclude": ["node_modules", "dist"],
}
```

### Source module

A source module is a file of the [program under measurement](#program-under-measurement) that (a)
is not a declaration file (`.d.ts`) and (b) is not part of an external library (a file the
compiler resolved out of a `node_modules` package). Source modules are the only files whose
constructs are counted; external library files and declaration files participate in symbol and
type resolution but contribute no counts.

**Mechanical predicate:** Given a `ts.SourceFile` and its owning `ts.Program`: member iff
`file.isDeclarationFile === false` and `program.isSourceFileFromExternalLibrary(file) === false`.
Boolean.

**Predicate implementation:**

```ts
// tools/readability/predicates/sourceModule.ts
import * as ts from "typescript";

export function isSourceModule(file: ts.SourceFile, program: ts.Program): boolean {
  return (
    !file.isDeclarationFile && // (a) declaration files carry no measured constructs
    !program.isSourceFileFromExternalLibrary(file) // (b) dependency sources are resolution-only
  );
}
```

**Example:**

**This:**

```ts
// packages/core/src/config.ts — a project file in the program: a source module
export const defaultPort = 8080;
```

**Not this:**

```ts
// packages/core/src/config.d.ts — (a) a declaration file: not a source module
export declare const defaultPort: number;
```

```ts
// node_modules/effect/dist/Effect.d.ts — (b) an external library file: not a source module.
// It still resolves the `Effect` symbol used by measured code.
export declare const succeed: <A>(value: A) => unknown;
```

### Code line

A code line is a line of a [source module](#source-module) on which the TypeScript scanner, run
with trivia skipping enabled, reports at least one token. Lines that are blank or contain only
comments contain only trivia, so they are not code lines. Code lines are the length unit for every
span and distance quantity in this document.

#### Related terms

| Term            | Relation                    | Deciding distinction                              | Why it is not interchangeable here                                                            |
| --------------- | --------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Source line     | superset                    | counts every physical line, including blank/comment | comment and blank lines cost a reader almost nothing; counting them rewards deleting comments |
| Statement count | different granularity       | counts AST statements, not lines                  | one statement can span many lines the reader must still scan                                   |

```ts
// This whole comment line is trivia only — NOT a code line (related term: it IS a source line).
const limit = 10; // code line: the scanner reports tokens on it

// (blank line above: a source line but not a code line)
const doubled = limit * 2; // code line; also exactly one statement (related term: statement count)
```

**Mechanical predicate:** Given a `ts.SourceFile` and a 0-based line number: member iff scanning
`file.text` with `ts.createScanner(..., skipTrivia: true, ...)` yields at least one token whose
start position maps to that line. Boolean per line; the derived quantity "code line count of a
range" is the number of member lines whose line number falls inside the range, in lines.

**Predicate implementation:**

```ts
// tools/readability/predicates/codeLine.ts
import * as ts from "typescript";

/** 0-based line numbers of `file` on which at least one non-trivia token starts. */
export function codeLineNumbers(file: ts.SourceFile): ReadonlySet<number> {
  const lines = new Set<number>();
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    /* skipTrivia */ true, // comments and whitespace are trivia; only real tokens mark lines
    ts.LanguageVariant.Standard,
    file.text,
  );
  while (scanner.scan() !== ts.SyntaxKind.EndOfFileToken) {
    lines.add(file.getLineAndCharacterOfPosition(scanner.getTokenStart()).line);
  }
  return lines;
}

/** Number of code lines between two positions of `file`, inclusive, in lines. */
export function codeLineCount(file: ts.SourceFile, start: number, end: number): number {
  const from = file.getLineAndCharacterOfPosition(start).line;
  const to = file.getLineAndCharacterOfPosition(end).line;
  let count = 0;
  for (const line of codeLineNumbers(file)) {
    if (line >= from && line <= to) count += 1;
  }
  return count;
}
```

### Top-level declaration

A top-level declaration is a statement that appears directly in the statement list of a
[source module](#source-module) and is neither an import declaration nor a bare re-export
declaration. Top-level declarations are the attribution unit for module-level counts and the
ordering unit for reading order.

**Mechanical predicate:** Given a `ts.SourceFile`: the members are exactly the elements of
`file.statements` for which `ts.isImportDeclaration` and `ts.isExportDeclaration` are both false.
Boolean per statement.

**Predicate implementation:**

```ts
// tools/readability/predicates/topLevelDeclaration.ts
import * as ts from "typescript";

export function topLevelDeclarations(file: ts.SourceFile): readonly ts.Statement[] {
  return file.statements.filter(
    (statement) =>
      !ts.isImportDeclaration(statement) && // imports bind names declared elsewhere
      !ts.isExportDeclaration(statement), // `export { x }` restates an existing declaration
  );
}
```

**Example:**

```ts
import { Effect } from "effect"; // NOT a top-level declaration (import declaration)

// top-level declaration: a statement directly in the module statement list
const retryLimit = 3;

// top-level declaration: function statements count too
function shouldRetry(attempt: number): boolean {
  return attempt < retryLimit;
}

export { shouldRetry }; // NOT a top-level declaration (bare re-export declaration)
```

### Exported declaration

An exported declaration is a declaration inside a [source module](#source-module) that the checker
reports as an export of that module's symbol — whether exported inline with the `export` modifier
or through a later `export { … }` list. Exported declarations form the module's public surface;
several counts (annotation gaps, undocumented exports) and the anti-gaming export-surface digest
are defined over them.

**Mechanical predicate:** Given a `ts.SourceFile` and a `ts.TypeChecker`: obtain the module symbol
via `checker.getSymbolAtLocation(file)`; the members are the declarations of
`checker.getExportsOfModule(moduleSymbol)` whose source file is `file`. Boolean per declaration.

**Predicate implementation:**

```ts
// tools/readability/predicates/exportedDeclaration.ts
import * as ts from "typescript";

export function exportedDeclarations(
  file: ts.SourceFile,
  checker: ts.TypeChecker,
): readonly ts.Declaration[] {
  const moduleSymbol = checker.getSymbolAtLocation(file);
  if (moduleSymbol === undefined) return []; // a script with no exports has no module symbol
  return checker
    .getExportsOfModule(moduleSymbol)
    .flatMap((exported) => exported.declarations ?? [])
    .filter((declaration) => declaration.getSourceFile() === file);
}
```

**Example:**

```ts
// exported declaration: inline `export` modifier
export const version = "1.0.0";

// exported declaration: exported through the list below, not inline
function normalize(input: string): string {
  return input.trim();
}

// NOT an exported declaration: never named in any export
const internalCache = new Map<string, string>();

export { normalize };
```

### Analyzable function

An analyzable function is any function-like node in a [source module](#source-module) that has a
body: a function declaration, function expression, arrow function, method declaration,
constructor, or get/set accessor. Overload signatures and ambient declarations have no body and
are excluded. Analyzable functions are the attribution unit for all function-scoped counts.

**Mechanical predicate:** Given a `ts.Node`: member iff the node's kind is one of the seven listed
function-like kinds and `node.body !== undefined`. Boolean.

**Predicate implementation:**

```ts
// tools/readability/predicates/analyzableFunction.ts
import * as ts from "typescript";

export type AnalyzableFunction =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.ConstructorDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration;

export function isAnalyzableFunction(node: ts.Node): node is AnalyzableFunction {
  return (
    (ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isConstructorDeclaration(node) ||
      ts.isGetAccessorDeclaration(node) ||
      ts.isSetAccessorDeclaration(node)) &&
    node.body !== undefined // overload signatures and ambient declarations are excluded
  );
}
```

**Example:**

**This:**

```ts
// analyzable function: function declaration with a body
function double(n: number): number {
  return n * 2;
}

// analyzable function: arrow function (expression bodies count as bodies)
const triple = (n: number): number => n * 3;

class Counter {
  private count = 0;
  // analyzable function: constructor with a body
  constructor(start: number) {
    this.count = start;
  }
  // analyzable function: method declaration with a body
  increment(): number {
    this.count += 1;
    return this.count;
  }
  // analyzable function: get accessor with a body
  get current(): number {
    return this.count;
  }
  // analyzable function: set accessor with a body
  set current(value: number) {
    this.count = value;
  }
}

// analyzable function: function expression with a body
const quadruple = function (n: number): number {
  return n * 4;
};
```

**Not this:**

```ts
// NOT analyzable: an overload signature has no body
export function parse(input: string): number;
export function parse(input: string, radix: number): number;
// (the implementation below IS analyzable)
export function parse(input: string, radix?: number): number {
  return parseInt(input, radix ?? 10);
}

// NOT analyzable: an ambient declaration has no body
declare function nativeHash(input: string): number;
```

### Function span

The function span of an [analyzable function](#analyzable-function) is the number of
[code lines](#code-line) between the function's first and last position, inclusive. It is measured
in lines. Function span is the quantity behind the over-long-function component and its lever.

#### Related terms

| Term              | Relation              | Deciding distinction                          | Why it is not interchangeable here                                             |
| ----------------- | --------------------- | --------------------------------------------- | ------------------------------------------------------------------------------ |
| Source-line length | superset quantity     | includes blank and comment-only lines         | padding with comments would inflate it; deleting comments would "improve" it   |
| Statement count   | different granularity | counts statements regardless of layout        | a 200-character one-liner reads worse than its statement count suggests        |

```ts
// function span of `label` = 4 code lines (the comment line inside is not a code line,
// so source-line length would be 5 — related term — and statement count would be 2)
function label(n: number): string {
  const prefix = "#";
  // this comment line is excluded from the span
  return prefix + String(n);
}
```

**Mechanical predicate:** Given an [analyzable function](#analyzable-function) `fn` in file `f`:
value is `codeLineCount(f, fn.getStart(f), fn.getEnd())`, in lines.

**Predicate implementation:**

```ts
// tools/readability/predicates/functionSpan.ts
import type * as ts from "typescript";
import { codeLineCount } from "./codeLine.ts";
import type { AnalyzableFunction } from "./analyzableFunction.ts";

export function functionSpan(fn: AnalyzableFunction): number {
  const file = fn.getSourceFile();
  return codeLineCount(file, fn.getStart(file), fn.getEnd());
}
```

### Cognitive cost

The cognitive cost of an [analyzable function](#analyzable-function) is a count, in points, of the
control-flow facts a reader must track, weighted by how deeply each fact is buried. It increments
for exactly these constructs:

1. each structural construct — `if` statement, conditional (ternary) expression, `switch`
   statement, `for`/`for…in`/`for…of` loop, `while` loop, `do` loop, `catch` clause — costs 1 point
   plus 1 point per level of nesting at its position;
2. each `else` clause costs 1 flat point;
3. each maximal run of one logical operator (`&&` or `||`) costs 1 flat point (`a && b && c` is one
   run; `a && b || c` is two);
4. each direct recursion — a call whose resolved callee symbol is the enclosing function's own
   symbol — costs 1 flat point.

The nesting level at a position is the number of enclosing structural-construct bodies plus
enclosing nested [analyzable functions](#analyzable-function), counted inside the measured function
only.

#### Related terms

| Term                  | Relation           | Deciding distinction                                        | Why it is not interchangeable here                                                       |
| --------------------- | ------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Cyclomatic complexity | close neighbor     | counts branch edges; ignores nesting depth entirely         | ten flat guard clauses read far more easily than five nested `if`s, yet score worse      |
| Nesting depth         | one ingredient     | reports only the maximum depth, not how much code sits deep | one deep expression and fifty deep statements would score the same                        |
| [Function span](#function-span) | orthogonal quantity | measures length in lines, not branching                    | a long linear function can be easy to read; a short deeply-branched one can be hard      |

```ts
// cognitive cost of `describeInventory` = 9 points
function describeInventory(items: readonly string[], attempts: number): string {
  // item 1: `for…of` structural construct: +1 (nesting 0)
  for (const item of items) {
    // item 1: nested `if`: +1 structural, +1 nesting → +2
    if (item.length === 0) {
      continue;
    }
  }
  // item 1: `if`: +1 (nesting 0); item 3: one maximal `&&` run: +1
  if (attempts > 3 && items.length > 0) {
    return "retrying";
  } else {
    // item 2: `else` clause: +1
    // item 1: ternary inside the `if`/`else` body: +1 structural, +1 nesting → +2
    return items.length === 0
      ? "empty"
      : // item 4: direct recursion: +1
        describeInventory(items, attempts + 1);
  }
  // (related term cyclomatic complexity would report 5 here and ignore all nesting)
}
```

**Mechanical predicate:** Given an [analyzable function](#analyzable-function) and a
`ts.TypeChecker`: walk the function body; sum the four increment rules above with nesting tracked
as defined. Value in points (a nonnegative integer).

**Predicate implementation:**

```ts
// tools/readability/predicates/cognitiveCost.ts
import * as ts from "typescript";
import { isAnalyzableFunction, type AnalyzableFunction } from "./analyzableFunction.ts";

const structuralKinds: ReadonlySet<ts.SyntaxKind> = new Set([
  ts.SyntaxKind.IfStatement,
  ts.SyntaxKind.ConditionalExpression,
  ts.SyntaxKind.SwitchStatement,
  ts.SyntaxKind.ForStatement,
  ts.SyntaxKind.ForInStatement,
  ts.SyntaxKind.ForOfStatement,
  ts.SyntaxKind.WhileStatement,
  ts.SyntaxKind.DoStatement,
  ts.SyntaxKind.CatchClause,
]);

const isLogicalOperator = (kind: ts.SyntaxKind): boolean =>
  kind === ts.SyntaxKind.AmpersandAmpersandToken || kind === ts.SyntaxKind.BarBarToken;

export function cognitiveCost(fn: AnalyzableFunction, checker: ts.TypeChecker): number {
  const ownSymbol = fn.name !== undefined ? checker.getSymbolAtLocation(fn.name) : undefined;
  let total = 0;
  const visit = (node: ts.Node, nesting: number): void => {
    let childNesting = nesting;
    if (structuralKinds.has(node.kind)) {
      total += 1 + nesting; // rule 1: structural increment plus nesting increment
      childNesting = nesting + 1;
    } else if (isAnalyzableFunction(node)) {
      childNesting = nesting + 1; // nested functions deepen nesting without incrementing
    }
    if (ts.isIfStatement(node) && node.elseStatement !== undefined) {
      total += 1; // rule 2: `else` clause
    }
    if (
      ts.isBinaryExpression(node) &&
      isLogicalOperator(node.operatorToken.kind) &&
      !(
        ts.isBinaryExpression(node.parent) &&
        node.parent.operatorToken.kind === node.operatorToken.kind
      )
    ) {
      total += 1; // rule 3: head of a maximal run of one logical operator
    }
    if (
      ts.isCallExpression(node) &&
      ownSymbol !== undefined &&
      checker.getSymbolAtLocation(node.expression) === ownSymbol
    ) {
      total += 1; // rule 4: direct recursion
    }
    ts.forEachChild(node, (child) => visit(child, childNesting));
  };
  if (fn.body !== undefined) visit(fn.body, 0);
  return total;
}
```

### Effect value

An Effect value is an expression or declared value whose compiler-resolved type is the `Effect`
type declared by the `effect` package: a lazily-described computation carrying a success channel, a
typed error channel, and a typed requirements channel. Membership is decided from the resolved
type's symbol and the package that declares it — never from names or paths in the measured project.

#### Related terms

| Term                       | Relation        | Deciding distinction                                            | Why it is not interchangeable here                                                    |
| -------------------------- | --------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `Promise`                  | superficial twin | eager, single-shot, failures untyped                            | error-channel readability rules only make sense where the type system carries failures |
| Effect-returning function  | producer        | the function is not itself the described computation            | chain and error-channel counts attach to the value's type, not the factory             |
| `Stream` (effect package)  | sibling          | multi-element channel; different symbol (`Stream`, not `Effect`) | its combinators differ; counting it here would misattribute chain stages               |

```ts
import { Effect, Stream } from "effect";

// Effect value: resolved type symbol is `Effect`, declared by the `effect` package
const answer: Effect.Effect<number> = Effect.succeed(42);

// related term `Promise`: eager and untyped failures — NOT an Effect value
const eager: Promise<number> = Promise.resolve(42);

// related term Effect-returning function: the function itself is NOT an Effect value,
// but its call result is
const makeAnswer = (n: number): Effect.Effect<number> => Effect.succeed(n);

// related term `Stream`: declared by the same package but a different symbol — NOT an Effect value
const numbers: Stream.Stream<number> = Stream.make(1, 2, 3);
```

**Mechanical predicate:** Given a `ts.Type`: member iff the type's alias symbol or symbol is named
`Effect` and the nearest `package.json` above that symbol's first declaration file (walking parent
directories, skipping manifests without a string `name`) has `"name": "effect"`. Boolean.

**Predicate implementation:**

```ts
// tools/readability/predicates/effectValue.ts
import * as path from "node:path";
import * as ts from "typescript";

/** Name of the package whose manifest governs the symbol's first declaration file. */
export function declaringPackageName(symbol: ts.Symbol): string | undefined {
  const declaration = symbol.declarations?.[0];
  if (declaration === undefined) return undefined;
  let directory = path.dirname(declaration.getSourceFile().fileName);
  while (true) {
    const contents = ts.sys.readFile(path.join(directory, "package.json"));
    if (contents !== undefined) {
      const manifest = JSON.parse(contents) as { name?: unknown };
      if (typeof manifest.name === "string") return manifest.name;
    }
    const parent = path.dirname(directory);
    if (parent === directory) return undefined;
    directory = parent;
  }
}

export function isEffectType(type: ts.Type): boolean {
  const symbol = type.aliasSymbol ?? type.getSymbol();
  if (symbol === undefined || symbol.getName() !== "Effect") return false;
  return declaringPackageName(symbol) === "effect";
}
```

### Sequential chain

A sequential chain is a maximal series of continuation stages applied to one subject
[Effect value](#effect-value), where a continuation stage is a call to `flatMap`, `andThen`, or
`tap` resolved to the `effect` package, in either of its two syntactic forms: an argument of the
subject's `.pipe(…)` call, or a data-first call whose first argument is the subject. Its chain
length is the number of continuation stages, in stages. Maximality means the chain's outermost
expression is not itself a stage or subject of an enclosing counted chain. Combinators that do not
introduce a new continuation scope (`map` over a plain function, `catchTag`, provisioning
combinators) are not stages.

#### Related terms

| Term                              | Relation      | Deciding distinction                                       | Why it is not interchangeable here                                                        |
| --------------------------------- | ------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [Generator form](#generator-form) | alternative   | linear `yield*` statements instead of nested continuations | it is the remediation target; counting it as a chain would penalize the fix                |
| Method chaining generally         | superset      | any fluent `a.b().c()` sequence                            | non-continuation links (`map`, `catchTag`) do not open a new callback scope for the reader |
| Pipe call length                  | superset      | counts every `.pipe` argument                              | provisioning or tracing arguments do not add a continuation the reader must stack          |

```ts
import { Effect } from "effect";

declare const fetchUser: (id: string) => Effect.Effect<{ readonly name: string }>;
declare const fetchOrders: (user: { readonly name: string }) => Effect.Effect<readonly string[]>;
declare const log: (count: number) => Effect.Effect<void>;

// one sequential chain with chain length 3
const program = fetchUser("u1").pipe(
  Effect.flatMap((user) => fetchOrders(user)), // continuation stage 1 (`flatMap`)
  Effect.tap((orders) => log(orders.length)), // continuation stage 2 (`tap`)
  Effect.andThen((orders) => Effect.succeed(orders.length)), // continuation stage 3 (`andThen`)
  Effect.map((count) => `count: ${count}`), // NOT a stage: `map` takes a plain function
);

// the same three stages in data-first form — still one chain of length 3
// (related term "method chaining generally" would also count the `.pipe` link itself)
const program2 = Effect.map(
  Effect.andThen(
    Effect.tap(
      Effect.flatMap(fetchUser("u1"), (user) => fetchOrders(user)), // stage 1
      (orders) => log(orders.length), // stage 2
    ),
    (orders) => Effect.succeed(orders.length), // stage 3
  ),
  (count) => `count: ${count}`,
);
```

**Mechanical predicate:** Given a `ts.CallExpression` and a `ts.TypeChecker`: if the callee is a
property access named `pipe` whose receiver's type satisfies [Effect value](#effect-value), the
value is the receiver's chain length plus the number of arguments that are calls to
`effect`-package `flatMap`/`andThen`/`tap`; if the call itself is a data-first
`flatMap`/`andThen`/`tap` with two arguments, the value is 1 plus the first argument's chain
length; otherwise 0. A chain is counted only at a node whose parent does not already include it in
a counted chain. Value in stages.

**Predicate implementation:**

```ts
// tools/readability/predicates/sequentialChain.ts
import * as ts from "typescript";
import { declaringPackageName, isEffectType } from "./effectValue.ts";

const continuationNames: ReadonlySet<string> = new Set(["flatMap", "andThen", "tap"]);

function isContinuationCombinator(expression: ts.Expression, checker: ts.TypeChecker): boolean {
  if (!ts.isPropertyAccessExpression(expression)) return false;
  if (!continuationNames.has(expression.name.text)) return false;
  const symbol = checker.getSymbolAtLocation(expression.name);
  return symbol !== undefined && declaringPackageName(symbol) === "effect";
}

export function chainLength(node: ts.Expression, checker: ts.TypeChecker): number {
  if (!ts.isCallExpression(node)) return 0;
  const callee = node.expression;
  // `.pipe(…)` form
  if (
    ts.isPropertyAccessExpression(callee) &&
    callee.name.text === "pipe" &&
    isEffectType(checker.getTypeAtLocation(callee.expression))
  ) {
    const stages = node.arguments.filter(
      (argument) =>
        ts.isCallExpression(argument) && isContinuationCombinator(argument.expression, checker),
    ).length;
    return chainLength(callee.expression, checker) + stages;
  }
  // data-first form
  if (isContinuationCombinator(callee, checker) && node.arguments.length === 2) {
    const subject = node.arguments[0];
    return 1 + (subject === undefined ? 0 : chainLength(subject, checker));
  }
  return 0;
}

/** Lengths of the maximal sequential chains inside `root`, longest first. */
export function sequentialChainLengths(root: ts.Node, checker: ts.TypeChecker): readonly number[] {
  const lengths: number[] = [];
  const visit = (node: ts.Node, insideCountedChain: boolean): void => {
    const length = insideCountedChain ? 0 : chainLength(node as ts.Expression, checker);
    if (length > 0) lengths.push(length);
    ts.forEachChild(node, (child) => visit(child, insideCountedChain || length > 0));
  };
  visit(root, false);
  return [...lengths].sort((a, b) => b - a);
}
```

### Generator form

A generator form is a call to the `effect` package's `Effect.gen` whose argument is a generator
function; inside it, each dependent step is a linear `yield*` statement instead of a nested
continuation callback. It is the reading-order-preserving alternative to a long
[sequential chain](#sequential-chain).

**Mechanical predicate:** Given a `ts.CallExpression` and a `ts.TypeChecker`: member iff the
callee is a property access named `gen` whose resolved symbol's declaring package (per the
[Effect value](#effect-value) package-name procedure) is `effect`, and the first argument is a
function expression with an asterisk token. Boolean.

**Predicate implementation:**

```ts
// tools/readability/predicates/generatorForm.ts
import * as ts from "typescript";
import { declaringPackageName } from "./effectValue.ts";

export function isGeneratorForm(node: ts.CallExpression, checker: ts.TypeChecker): boolean {
  const callee = node.expression;
  if (!ts.isPropertyAccessExpression(callee) || callee.name.text !== "gen") return false;
  const symbol = checker.getSymbolAtLocation(callee.name);
  if (symbol === undefined || declaringPackageName(symbol) !== "effect") return false;
  const argument = node.arguments[0];
  return (
    argument !== undefined &&
    ts.isFunctionExpression(argument) &&
    argument.asteriskToken !== undefined
  );
}
```

**Example:**

```ts
import { Effect } from "effect";

declare const fetchUser: (id: string) => Effect.Effect<{ readonly name: string }>;
declare const fetchOrders: (user: { readonly name: string }) => Effect.Effect<readonly string[]>;

// generator form: `Effect.gen` over a generator function; each step is a linear `yield*`
const program = Effect.gen(function* () {
  const user = yield* fetchUser("u1");
  const orders = yield* fetchOrders(user);
  return orders.length;
});

// NOT a generator form: `Effect.gen` is absent; this is a sequential chain of length 1
const chained = fetchUser("u1").pipe(Effect.flatMap((user) => fetchOrders(user)));
```

### Tagged failure class

A tagged failure class is a class declared with the `effect` package's
`Schema.TaggedErrorClass` idiom: it extends the result of the two-stage
`Schema.TaggedErrorClass<Self>(identifier?)(tag, fields)` call, which gives every instance a
string-literal `_tag` discriminant, a schema for its fields, and yieldability inside a
[generator form](#generator-form). It is the remediation target that makes a failure path visible
and matchable by name.

#### Related terms

| Term                          | Relation        | Deciding distinction                                             | Why it is not interchangeable here                                                     |
| ----------------------------- | --------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Hand-rolled `_tag` class      | look-alike      | manually assigned `_tag` field; no schema, not schema-derivable  | it satisfies the error-channel discriminant check but lacks the idiom the lever installs  |
| `Error` subclass              | ancestor         | no string-literal discriminant at all                            | `catchTag` cannot select it; the error channel stays opaque to the reader                 |
| Defect (`Effect.die` payload) | different channel | deliberately unrecoverable; bypasses the typed error channel     | defects are not part of the readable contract; counting them would punish invariant checks |

```ts
import { Effect, Schema } from "effect";

// tagged failure class: the `Schema.TaggedErrorClass` idiom
class UserNotFound extends Schema.TaggedErrorClass<UserNotFound>()("UserNotFound", {
  id: Schema.String,
}) {}

// related term hand-rolled `_tag` class: literal discriminant, but not the idiom
class LegacyNotFound extends Error {
  readonly _tag = "LegacyNotFound" as const;
}

// related term `Error` subclass: no discriminant — invisible to `catchTag`
class BareFailure extends Error {}

// related term defect: bypasses the typed error channel entirely
const crash: Effect.Effect<never> = Effect.die(new BareFailure("unrecoverable"));

// the tagged failure class is selectable by name — this is what readability buys
const recovered: Effect.Effect<string> = Effect.fail(new UserNotFound({ id: "u1" })).pipe(
  Effect.catchTag("UserNotFound", (error) => Effect.succeed(`missing ${error.id}`)),
);
```

**Mechanical predicate:** Given a `ts.ClassLikeDeclaration` and a `ts.TypeChecker`: member iff the
`extends` heritage expression, after unwrapping call layers, resolves (through aliases) to a
symbol named `TaggedErrorClass` whose declaring package (per the [Effect value](#effect-value)
package-name procedure) is `effect`. Boolean.

**Predicate implementation:**

```ts
// tools/readability/predicates/taggedFailureClass.ts
import * as ts from "typescript";
import { declaringPackageName } from "./effectValue.ts";

export function isTaggedFailureClass(
  declaration: ts.ClassLikeDeclaration,
  checker: ts.TypeChecker,
): boolean {
  const extendsClause = declaration.heritageClauses?.find(
    (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
  );
  const heritage = extendsClause?.types[0]?.expression;
  if (heritage === undefined) return false;
  let callee: ts.Expression = heritage;
  while (ts.isCallExpression(callee)) callee = callee.expression; // unwrap `(id?)(tag, fields)`
  const nameNode = ts.isPropertyAccessExpression(callee) ? callee.name : callee;
  const symbol = checker.getSymbolAtLocation(nameNode);
  const resolved =
    symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  return (
    resolved !== undefined &&
    resolved.getName() === "TaggedErrorClass" &&
    declaringPackageName(resolved) === "effect"
  );
}
```

### Untyped failure

An untyped failure is a failure path that a reader cannot recover from the types. It is any of:

- **(a)** a `throw` statement inside an [analyzable function](#analyzable-function) whose return
  type is an [Effect value](#effect-value) type, or inside the generator function of a
  [generator form](#generator-form) — the failure bypasses the error channel entirely;
- **(b)** a call to the `effect` package's `Effect.fail` whose payload type has no `_tag` property
  of string-literal type — the failure occupies the error channel but cannot be selected by name;
- **(c)** an [exported declaration](#exported-declaration) whose type (or, for a function, whose
  return type) is an [Effect value](#effect-value) type with an error-channel union member that is
  not `never` and has no `_tag` property of string-literal type — the module's public failure
  contract is undiscriminated.

A defect raised with `Effect.die` is not an untyped failure: it deliberately declares the error
unrecoverable rather than hiding it.

**Mechanical predicate:** Given a [source module](#source-module) and a `ts.TypeChecker`: collect
every node matching (a), (b), or (c) using compiler-resolved types only; the `_tag` check reads the
property's type via `getTypeOfSymbolAtLocation` and requires `isStringLiteral()`. Value: the set of
matching nodes; the count is per module, in occurrences.

**Predicate implementation:**

```ts
// tools/readability/predicates/untypedFailure.ts
import * as ts from "typescript";
import { isAnalyzableFunction } from "./analyzableFunction.ts";
import { declaringPackageName, isEffectType } from "./effectValue.ts";
import { exportedDeclarations } from "./exportedDeclaration.ts";

function hasLiteralTag(type: ts.Type, checker: ts.TypeChecker): boolean {
  const tag = type.getProperty("_tag");
  const declaration = tag?.valueDeclaration ?? tag?.declarations?.[0];
  if (tag === undefined || declaration === undefined) return false;
  return checker.getTypeOfSymbolAtLocation(tag, declaration).isStringLiteral();
}

function isEffectCombinator(
  expression: ts.Expression,
  name: string,
  checker: ts.TypeChecker,
): boolean {
  if (!ts.isPropertyAccessExpression(expression) || expression.name.text !== name) return false;
  const symbol = checker.getSymbolAtLocation(expression.name);
  return symbol !== undefined && declaringPackageName(symbol) === "effect";
}

function effectReturnType(node: ts.Node, checker: ts.TypeChecker): ts.Type | undefined {
  if (!ts.isFunctionLike(node)) return undefined;
  const signature = checker.getSignatureFromDeclaration(node);
  if (signature === undefined) return undefined;
  const returned = checker.getReturnTypeOfSignature(signature);
  return isEffectType(returned) ? returned : undefined;
}

export function untypedFailures(
  file: ts.SourceFile,
  checker: ts.TypeChecker,
): readonly ts.Node[] {
  const found: ts.Node[] = [];
  const visit = (node: ts.Node, onEffectPath: boolean): void => {
    let context = onEffectPath;
    if (isAnalyzableFunction(node)) {
      context =
        effectReturnType(node, checker) !== undefined ||
        (ts.isCallExpression(node.parent) &&
          isEffectCombinator(node.parent.expression, "gen", checker));
    }
    if (ts.isThrowStatement(node) && context) found.push(node); // case (a)
    if (ts.isCallExpression(node) && isEffectCombinator(node.expression, "fail", checker)) {
      const payload = node.arguments[0];
      if (payload !== undefined && !hasLiteralTag(checker.getTypeAtLocation(payload), checker)) {
        found.push(node); // case (b)
      }
    }
    ts.forEachChild(node, (child) => visit(child, context));
  };
  visit(file, false);
  for (const declaration of exportedDeclarations(file, checker)) {
    const declared = checker.getTypeAtLocation(declaration);
    const effect = isEffectType(declared) ? declared : effectReturnType(declaration, checker);
    if (effect === undefined) continue;
    const error = checker.getTypeArguments(effect as ts.TypeReference)[1];
    if (error === undefined) continue;
    const members = error.isUnion() ? error.types : [error];
    for (const member of members) {
      if ((member.flags & ts.TypeFlags.Never) !== 0) continue;
      if (!hasLiteralTag(member, checker)) found.push(declaration); // case (c)
    }
  }
  return found;
}
```

**Example:**

**This:**

```ts
import { Effect } from "effect";

declare const lookup: (id: string) => string | undefined;

// case (a): a `throw` inside a function returning an Effect value — invisible in the type
const findUserA = (id: string): Effect.Effect<string> => {
  const name = lookup(id);
  if (name === undefined) throw new Error(`no user ${id}`);
  return Effect.succeed(name);
};

// case (a), generator variant: a `throw` inside a generator form becomes a hidden defect
const findUserGen = (id: string) =>
  Effect.gen(function* () {
    const name = lookup(id);
    if (name === undefined) throw new Error(`no user ${id}`);
    return name;
  });

// case (b): `Effect.fail` with a payload lacking a string-literal `_tag`
const findUserB = (id: string): Effect.Effect<string, Error> => {
  const name = lookup(id);
  return name === undefined ? Effect.fail(new Error(`no user ${id}`)) : Effect.succeed(name);
};

// case (c): an exported Effect value whose error channel member (`Error`) is undiscriminated
export const currentUser: Effect.Effect<string, Error> = findUserB("current");
```

**Not this:**

```ts
import { Effect, Schema } from "effect";

class UserNotFound extends Schema.TaggedErrorClass<UserNotFound>()("UserNotFound", {
  id: Schema.String,
}) {}

declare const lookup: (id: string) => string | undefined;

// not (a)/(b): failure goes through the error channel with a tagged failure class payload
// not (c): the exported error channel is fully discriminated by `_tag`
export const findUser = (id: string): Effect.Effect<string, UserNotFound> => {
  const name = lookup(id);
  return name === undefined
    ? Effect.fail(new UserNotFound({ id }))
    : Effect.succeed(name);
};

// not an untyped failure: `Effect.die` declares a defect — deliberately unrecoverable
export const impossible: Effect.Effect<never> = Effect.die(new Error("broken invariant"));
```

### Escape hatch

An escape hatch is a construct that suppresses the checker instead of informing the reader. It is
any of:

1. a type assertion `expr as T` — except `as const`, which adds information;
2. an angle-bracket assertion `<T>expr`;
3. a non-null assertion `expr!`;
4. an explicit `any` keyword in any type position;
5. a `@ts-ignore`, `@ts-expect-error`, or `@ts-nocheck` directive in a comment.

Constructs that narrow or verify — `as const`, `satisfies T`, `unknown`, type guards — are not
escape hatches.

#### Related terms

| Term        | Relation      | Deciding distinction                                      | Why it is not interchangeable here                                     |
| ----------- | ------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| `as const`  | look-alike    | narrows to literal types; cannot lie                       | it adds checked information; penalizing it would punish precision       |
| `satisfies` | look-alike    | checks conformance without changing the expression's type  | the checker still verifies; nothing is suppressed                       |
| `unknown`   | contrast type | forces narrowing before use                                | it is the honest alternative to `any`, not a suppression                |

**Mechanical predicate:** Given a [source module](#source-module): collect every AST node matching
items 1–4 (`ts.isAsExpression` excluding `ts.isConstTypeReference`, `ts.isTypeAssertionExpression`,
`ts.isNonNullExpression`, `node.kind === AnyKeyword`) plus every comment token whose text matches
`@ts-(ignore|expect-error|nocheck)` when scanned with trivia included. Value: the set of matches;
count per module, in occurrences.

**Predicate implementation:**

```ts
// tools/readability/predicates/escapeHatch.ts
import * as ts from "typescript";

export interface EscapeHatch {
  readonly kind: "as" | "angle-bracket" | "non-null" | "any" | "directive";
  readonly start: number;
}

export function escapeHatches(file: ts.SourceFile): readonly EscapeHatch[] {
  const found: EscapeHatch[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isAsExpression(node) && !ts.isConstTypeReference(node.type)) {
      found.push({ kind: "as", start: node.getStart(file) }); // item 1
    }
    if (ts.isTypeAssertionExpression(node)) {
      found.push({ kind: "angle-bracket", start: node.getStart(file) }); // item 2
    }
    if (ts.isNonNullExpression(node)) {
      found.push({ kind: "non-null", start: node.getStart(file) }); // item 3
    }
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      found.push({ kind: "any", start: node.getStart(file) }); // item 4
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    /* skipTrivia */ false, // keep comments so directives are visible
    ts.LanguageVariant.Standard,
    file.text,
  );
  let token = scanner.scan();
  while (token !== ts.SyntaxKind.EndOfFileToken) {
    if (
      (token === ts.SyntaxKind.SingleLineCommentTrivia ||
        token === ts.SyntaxKind.MultiLineCommentTrivia) &&
      /@ts-(ignore|expect-error|nocheck)/.test(scanner.getTokenText())
    ) {
      found.push({ kind: "directive", start: scanner.getTokenStart() }); // item 5
    }
    token = scanner.scan();
  }
  return found;
}
```

**Example:**

**This:**

```ts
interface RawConfig {
  readonly port: unknown;
}
declare const raw: RawConfig;
declare const maybeName: string | undefined;

const port = raw.port as number; // item 1: `as` assertion
const portAngle = <number>raw.port; // item 2: angle-bracket assertion
const name = maybeName!; // item 3: non-null assertion
const anything: any = raw; // item 4: explicit `any`
// @ts-expect-error — item 5: suppression directive
const broken: number = "not a number";
```

**Not this:**

```ts
declare const raw: { readonly port: unknown };

const modes = ["dev", "prod"] as const; // `as const`: adds literal information
const config = { retries: 3 } satisfies { retries: number }; // `satisfies`: checked, not suppressed
const input: unknown = raw.port; // `unknown`: forces narrowing before use
const port = typeof input === "number" ? input : 0; // type guard: the checker verifies it
```

### Type display length

The type display length of a type is the length, in characters, of the string the checker prints
for it with truncation disabled — the text a reader would have to reconstruct mentally when no
written annotation exists. It is the quantity behind annotation gaps.

#### Related terms

| Term                     | Relation            | Deciding distinction                                | Why it is not interchangeable here                                        |
| ------------------------ | ------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Annotation text length   | written counterpart | measures source text the author wrote               | an alias name can be short while the underlying display stays huge          |
| Structural type size     | node count          | counts type-node children, not rendered characters   | the reader consumes rendered text; deep-but-abbreviated types read fine     |

```ts
import type * as ts from "typescript";

// type display length is measured on the *printed* type, not the annotation:
// the annotation below is 9 characters ("PortPair "), its display is "{ http: number; https: number; }"
type PortPair = { http: number; https: number };
declare const checker: ts.TypeChecker;
declare const pairType: ts.Type;
const rendered: string = checker.typeToString(pairType); // the measured string
const length: number = rendered.length; // the measured quantity, in characters
```

**Mechanical predicate:** Given a `ts.Type` and a `ts.TypeChecker`: value is
`checker.typeToString(type, undefined, NoTruncation | UseFullyQualifiedType).length`, in
characters.

**Predicate implementation:**

```ts
// tools/readability/predicates/typeDisplayLength.ts
import * as ts from "typescript";

export function typeDisplayLength(type: ts.Type, checker: ts.TypeChecker): number {
  return checker.typeToString(
    type,
    undefined,
    ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseFullyQualifiedType,
  ).length;
}
```

### Annotation gap

An annotation gap is an [exported declaration](#exported-declaration) that carries no written type
annotation — no variable type annotation, or no return type annotation for a function — while its
inferred type's [type display length](#type-display-length) exceeds 160 characters. The reader
must reconstruct a large type the author never wrote down.

**Mechanical predicate:** Given a [source module](#source-module) and a `ts.TypeChecker`: an
[exported declaration](#exported-declaration) is a member iff (variable case)
`ts.isVariableDeclaration(d)` with `d.type === undefined` and the
[type display length](#type-display-length) of `checker.getTypeAtLocation(d)` is > 160, or
(function case) the declaration is function-like with `d.type === undefined` and the
[type display length](#type-display-length) of its return type is > 160. Boolean per export;
count per module, in occurrences.

**Predicate implementation:**

```ts
// tools/readability/predicates/annotationGap.ts
import * as ts from "typescript";
import { exportedDeclarations } from "./exportedDeclaration.ts";
import { typeDisplayLength } from "./typeDisplayLength.ts";

const threshold = 160;

export function annotationGaps(
  file: ts.SourceFile,
  checker: ts.TypeChecker,
): readonly ts.Declaration[] {
  return exportedDeclarations(file, checker).filter((declaration) => {
    if (ts.isVariableDeclaration(declaration) && declaration.type === undefined) {
      return typeDisplayLength(checker.getTypeAtLocation(declaration), checker) > threshold;
    }
    if (ts.isFunctionLike(declaration) && declaration.type === undefined) {
      const signature = checker.getSignatureFromDeclaration(declaration);
      if (signature === undefined) return false;
      return typeDisplayLength(checker.getReturnTypeOfSignature(signature), checker) > threshold;
    }
    return false;
  });
}
```

**Example:**

```ts
import { Effect } from "effect";

declare const loadConfig: Effect.Effect<{
  readonly host: string;
  readonly port: number;
  readonly tls: { readonly cert: string; readonly key: string };
  readonly limits: { readonly maxConnections: number; readonly timeoutMillis: number };
}>;

// annotation gap: exported, no written annotation, inferred display well over 160 characters
export const resolvedConfig = loadConfig.pipe(
  Effect.map((config) => ({ ...config, origin: `${config.host}:${config.port}` })),
);

// NOT an annotation gap: the export carries a written annotation, however large the type
export const annotatedConfig: typeof resolvedConfig = resolvedConfig;

// NOT an annotation gap: no annotation, but the inferred display ("number") is short
export const defaultPort = 8080;
```

### Opaque identifier

An opaque identifier is a binding name that carries at most two alphabetic characters while its
uses extend more than 8 [code lines](#code-line) past its declaration — too little information
held live for too long. Excluded: names beginning with `_` (a deliberate discard), type parameter
names (conventionally single letters, resolved by adjacency to their declaration), and names bound
by import declarations (their meaning is carried by the adjacent module specifier).

#### Related terms

| Term                  | Relation   | Deciding distinction                                  | Why it is not interchangeable here                                          |
| --------------------- | ---------- | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| Short identifier      | superset   | any short name, regardless of how far its uses reach  | `i` used on the next line costs nothing; distance is what makes it opaque    |
| Abbreviated identifier | overlap   | may be long but undecipherable (`cfgMgrFactImpl`)     | meaningfulness is not mechanically decidable; live distance is               |

```ts
declare function parseConfig(text: string): { readonly host: string };
declare function step(n: number): number;

// opaque identifier: one alphabetic character, last use 10+ code lines below
const c = parseConfig("host=db.local");
let accumulator = 0;
accumulator = step(1);
accumulator = step(accumulator);
accumulator = step(accumulator + 1);
accumulator = step(accumulator + 2);
accumulator = step(accumulator + 3);
accumulator = step(accumulator + 4);
accumulator = step(accumulator + 5);
accumulator = step(accumulator + 6);
export const host = c.host; // 10 code lines after the declaration of `c`

// related term short identifier, NOT opaque: `n` lives and dies within 2 code lines
export const doubled = [1, 2, 3].map((n) => n * 2);
```

**Mechanical predicate:** Given a [source module](#source-module) and a `ts.TypeChecker`: a
binding identifier (name of a variable declaration, parameter, function declaration, or binding
element — not a type parameter, not introduced by an import declaration) is a member iff its text
stripped to alphabetic characters has length ≤ 2, does not start with `_`, and the inclusive
[code line](#code-line) count from its declaration to the furthest identifier resolving to the
same symbol exceeds 8. Boolean per binding; count per module, in occurrences.

**Predicate implementation:**

```ts
// tools/readability/predicates/opaqueIdentifier.ts
import * as ts from "typescript";
import { codeLineCount } from "./codeLine.ts";

const maxAlphabeticLength = 2;
const maxLiveCodeLines = 8;

function isBindingName(node: ts.Identifier): boolean {
  const parent = node.parent;
  return (
    (ts.isVariableDeclaration(parent) ||
      ts.isParameter(parent) ||
      ts.isFunctionDeclaration(parent) ||
      ts.isBindingElement(parent)) &&
    parent.name === node
  );
}

export function opaqueIdentifiers(
  file: ts.SourceFile,
  checker: ts.TypeChecker,
): readonly ts.Identifier[] {
  const bindings: ts.Identifier[] = [];
  const collect = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && isBindingName(node)) bindings.push(node);
    ts.forEachChild(node, collect);
  };
  collect(file);
  return bindings.filter((binding) => {
    const alphabetic = binding.text.replace(/[^A-Za-z]/g, "");
    if (alphabetic.length > maxAlphabeticLength || binding.text.startsWith("_")) return false;
    const symbol = checker.getSymbolAtLocation(binding);
    if (symbol === undefined) return false;
    let furthest = binding.getStart(file);
    const scan = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && node !== binding) {
        if (checker.getSymbolAtLocation(node) === symbol) {
          furthest = Math.max(furthest, node.getStart(file));
        }
      }
      ts.forEachChild(node, scan);
    };
    scan(file);
    return codeLineCount(file, binding.getStart(file), furthest) > maxLiveCodeLines;
  });
}
```

**Not this:**

```ts
import * as ts from "typescript"; // import binding `ts`: excluded — the specifier names it
import { Effect } from "effect";

// type parameters `A` and `E`: excluded — resolved by adjacency to their declaration
export const orDefault = <A, E>(effect: Effect.Effect<A, E>, fallback: A): Effect.Effect<A> =>
  Effect.catchAll(effect, () => Effect.succeed(fallback));

// `_` prefix: excluded — a deliberate discard
export const arity = (_a: ts.Node, _b: ts.Node): number => 2;
```

### Shadowing binding

A shadowing binding is a binding whose name equals the name of a binding visible from an enclosing
scope at the point of declaration. Every use of that name below the inner declaration now means
something different from the same name above it, so the reader must track scope boundaries to know
which value a name denotes.

#### Related terms

| Term                  | Relation   | Deciding distinction                                    | Why it is not interchangeable here                                    |
| --------------------- | ---------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| Redeclaration          | sibling    | same scope, same name (a compile error for `let`/`const`) | the checker already rejects it; nothing left to measure                |
| [Reassigned binding](#reassigned-binding) | different mechanism | one binding, changing value over time     | shadowing changes the *referent* of a name; reassignment changes its value |

```ts
declare const users: readonly { readonly name: string }[];

const name = "report"; // outer binding
export const lines = users.map(
  // shadowing binding: inner `name` hides the outer `name` for the callback body
  (user) => {
    const name = user.name;
    return `${name}!`; // which `name`? the reader must re-derive the scope to answer
  },
);

// related term reassignment (NOT shadowing): one binding whose value changes
let cursor = 0;
cursor = lines.length;
```

**Mechanical predicate:** Given a [source module](#source-module): walk the AST maintaining a
stack of scopes (module, [analyzable function](#analyzable-function) bodies, blocks, catch
clauses); a binding identifier is a member iff its name is present in any scope strictly below the
top of the stack when it is declared. Boolean per binding; count per module, in occurrences.

**Predicate implementation:**

```ts
// tools/readability/predicates/shadowingBinding.ts
import * as ts from "typescript";
import { isAnalyzableFunction } from "./analyzableFunction.ts";

function bindingNameOf(node: ts.Node): ts.Identifier | undefined {
  if (
    (ts.isVariableDeclaration(node) ||
      ts.isParameter(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isBindingElement(node)) &&
    node.name !== undefined &&
    ts.isIdentifier(node.name)
  ) {
    return node.name;
  }
  return undefined;
}

export function shadowingBindings(file: ts.SourceFile): readonly ts.Identifier[] {
  const found: ts.Identifier[] = [];
  const walk = (node: ts.Node, outerScopes: readonly ReadonlySet<string>[], current: Set<string>): void => {
    const name = bindingNameOf(node);
    if (name !== undefined) {
      if (outerScopes.some((scope) => scope.has(name.text))) found.push(name);
      current.add(name.text);
    }
    const opensScope =
      isAnalyzableFunction(node) || ts.isBlock(node) || ts.isCatchClause(node);
    if (opensScope) {
      const inner = new Set<string>();
      ts.forEachChild(node, (child) => walk(child, [...outerScopes, current], inner));
    } else {
      ts.forEachChild(node, (child) => walk(child, outerScopes, current));
    }
  };
  walk(file, [], new Set());
  return found;
}
```

### Reassigned binding

A reassigned binding is a variable declared with `let` or `var` that is the target of at least one
assignment or increment/decrement after its declaration — excluding the update clause of a
`for (…;…;…)` head, where the mutation sits directly beside the declaration and loop condition.
To know the variable's value at any line, the reader must scan every line between declaration and
use.

**Mechanical predicate:** Given a [source module](#source-module) and a `ts.TypeChecker`: a
variable-declaration identifier is a member iff some assignment expression (operator between
`FirstAssignment` and `LastAssignment`) or prefix/postfix `++`/`--` targets an identifier
resolving to the same symbol, and that mutating node is not the `incrementor` of a `for`
statement. Boolean per binding; count per module, in occurrences.

**Predicate implementation:**

```ts
// tools/readability/predicates/reassignedBinding.ts
import * as ts from "typescript";

const isAssignmentOperator = (kind: ts.SyntaxKind): boolean =>
  kind >= ts.SyntaxKind.FirstAssignment && kind <= ts.SyntaxKind.LastAssignment;

export function reassignedBindings(
  file: ts.SourceFile,
  checker: ts.TypeChecker,
): readonly ts.Identifier[] {
  const mutatedSymbols = new Set<ts.Symbol>();
  const visit = (node: ts.Node): void => {
    let target: ts.Expression | undefined;
    if (ts.isBinaryExpression(node) && isAssignmentOperator(node.operatorToken.kind)) {
      target = node.left;
    }
    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken ||
        node.operator === ts.SyntaxKind.MinusMinusToken)
    ) {
      target = node.operand;
    }
    const inForHead = ts.isForStatement(node.parent) && node.parent.incrementor === node;
    if (target !== undefined && ts.isIdentifier(target) && !inForHead) {
      const symbol = checker.getSymbolAtLocation(target);
      if (symbol !== undefined) mutatedSymbols.add(symbol);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  const result: ts.Identifier[] = [];
  const collect = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const symbol = checker.getSymbolAtLocation(node.name);
      if (symbol !== undefined && mutatedSymbols.has(symbol)) result.push(node.name);
    }
    ts.forEachChild(node, collect);
  };
  collect(file);
  return result;
}
```

**Example:**

```ts
declare const sizes: readonly number[];

// reassigned binding: `total` is assigned after declaration
let total = 0;
for (const size of sizes) {
  total += size;
}

// NOT a reassigned binding: `i` mutates only in the `for` head's update clause
for (let i = 0; i < sizes.length; i += 1) {
  // body reads sizes[i]
}

// NOT a reassigned binding: single assignment at declaration
const grandTotal = total;
```

### Forward reference

A forward reference is an identifier inside one [top-level declaration](#top-level-declaration)
that resolves to a binding declared by a later [top-level declaration](#top-level-declaration) of
the same [source module](#source-module). Reading top to bottom, the reader meets the use before
the definition and must scroll down and back.

#### Related terms

| Term            | Relation          | Deciding distinction                              | Why it is not interchangeable here                                     |
| --------------- | ----------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| Circular import | inter-module      | a cycle in the module graph, not one file's order  | it is a modularity concern; reordering statements cannot fix it          |
| Hoisting        | runtime mechanism | legality of use-before-declaration at runtime      | legal hoisted uses still force the reader to jump; legality ≠ readability |

```ts
// forward reference: `formatLine` is used here but declared by a later top-level declaration
export function renderReport(lines: readonly string[]): string {
  return lines.map(formatLine).join("\n");
}

// (related term hoisting makes the call above *legal*; the reader still has to jump here)
function formatLine(line: string): string {
  return `| ${line}`;
}
```

**Mechanical predicate:** Given a [source module](#source-module) and a `ts.TypeChecker`: for each
[top-level declaration](#top-level-declaration) `d`, an identifier inside `d` is a member iff its
resolved symbol's first declaration lies in the same file and starts after `d` ends. Boolean per
identifier; count per module, in occurrences.

**Predicate implementation:**

```ts
// tools/readability/predicates/forwardReference.ts
import * as ts from "typescript";
import { topLevelDeclarations } from "./topLevelDeclaration.ts";

export function forwardReferences(
  file: ts.SourceFile,
  checker: ts.TypeChecker,
): readonly ts.Identifier[] {
  const found: ts.Identifier[] = [];
  for (const statement of topLevelDeclarations(file)) {
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node)) {
        const declaration = checker.getSymbolAtLocation(node)?.declarations?.[0];
        if (
          declaration !== undefined &&
          declaration.getSourceFile() === file &&
          declaration.getStart(file) > statement.getEnd()
        ) {
          found.push(node);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(statement);
  }
  return found;
}
```

### Nested conditional expression

A nested conditional expression is a conditional (ternary) expression any of whose three operands
contains another conditional expression without an intervening
[analyzable function](#analyzable-function) boundary. The reader must evaluate a decision tree
encoded in one expression with no vertical structure to lean on.

**Mechanical predicate:** Given a [source module](#source-module): a `ts.ConditionalExpression`
is a member iff a descendant `ts.ConditionalExpression` is reachable from its condition, true, or
false operand without passing through a node satisfying the
[analyzable function](#analyzable-function) predicate. Boolean per expression; count per module,
in occurrences.

**Predicate implementation:**

```ts
// tools/readability/predicates/nestedConditional.ts
import * as ts from "typescript";
import { isAnalyzableFunction } from "./analyzableFunction.ts";

function containsTernary(node: ts.Node): boolean {
  if (isAnalyzableFunction(node)) return false; // do not cross into nested function bodies
  if (ts.isConditionalExpression(node)) return true;
  let hit = false;
  ts.forEachChild(node, (child) => {
    hit = hit || containsTernary(child);
  });
  return hit;
}

export function nestedConditionals(file: ts.SourceFile): readonly ts.ConditionalExpression[] {
  const found: ts.ConditionalExpression[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isConditionalExpression(node) &&
      [node.condition, node.whenTrue, node.whenFalse].some(containsTernary)
    ) {
      found.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}
```

**Example:**

```ts
type Status = "active" | "idle" | "failed";

// nested conditional expression: the false operand contains another ternary
export const describeNested = (status: Status, retries: number): string =>
  status === "failed" ? (retries > 0 ? "retrying" : "dead") : "running";

// NOT nested: a single ternary with no ternary operand
export const describeFlat = (status: Status): string =>
  status === "failed" ? "dead" : "running";

// NOT nested: the inner ternary sits behind a function boundary
export const describeDeferred = (status: Status): (() => string) =>
  status === "failed" ? () => (Math.random() > 0.5 ? "flaky" : "dead") : () => "running";
```

### Compound condition

A compound condition is the condition expression of an `if`, `while`, `do`, `for`, or conditional
expression that contains more than 2 logical operators (`&&`/`||`). The reader must evaluate a
boolean formula with at least four operands inline, while a named predicate would state its
meaning once.

**Mechanical predicate:** Given a [source module](#source-module): for each condition position
(the `expression` of `if`/`while`/`do`, the `condition` of `for` and of conditional expressions),
count descendant binary expressions whose operator token is `&&` or `||`; member iff the count
is > 2. Boolean per condition; count per module, in occurrences.

**Predicate implementation:**

```ts
// tools/readability/predicates/compoundCondition.ts
import * as ts from "typescript";

function conditionOf(node: ts.Node): ts.Expression | undefined {
  if (ts.isIfStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)) {
    return node.expression;
  }
  if (ts.isConditionalExpression(node)) return node.condition;
  if (ts.isForStatement(node)) return node.condition;
  return undefined;
}

function logicalOperatorCount(root: ts.Node): number {
  let count = 0;
  const visit = (node: ts.Node): void => {
    if (
      ts.isBinaryExpression(node) &&
      (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
        node.operatorToken.kind === ts.SyntaxKind.BarBarToken)
    ) {
      count += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(root);
  return count;
}

export function compoundConditions(file: ts.SourceFile): readonly ts.Expression[] {
  const found: ts.Expression[] = [];
  const visit = (node: ts.Node): void => {
    const condition = conditionOf(node);
    if (condition !== undefined && logicalOperatorCount(condition) > 2) found.push(condition);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}
```

**Example:**

```ts
interface Session {
  readonly user: string | undefined;
  readonly expired: boolean;
  readonly locked: boolean;
  readonly attempts: number;
}
declare const session: Session;

// compound condition: three logical operators in one condition position
if (session.user !== undefined && !session.expired && !session.locked && session.attempts < 3) {
  // …
}

// NOT compound: two logical operators is within the scanning budget
if (session.user !== undefined && !session.expired) {
  // …
}
```

### Wide parameter list

A wide parameter list is an [analyzable function](#analyzable-function) with more than 4
parameters (a `this` parameter excluded). Beyond that width, call sites become positional puzzles:
the reader must recall the parameter order to interpret each argument.

**Mechanical predicate:** Given an [analyzable function](#analyzable-function): value is
`max(0, parameterCount − 4)` where `parameterCount` excludes a first parameter named `this`. In
parameters (a nonnegative integer); a function is a member iff the value is positive.

**Predicate implementation:**

```ts
// tools/readability/predicates/wideParameterList.ts
import * as ts from "typescript";
import type { AnalyzableFunction } from "./analyzableFunction.ts";

const maxParameters = 4;

export function wideParameterExcess(fn: AnalyzableFunction): number {
  const parameters = fn.parameters.filter(
    (parameter) => !(ts.isIdentifier(parameter.name) && parameter.name.text === "this"),
  );
  return Math.max(0, parameters.length - maxParameters);
}
```

**Example:**

```ts
// wide parameter list: 6 parameters, excess 2
export function renderTableWide(
  rows: readonly (readonly string[])[],
  header: boolean,
  widths: readonly number[],
  separator: string,
  align: "left" | "right",
  truncateAt: number,
): string {
  return rows.length === 0 ? "" : `${header} ${widths.length} ${separator} ${align} ${truncateAt}`;
}

// NOT wide: 4 parameters, excess 0
export function renderTableNarrow(
  rows: readonly (readonly string[])[],
  widths: readonly number[],
  separator: string,
  align: "left" | "right",
): string {
  return rows.length === 0 ? "" : `${widths.length} ${separator} ${align}`;
}
```

### Boolean literal argument

A boolean literal argument is a bare `true` or `false` passed positionally to a call that has two
or more arguments. At the call site nothing states what the flag means; the reader must open the
callee to interpret it. A single-argument call is excluded because the callee expression itself is
the only thing the flag can qualify.

**Mechanical predicate:** Given a [source module](#source-module): an argument of a
`ts.CallExpression` with `arguments.length >= 2` is a member iff its kind is `TrueKeyword` or
`FalseKeyword`. Boolean per argument; count per module, in occurrences.

**Predicate implementation:**

```ts
// tools/readability/predicates/booleanLiteralArgument.ts
import * as ts from "typescript";

export function booleanLiteralArguments(file: ts.SourceFile): readonly ts.Expression[] {
  const found: ts.Expression[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && node.arguments.length >= 2) {
      for (const argument of node.arguments) {
        if (
          argument.kind === ts.SyntaxKind.TrueKeyword ||
          argument.kind === ts.SyntaxKind.FalseKeyword
        ) {
          found.push(argument);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}
```

**Example:**

```ts
declare function connect(host: string, tls: boolean, retry: boolean): void;
declare function setVerbose(enabled: boolean): void;

// boolean literal arguments: two bare flags in a multi-argument call — meaning invisible here
connect("db.local", true, false);

// NOT counted: single-argument call — the callee name is adjacent to the flag
setVerbose(true);

// NOT counted: not a *literal*; the argument's own name carries the meaning
const shouldRetry = false;
connect("db.local", shouldRetry, shouldRetry);
```

### Magic number

A magic number is a numeric literal other than `0`, `1`, or `2` whose surrounding syntax attaches
no name to it. Excluded positions, where an adjacent name or declared contract explains the value:
the initializer of a `const` variable declaration, an enum member initializer, a literal type
node, the value of a non-computed property assignment, a parameter default initializer, and an
element of an array literal (a data table, not logic).

**Mechanical predicate:** Given a [source module](#source-module): a `ts.NumericLiteral` is a
member iff `Number(literal.text) ∉ {0, 1, 2}` and its parent is none of: a `const`-flagged
variable declaration with this literal as initializer, an enum member, a literal type node, a
property assignment, a parameter with this literal as initializer, an array literal expression.
Boolean per literal; count per module, in occurrences.

**Predicate implementation:**

```ts
// tools/readability/predicates/magicNumber.ts
import * as ts from "typescript";

const unremarkable: ReadonlySet<number> = new Set([0, 1, 2]);

function isNamedPosition(literal: ts.NumericLiteral): boolean {
  const parent = literal.parent;
  return (
    (ts.isVariableDeclaration(parent) &&
      parent.initializer === literal &&
      (ts.getCombinedNodeFlags(parent) & ts.NodeFlags.Const) !== 0) || // const initializer
    ts.isEnumMember(parent) || // enum members are named
    ts.isLiteralTypeNode(parent) || // literal types are contracts, not logic
    ts.isPropertyAssignment(parent) || // the property name documents the value
    (ts.isParameter(parent) && parent.initializer === literal) || // default beside the name
    ts.isArrayLiteralExpression(parent) // data table, not logic
  );
}

export function magicNumbers(file: ts.SourceFile): readonly ts.NumericLiteral[] {
  const found: ts.NumericLiteral[] = [];
  const visit = (node: ts.Node): void => {
    if (
      ts.isNumericLiteral(node) &&
      !unremarkable.has(Number(node.text)) &&
      !isNamedPosition(node)
    ) {
      found.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}
```

**Example:**

**This:**

```ts
declare const attempts: number;

// magic number: `5` in logic with no adjacent name
export const exhausted = attempts > 5;
```

**Not this:**

```ts
declare const attempts: number;

const maxAttempts = 5; // excluded: `const` initializer — the name is adjacent
enum Level {
  Verbose = 10, // excluded: enum member initializer
}
type Port = 8080; // excluded: literal type node
const limits = { timeoutMillis: 3000 }; // excluded: named property assignment
export function retry(times: number = 3): number {
  // excluded: parameter default initializer
  return times;
}
const fibonacci = [3, 5, 8, 13]; // excluded: array literal element (data table)
export const exhausted = attempts > maxAttempts && Level.Verbose > limits.timeoutMillis;
```

### Combinator orientation

The combinator orientation of a call to a dual `effect`-package function is which of its two call
shapes it uses: **data-first**, where the subject [Effect value](#effect-value) is the first
argument (`Effect.map(subject, f)`), or **pipe-position**, where the partially-applied combinator
appears as an argument of a `pipe` call (`subject.pipe(Effect.map(f))`). For one combinator
symbol, an **orientation minority call** is a call in whichever orientation the project uses less
often (ties count the data-first calls as the minority). Mixing orientations forces the reader to
re-derive, per call site, where the subject is.

**Mechanical predicate:** Given the [program under measurement](#program-under-measurement) and a
`ts.TypeChecker`: for every call in every [source module](#source-module) whose callee is a
property access resolving to an `effect`-package symbol, classify it pipe-position iff its parent
is a call whose callee is named `pipe`, else data-first iff its first argument's type satisfies
[Effect value](#effect-value); group by resolved symbol; for each symbol used in both
orientations, the members are the calls of the smaller group (data-first on ties). Boolean per
call; count per module, in occurrences.

**Predicate implementation:**

```ts
// tools/readability/predicates/combinatorOrientation.ts
import * as ts from "typescript";
import { declaringPackageName, isEffectType } from "./effectValue.ts";
import { isSourceModule } from "./sourceModule.ts";

function isPipeCallee(expression: ts.Expression): boolean {
  return (
    (ts.isPropertyAccessExpression(expression) && expression.name.text === "pipe") ||
    (ts.isIdentifier(expression) && expression.text === "pipe")
  );
}

export function orientationMinorityCalls(
  program: ts.Program,
  checker: ts.TypeChecker,
): readonly ts.CallExpression[] {
  const groups = new Map<
    ts.Symbol,
    { dataFirst: ts.CallExpression[]; pipePosition: ts.CallExpression[] }
  >();
  for (const file of program.getSourceFiles()) {
    if (!isSourceModule(file, program)) continue;
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
        const symbol = checker.getSymbolAtLocation(node.expression.name);
        if (symbol !== undefined && declaringPackageName(symbol) === "effect") {
          const group = groups.get(symbol) ?? { dataFirst: [], pipePosition: [] };
          const parent = node.parent;
          const inPipe =
            ts.isCallExpression(parent) &&
            isPipeCallee(parent.expression) &&
            parent.arguments.includes(node);
          const first = node.arguments[0];
          if (inPipe) group.pipePosition.push(node);
          else if (first !== undefined && isEffectType(checker.getTypeAtLocation(first))) {
            group.dataFirst.push(node);
          }
          groups.set(symbol, group);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  const minority: ts.CallExpression[] = [];
  for (const { dataFirst, pipePosition } of groups.values()) {
    if (dataFirst.length === 0 || pipePosition.length === 0) continue; // one orientation: consistent
    minority.push(...(dataFirst.length <= pipePosition.length ? dataFirst : pipePosition));
  }
  return minority;
}
```

**Example:**

```ts
import { Effect } from "effect";

declare const price: Effect.Effect<number>;
declare const quantity: Effect.Effect<number>;
declare const shipping: Effect.Effect<number>;

// pipe-position orientation of `Effect.map` (used twice below — the majority)
export const withTax = price.pipe(Effect.map((value) => value * 1.2));
export const doubledQuantity = quantity.pipe(Effect.map((value) => value * 2));

// data-first orientation of the same combinator — the orientation minority call
export const roundedShipping = Effect.map(shipping, (value) => Math.round(value));
```

### Documented export

A documented export is an [exported declaration](#exported-declaration) whose attached JSDoc
comment contains at least 20 characters of comment text (tag names excluded). For a variable, the
JSDoc attaches to the enclosing variable statement. An exported declaration that is not a
documented export is an **undocumented export**.

**Mechanical predicate:** Given an [exported declaration](#exported-declaration): resolve the
JSDoc anchor (the enclosing variable statement for a variable declarator, else the declaration
itself); concatenate the comment text of `ts.getJSDocCommentsAndTags(anchor)` via
`ts.getTextOfJSDocComment`; member iff the trimmed length is ≥ 20 characters. Boolean per export;
the undocumented-export count is per module, in occurrences.

**Predicate implementation:**

```ts
// tools/readability/predicates/documentedExport.ts
import * as ts from "typescript";
import { exportedDeclarations } from "./exportedDeclaration.ts";

const minimumDocLength = 20;

export function docText(declaration: ts.Declaration): string {
  const anchor =
    ts.isVariableDeclaration(declaration) &&
    ts.isVariableDeclarationList(declaration.parent) &&
    ts.isVariableStatement(declaration.parent.parent)
      ? declaration.parent.parent // JSDoc attaches to the statement, not the declarator
      : declaration;
  return ts
    .getJSDocCommentsAndTags(anchor)
    .map((doc) => ts.getTextOfJSDocComment(doc.comment) ?? "")
    .join(" ")
    .trim();
}

export function undocumentedExports(
  file: ts.SourceFile,
  checker: ts.TypeChecker,
): readonly ts.Declaration[] {
  return exportedDeclarations(file, checker).filter(
    (declaration) => docText(declaration).length < minimumDocLength,
  );
}
```

**Example:**

```ts
/**
 * Renders one report line with the table prefix. // documented export: ≥ 20 characters of prose
 */
export function formatLine(line: string): string {
  return `| ${line}`;
}

/** ok */ // undocumented export: comment text is shorter than 20 characters
export function pad(line: string): string {
  return ` ${line} `;
}

// undocumented export: no JSDoc at all (a plain comment is not JSDoc)
export const separator = "|";
```

### Readability cost

The readability cost of a [source module](#source-module) is the weighted sum, in points, of its
component counts. Each component is one already-defined degradation mechanism; the weight table
below is part of the metric's identity — changing any weight is a new metric version. The
project's readability cost is the sum over its [source modules](#source-module).

| Component key            | Counted quantity                                                                             | Weight (points) |
| ------------------------ | -------------------------------------------------------------------------------------------- | --------------- |
| `cognitiveCost`          | [cognitive cost](#cognitive-cost) points over all [analyzable functions](#analyzable-function) | 1 per point     |
| `spanExcess`             | per function, `ceil(max(0, functionSpan − 40) / 10)` using [function span](#function-span)   | 1 per unit      |
| `chainExcess`            | per [sequential chain](#sequential-chain), `max(0, chainLength − 2)`                          | 2 per stage     |
| `untypedFailure`         | [untyped failures](#untyped-failure)                                                          | 8 each          |
| `escapeHatch`            | [escape hatches](#escape-hatch)                                                               | 6 each          |
| `annotationGap`          | [annotation gaps](#annotation-gap)                                                            | 4 each          |
| `opaqueIdentifier`       | [opaque identifiers](#opaque-identifier)                                                      | 3 each          |
| `shadowingBinding`       | [shadowing bindings](#shadowing-binding)                                                      | 4 each          |
| `reassignedBinding`      | [reassigned bindings](#reassigned-binding)                                                    | 2 each          |
| `forwardReference`       | [forward references](#forward-reference)                                                      | 1 each          |
| `nestedConditional`      | [nested conditional expressions](#nested-conditional-expression)                              | 4 each          |
| `compoundCondition`      | [compound conditions](#compound-condition)                                                    | 2 each          |
| `wideParameterList`      | [wide parameter list](#wide-parameter-list) excess parameters                                 | 3 per parameter |
| `booleanLiteralArgument` | [boolean literal arguments](#boolean-literal-argument)                                        | 2 each          |
| `magicNumber`            | [magic numbers](#magic-number)                                                                | 1 each          |
| `orientationMinority`    | [orientation minority calls](#combinator-orientation)                                         | 1 each          |
| `undocumentedExport`     | undocumented exports per [documented export](#documented-export)                              | 2 each          |

#### Related terms

| Term                  | Relation           | Deciding distinction                                     | Why it is not interchangeable here                                            |
| --------------------- | ------------------ | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Cyclomatic complexity | partial ingredient | branch count only; blind to names, types, failure channels | most degradation mechanisms above are invisible to it                            |
| Maintainability index | composite neighbor | regression formula over Halstead volume/LOC/cyclomatic    | opaque weights, no per-mechanism decomposition, no lever can target one term      |
| Lines of code         | size proxy         | measures amount, not difficulty                            | rewarding deletion alone invites removing functionality rather than clarifying it |

**Mechanical predicate:** Given a [source module](#source-module), its
[program under measurement](#program-under-measurement), a `ts.TypeChecker`, and the project-wide
[orientation minority call](#combinator-orientation) set: evaluate every component count with the
definitions' predicate implementations, multiply by the table's weights, and sum. Value in points
(a nonnegative integer).

**Predicate implementation:**

```ts
// tools/readability/cost.ts
import * as ts from "typescript";
import { isAnalyzableFunction, type AnalyzableFunction } from "./predicates/analyzableFunction.ts";
import { annotationGaps } from "./predicates/annotationGap.ts";
import { booleanLiteralArguments } from "./predicates/booleanLiteralArgument.ts";
import { cognitiveCost } from "./predicates/cognitiveCost.ts";
import { compoundConditions } from "./predicates/compoundCondition.ts";
import { undocumentedExports } from "./predicates/documentedExport.ts";
import { escapeHatches } from "./predicates/escapeHatch.ts";
import { forwardReferences } from "./predicates/forwardReference.ts";
import { functionSpan } from "./predicates/functionSpan.ts";
import { magicNumbers } from "./predicates/magicNumber.ts";
import { nestedConditionals } from "./predicates/nestedConditional.ts";
import { opaqueIdentifiers } from "./predicates/opaqueIdentifier.ts";
import { reassignedBindings } from "./predicates/reassignedBinding.ts";
import { sequentialChainLengths } from "./predicates/sequentialChain.ts";
import { shadowingBindings } from "./predicates/shadowingBinding.ts";
import { untypedFailures } from "./predicates/untypedFailure.ts";
import { wideParameterExcess } from "./predicates/wideParameterList.ts";

export const weights = {
  cognitiveCost: 1,
  spanExcess: 1,
  chainExcess: 2,
  untypedFailure: 8,
  escapeHatch: 6,
  annotationGap: 4,
  opaqueIdentifier: 3,
  shadowingBinding: 4,
  reassignedBinding: 2,
  forwardReference: 1,
  nestedConditional: 4,
  compoundCondition: 2,
  wideParameterList: 3,
  booleanLiteralArgument: 2,
  magicNumber: 1,
  orientationMinority: 1,
  undocumentedExport: 2,
} as const;

export type ComponentKey = keyof typeof weights;
export type ComponentCounts = Readonly<Record<ComponentKey, number>>;

const spanThreshold = 40;
const spanUnit = 10;
const chainBudget = 2;

export function moduleComponentCounts(
  file: ts.SourceFile,
  checker: ts.TypeChecker,
  orientationMinorityInFile: number,
): ComponentCounts {
  const functions: AnalyzableFunction[] = [];
  const collect = (node: ts.Node): void => {
    if (isAnalyzableFunction(node)) functions.push(node);
    ts.forEachChild(node, collect);
  };
  collect(file);
  const sum = (values: readonly number[]): number => values.reduce((a, b) => a + b, 0);
  return {
    cognitiveCost: sum(functions.map((fn) => cognitiveCost(fn, checker))),
    spanExcess: sum(
      functions.map((fn) => Math.ceil(Math.max(0, functionSpan(fn) - spanThreshold) / spanUnit)),
    ),
    chainExcess: sum(
      sequentialChainLengths(file, checker).map((length) => Math.max(0, length - chainBudget)),
    ),
    untypedFailure: untypedFailures(file, checker).length,
    escapeHatch: escapeHatches(file).length,
    annotationGap: annotationGaps(file, checker).length,
    opaqueIdentifier: opaqueIdentifiers(file, checker).length,
    shadowingBinding: shadowingBindings(file).length,
    reassignedBinding: reassignedBindings(file, checker).length,
    forwardReference: forwardReferences(file, checker).length,
    nestedConditional: nestedConditionals(file).length,
    compoundCondition: compoundConditions(file).length,
    wideParameterList: sum(functions.map(wideParameterExcess)),
    booleanLiteralArgument: booleanLiteralArguments(file).length,
    magicNumber: magicNumbers(file).length,
    orientationMinority: orientationMinorityInFile,
    undocumentedExport: undocumentedExports(file, checker).length,
  };
}

export function moduleCost(counts: ComponentCounts): number {
  return (Object.keys(weights) as readonly ComponentKey[]).reduce(
    (total, key) => total + weights[key] * counts[key],
    0,
  );
}
```

**Example:** a recorded per-module valuation showing the arithmetic.

```jsonc
// one module's readability cost: counts × weights, summed
{
  "path": "packages/core/src/loader.ts",
  "components": {
    "cognitiveCost": 12, // 12 points × 1
    "spanExcess": 1, // one 47-line function: ceil((47 − 40) / 10) = 1 × 1
    "chainExcess": 2, // one chain of length 4: (4 − 2) × 2 = 4 points
    "untypedFailure": 1, // 1 × 8
    "escapeHatch": 0,
    "annotationGap": 1, // 1 × 4
    "opaqueIdentifier": 2, // 2 × 3
    "shadowingBinding": 0,
    "reassignedBinding": 1, // 1 × 2
    "forwardReference": 3, // 3 × 1
    "nestedConditional": 0,
    "compoundCondition": 1, // 1 × 2
    "wideParameterList": 0,
    "booleanLiteralArgument": 2, // 2 × 2
    "magicNumber": 4, // 4 × 1
    "orientationMinority": 1, // 1 × 1
    "undocumentedExport": 2, // 2 × 2
  },
  "value": 47, // 12+1+4+8+0+4+6+0+2+3+0+2+0+4+4+1+4
}
```

### Noise floor

The noise floor of a measurement protocol is the smallest difference between two measured values,
in the metric's own units, that the protocol treats as a real change rather than run-to-run
variance. For the [readability cost](#readability-cost) protocol the noise floor is **0 points**:
the value is a pure function of file bytes and pinned tool versions, with no execution, sampling,
timing, or randomness anywhere in the procedure, so two runs over identical inputs produce
identical values.

#### Related terms

| Term                | Relation        | Deciding distinction                             | Why it is not interchangeable here                                      |
| ------------------- | --------------- | ------------------------------------------------- | -------------------------------------------------------------------------- |
| Statistical variance | source of noise | property of repeated stochastic runs             | a static metric has no run distribution; its variance is exactly zero      |
| Tolerance            | policy choice   | how much *real* change a team chooses to ignore  | the noise floor is what the protocol *cannot distinguish*, not a preference |

**Mechanical predicate:** Given two [measurement records](#measurement-record) with equal metric
identity: their difference is a real change iff `|after.value − before.value| > noiseFloor`, with
`noiseFloor = 0`. Value in points.

**Predicate implementation:**

```ts
// tools/readability/noiseFloor.ts

/** 0 points: the procedure is static and exactly deterministic. */
export const noiseFloor = 0;

export function isRealChange(beforeValue: number, afterValue: number): boolean {
  return Math.abs(afterValue - beforeValue) > noiseFloor;
}
```

**Example:**

```jsonc
// two runs over the same inputs digest MUST report the same value (noise floor 0)
{
  "runA": { "inputsDigest": "sha256:6f2a…", "value": 431 },
  "runB": { "inputsDigest": "sha256:6f2a…", "value": 431 },
  // any nonzero delta between runs with equal digests is a protocol bug, not noise
  "delta": 0,
}
```

### Measurement record

A measurement record is the machine-readable result of one run of the measurement procedure. It
contains: the metric identity (name, format version, unit, weight-table digest), the measured
value, the [noise floor](#noise-floor), the pinned environment (tool versions, `tsconfig` path),
an inputs digest (a SHA-256 over the sorted file list and per-file content hashes of the
[program under measurement](#program-under-measurement)), the companion values used by the
anti-gaming invariants, the per-module decomposition, and an informational timestamp excluded
from all comparisons.

**Mechanical predicate:** Given a JSON document: member iff it carries every field of the
`MeasurementRecord` interface below with the stated types, `metric === "readability-cost"`,
`noiseFloor === 0`, and `diagnosticCount === 0` (a record taken from a program with semantic
errors is invalid). Boolean.

**Predicate implementation:**

```ts
// tools/readability/record.ts
import type { ComponentCounts } from "./cost.ts";

export interface ModuleEntry {
  readonly path: string;
  readonly value: number;
  readonly components: ComponentCounts;
}

export interface Companions {
  readonly exportSurfaceDigest: string;
  readonly dependencyNamesDigest: string;
  readonly strictFlagsDigest: string;
  readonly duplicateDocBodies: number;
  readonly assertionForwarderCallsites: number;
  readonly sourceModuleCount: number;
  readonly codeLines: number;
  readonly diagnosticCount: number;
}

export interface MeasurementRecord {
  readonly metric: "readability-cost";
  readonly formatVersion: 1;
  readonly unit: "points";
  readonly value: number;
  readonly noiseFloor: 0;
  readonly weightTableDigest: string;
  readonly toolVersions: { readonly typescript: string; readonly effect: string };
  readonly tsconfigPath: string;
  readonly inputsDigest: string;
  readonly companions: Companions;
  readonly modules: readonly ModuleEntry[];
  readonly measuredAt: string; // informational only; excluded from every comparison
}

export function isMeasurementRecord(candidate: unknown): candidate is MeasurementRecord {
  if (typeof candidate !== "object" || candidate === null) return false;
  const record = candidate as Partial<MeasurementRecord>;
  return (
    record.metric === "readability-cost" &&
    record.formatVersion === 1 &&
    record.unit === "points" &&
    typeof record.value === "number" &&
    record.noiseFloor === 0 &&
    typeof record.weightTableDigest === "string" &&
    typeof record.inputsDigest === "string" &&
    typeof record.companions === "object" &&
    record.companions !== null &&
    record.companions.diagnosticCount === 0 && // a program with errors yields no valid record
    Array.isArray(record.modules)
  );
}

export type Comparison = "improvement" | "regression" | "no-change";

export function compareRecords(before: MeasurementRecord, after: MeasurementRecord): Comparison {
  if (
    before.metric !== after.metric ||
    before.formatVersion !== after.formatVersion ||
    before.weightTableDigest !== after.weightTableDigest
  ) {
    throw new Error("records measure different metrics and are not comparable");
  }
  const delta = after.value - before.value;
  if (delta < -before.noiseFloor) return "improvement";
  if (delta > before.noiseFloor) return "regression";
  return "no-change";
}
```

**Example:** a complete record (fields annotated).

```jsonc
{
  "metric": "readability-cost", // metric identity
  "formatVersion": 1, // record format version
  "unit": "points", // the metric's unit
  "value": 431, // the measured value: sum over all modules
  "noiseFloor": 0, // static metric: zero
  "weightTableDigest": "sha256:91c4d0f3…", // digest of the weight table (metric version)
  "toolVersions": {
    "typescript": "6.0.3", // pinned compiler version (environment control)
    "effect": "4.0.0-beta.98", // pinned effect version (environment control)
  },
  "tsconfigPath": "tsconfig.selfhost.json", // the fixed config that defines the program
  "inputsDigest": "sha256:6f2a88b1…", // sorted file list + per-file content hashes
  "companions": {
    "exportSurfaceDigest": "sha256:aa310c77…", // anti-deletion invariant input
    "dependencyNamesDigest": "sha256:0be2f4d9…", // anti-boundary-shift invariant input
    "strictFlagsDigest": "sha256:5d1c22ab…", // anti-laxity invariant input
    "duplicateDocBodies": 0, // anti-doc-stuffing companion count
    "assertionForwarderCallsites": 0, // anti-assertion-laundering companion count
    "sourceModuleCount": 74, // measured module count
    "codeLines": 11842, // total code lines (context for review)
    "diagnosticCount": 0, // must be zero for the record to be valid
  },
  "modules": [
    {
      "path": "packages/core/src/loader.ts", // decomposition entry (sorted by path)
      "value": 47,
      "components": { "cognitiveCost": 12, "untypedFailure": 1, "spanExcess": 1, "chainExcess": 2, "escapeHatch": 0, "annotationGap": 1, "opaqueIdentifier": 2, "shadowingBinding": 0, "reassignedBinding": 1, "forwardReference": 3, "nestedConditional": 0, "compoundCondition": 1, "wideParameterList": 0, "booleanLiteralArgument": 2, "magicNumber": 4, "orientationMinority": 1, "undocumentedExport": 2 },
    },
  ],
  "measuredAt": "2026-07-28T12:00:00Z", // informational; excluded from comparisons
}
```

## Measurement

### Metric

- **Name:** readability cost (RC), as defined by [readability cost](#readability-cost).
- **Unit:** points.
- **Scale:** count (a nonnegative integer; every weight and count is an integer).
- **Direction of goodness:** smaller is better.
- **Domain:** the whole [program under measurement](#program-under-measurement), decomposed per
  [source module](#source-module) and, within a module, per component and per
  [analyzable function](#analyzable-function).
- **Observable inputs:** the bytes of every file of the
  [program under measurement](#program-under-measurement); the `tsconfig` file that defines it
  (compiler options change resolution, types, and therefore counts); the pinned TypeScript and
  effect versions from `bun.lock`; the external library declaration files those versions install
  (they resolve the symbols the predicates test against); and the
  [readability cost](#readability-cost) weight table.
- **Exclusions:** declaration files and external library files contribute no counts (they inform
  resolution only, per [source module](#source-module)); comment content is excluded except JSDoc
  presence/length (per [documented export](#documented-export)) and suppression directives (per
  [escape hatch](#escape-hatch)); whitespace and formatting are excluded — the pinned formatter
  normalizes them, and [code line](#code-line) counting ignores blank and comment-only lines; git
  history, timestamps, runtime behavior, and test outcomes are excluded from the value (test
  outcomes gate confirmations, not the metric).
- **Validity (proxy audit):** RC is a proxy for human comprehension effort, not the property
  itself. Known divergences: (1) it cannot judge whether a multi-character name is *meaningful* —
  `dataThing` scores like `parsedManifest`; (2) it cannot judge whether a doc comment or name is
  *truthful*; (3) it does not model the reader's familiarity with domain concepts or with the
  Effect vocabulary; (4) essential algorithmic complexity scores the same as accidental
  complexity; (5) inconsistent vocabulary across modules (two names for one concept) is not
  counted. Divergences (1) and (2) are partially covered by companion invariants
  (doc-body uniqueness; see [Invariants against gaming](#invariants-against-gaming)); (3)–(5) are
  accepted residual gaps and MUST be covered by human review, not by this metric.

### Procedure

Environment controls: TypeScript and effect versions pinned by `bun.lock`; the `tsconfig` path
fixed to `tsconfig.selfhost.json`; single-threaded execution; modules and components iterated in
sorted order; no network, no randomness, no timing anywhere in the valuation. The
[noise floor](#noise-floor) is 0 points: the value is a pure function of the observable inputs —
the compiler's parser, binder, and checker are deterministic for fixed inputs and versions, and no
step executes measured code. Warmup, repetition, and aggregation-across-runs are therefore not
applicable; a single run is the measurement.

Ordered procedure:

1. Read the pinned tool versions from `bun.lock`; refuse to measure if the installed `typescript`
   or `effect` version differs.
2. Build the [program under measurement](#program-under-measurement) from the fixed `tsconfig`
   path.
3. If the program has any semantic diagnostic, abort: no valid
   [measurement record](#measurement-record) exists for a broken program.
4. Enumerate [source modules](#source-module), sorted by file path (byte order).
5. Compute the project-wide [orientation minority call](#combinator-orientation) set once, and
   partition it by containing module.
6. For each module, evaluate every component count with the definitions' predicate
   implementations, and value the module per [readability cost](#readability-cost).
7. Sum module values into the project value; compute the inputs digest (SHA-256 over the sorted
   file list and per-file content hashes), the weight-table digest, and the companion values.
8. Emit the [measurement record](#measurement-record) with sorted module entries.

**Measurement implementation:**

```ts
// tools/readability/measure.ts
import * as crypto from "node:crypto";
import * as ts from "typescript";
import { moduleComponentCounts, moduleCost, weights } from "./cost.ts";
import { orientationMinorityCalls } from "./predicates/combinatorOrientation.ts";
import { programUnderMeasurement } from "./predicates/programUnderMeasurement.ts";
import { isSourceModule } from "./predicates/sourceModule.ts";
import { codeLineNumbers } from "./predicates/codeLine.ts";
import type { MeasurementRecord, ModuleEntry } from "./record.ts";

const sha256 = (text: string): string =>
  `sha256:${crypto.createHash("sha256").update(text).digest("hex")}`;

export function measure(
  tsconfigPath: string,
  toolVersions: { readonly typescript: string; readonly effect: string },
  companions: MeasurementRecord["companions"],
): MeasurementRecord {
  const program = programUnderMeasurement(tsconfigPath); // step 2
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length > 0) throw new Error("program has diagnostics; no valid record"); // step 3
  const checker = program.getTypeChecker();
  const files = program
    .getSourceFiles()
    .filter((file) => isSourceModule(file, program))
    .sort((a, b) => (a.fileName < b.fileName ? -1 : 1)); // step 4
  const minorityByFile = new Map<string, number>(); // step 5
  for (const call of orientationMinorityCalls(program, checker)) {
    const key = call.getSourceFile().fileName;
    minorityByFile.set(key, (minorityByFile.get(key) ?? 0) + 1);
  }
  const modules: ModuleEntry[] = files.map((file) => {
    const components = moduleComponentCounts(file, checker, minorityByFile.get(file.fileName) ?? 0); // step 6
    return { path: file.fileName, value: moduleCost(components), components };
  });
  const value = modules.reduce((total, entry) => total + entry.value, 0); // step 7
  const inputsDigest = sha256(
    files.map((file) => `${file.fileName}\n${sha256(file.text)}`).join("\n"),
  );
  return {
    metric: "readability-cost",
    formatVersion: 1,
    unit: "points",
    value,
    noiseFloor: 0,
    weightTableDigest: sha256(JSON.stringify(weights)),
    toolVersions, // step 1: verified by the caller against bun.lock
    tsconfigPath,
    inputsDigest,
    companions: {
      ...companions,
      sourceModuleCount: files.length,
      codeLines: files.reduce((total, file) => total + codeLineNumbers(file).size, 0),
      diagnosticCount: diagnostics.length,
    },
    modules, // step 8
    measuredAt: new Date().toISOString(), // informational only
  };
}
```

### Decomposition

Attribution granularity, using exactly the aggregate metric's predicates:

- **Per module:** every component count is computed per [source module](#source-module); a
  module's value is `moduleCost(components)`.
- **Per function within a module:** `cognitiveCost`, `spanExcess`, `chainExcess`, and
  `wideParameterList` attribute to the innermost enclosing
  [analyzable function](#analyzable-function) (chains and every occurrence-shaped count attach to
  the function containing the occurrence; occurrences outside any function attach to the module
  preamble). `annotationGap`, `forwardReference`, `orientationMinority`, and `undocumentedExport`
  attribute to their [top-level declaration](#top-level-declaration).
- **Composition law:** the project value is the sum of module values; a module's value is the
  weighted sum of its component counts; each component count is the sum of its per-function or
  per-declaration occurrences. Sums are exact — no averaging, so no attribution is lost and the
  largest contributors are always identifiable by sorting entries by value.

### Baseline and regression tracking

The baseline is the last accepted [measurement record](#measurement-record), stored at
`docs/readability-baseline.json` (the complete record example under
[measurement record](#measurement-record) is the format). Comparison procedure between a baseline
record and a candidate record:

1. Validate both with `isMeasurementRecord`; an invalid record aborts the comparison.
2. Require equal `metric`, `formatVersion`, and `weightTableDigest`; otherwise the records measure
   different metrics and no comparison is made.
3. Compute `delta = candidate.value − baseline.value` and classify with `compareRecords`:
   `improvement` iff `delta < −0`, `regression` iff `delta > 0`, else `no-change` — the
   [noise floor](#noise-floor) is 0, so every nonzero delta is real.
4. Success criterion for accepting a candidate as the new baseline: classification is
   `improvement` or `no-change`, **and** every applicable invariant in
   [Invariants against gaming](#invariants-against-gaming) holds. A `regression` requires either
   reverting or an explicit, recorded decision that the regression is justified (e.g. a new
   feature whose code is genuinely new).

If two runs over the same `inputsDigest` ever disagree, the protocol itself is broken (see
[noise floor](#noise-floor)); fix the tooling before trusting any further records.

## Optimization

Levers are ordered by expected impact per unit of change risk: mechanical renames and reorderings
first, typed-failure and checker-facing repairs next, then structural rewrites, then API-shape
changes that touch callers, and documentation last. Every lever's applicability is decidable from
a [measurement record](#measurement-record)'s decomposition alone. Every confirmation uses the
measure → transform → measure procedure with the success criterion of
[Baseline and regression tracking](#baseline-and-regression-tracking), plus the lever's own
component criterion.

### Eliminate shadowing bindings

Every [shadowing binding](#shadowing-binding) MUST be renamed so that no name in an inner scope
equals a name visible from an enclosing scope.

#### Applicability

Applies iff some module entry in the [measurement record](#measurement-record) has
`components.shadowingBinding > 0`.

#### Effect on metric

Degradation mechanism: a shadowed name makes every mention below the inner declaration ambiguous
until the reader re-derives scope boundaries; the metric prices each such binding at 4 points.
Renaming removes the [shadowing binding](#shadowing-binding) count one-for-one: predicted change
is −4 points per binding, with no other component predicted to move (a rename changes no
structure, types, or exports).

#### Trade-offs

A longer replacement name can push a line past the formatter's width and wrap it, which can raise
[function span](#function-span) by a line; detectable as a `spanExcess` increase in the same
module entry. No other measured property can worsen.

**Before:**

```ts
declare const users: readonly { readonly name: string }[];

const name = "report";
export const lines = users.map((user) => {
  const name = user.name; // shadowing binding: hides the outer `name`
  return `${name}!`;
});
export const title = `${name}: ${lines.length}`;
```

**After:**

```ts
declare const users: readonly { readonly name: string }[];

const name = "report";
export const lines = users.map((user) => {
  const userName = user.name; // renamed: no visible name is hidden
  return `${userName}!`;
});
export const title = `${name}: ${lines.length}`;
```

#### Confirmation

Measure, rename every reported binding (an LSP rename keeps all references consistent), measure
again. Confirmed iff the comparison is `improvement`, the project-wide `shadowingBinding` count
decreased by the number of renamed bindings, and every applicable invariant holds.

**Confirmation implementation:**

```ts
// tools/readability/confirm/eliminateShadowing.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "shadowingBinding"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmEliminateShadowing(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "shadowingBinding") < componentTotal(before, "shadowingBinding") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Rename opaque identifiers

Every [opaque identifier](#opaque-identifier) MUST be renamed to a name with more than two
alphabetic characters that survives its full live range.

#### Applicability

Applies iff some module entry has `components.opaqueIdentifier > 0`.

#### Effect on metric

Degradation mechanism: a near-empty name forces the reader to carry the binding's meaning in
memory across its whole live range, re-deriving it at each use. Renaming removes each
[opaque identifier](#opaque-identifier): predicted −3 points per binding.

#### Trade-offs

As with shadowing renames, longer names can wrap lines and raise `spanExcess` by a point in rare
cases; detectable in the same module entry. Nothing else measured can worsen.

**Before:**

```ts
declare function parseConfig(text: string): { readonly host: string };
declare function register(host: string): void;
declare const rawLines: readonly string[];

const c = parseConfig("host=db.local"); // opaque identifier: alive for 10+ code lines
for (const line of rawLines) {
  register(line);
  register(line.trim());
  register(line.toUpperCase());
  register(line.toLowerCase());
  register(line.slice(1));
  register(line.padStart(2));
  register(line.padEnd(2));
  register(line.repeat(1));
}
export const host = c.host;
```

**After:**

```ts
declare function parseConfig(text: string): { readonly host: string };
declare function register(host: string): void;
declare const rawLines: readonly string[];

const databaseConfig = parseConfig("host=db.local"); // renamed: meaning survives the live range
for (const line of rawLines) {
  register(line);
  register(line.trim());
  register(line.toUpperCase());
  register(line.toLowerCase());
  register(line.slice(1));
  register(line.padStart(2));
  register(line.padEnd(2));
  register(line.repeat(1));
}
export const host = databaseConfig.host;
```

#### Confirmation

Measure, rename every reported binding, measure again. Confirmed iff `improvement`, the
project-wide `opaqueIdentifier` count decreased by the number of renames, and invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/renameOpaque.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "opaqueIdentifier"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmRenameOpaque(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "opaqueIdentifier") < componentTotal(before, "opaqueIdentifier") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Replace untyped failures with tagged failure classes

Every [untyped failure](#untyped-failure) MUST be replaced by failing with an instance of a
[tagged failure class](#tagged-failure-class) declared via `Schema.TaggedErrorClass`, so the
error channel names every failure.

#### Applicability

Applies iff some module entry has `components.untypedFailure > 0`.

#### Effect on metric

Degradation mechanism: a thrown error or untagged payload makes the failure path invisible or
unselectable in the types; the reader must trace call bodies to learn what can go wrong. Each
conversion removes one [untyped failure](#untyped-failure): predicted −8 points per occurrence.
Converting a `throw` (case a) into `Effect.fail` of a tagged class also removes the hidden
control-flow jump; converting an exported `Error`-channel (case c) turns the module's public
failure contract into a named union.

#### Trade-offs

The tagged class declaration adds lines to the module (a few `spanExcess`-relevant lines if placed
inside a function — place it at top level, where no span is measured). Callers matching on the old
payload shape must be updated; detectable by the type checker (`diagnosticCount` must return to
0 before a valid record exists).

**Before:**

```ts
import { Effect } from "effect";

declare const lookup: (id: string) => string | undefined;

// untyped failure (case b): the payload has no string-literal `_tag`
export const findUser = (id: string): Effect.Effect<string, Error> => {
  const name = lookup(id);
  return name === undefined ? Effect.fail(new Error(`no user ${id}`)) : Effect.succeed(name);
};
```

**After:**

```ts
import { Effect, Schema } from "effect";

declare const lookup: (id: string) => string | undefined;

class UserNotFound extends Schema.TaggedErrorClass<UserNotFound>()("UserNotFound", {
  id: Schema.String,
}) {}

// the failure is named, typed, and selectable with `catchTag`
export const findUser = (id: string): Effect.Effect<string, UserNotFound> => {
  const name = lookup(id);
  return name === undefined ? Effect.fail(new UserNotFound({ id })) : Effect.succeed(name);
};
```

#### Confirmation

Measure, convert every reported occurrence, measure again. Confirmed iff `improvement`, the
project-wide `untypedFailure` count decreased by the number of conversions, and invariants hold
(in particular the export surface digest: the export *names* must not change, though their error
channels will).

**Confirmation implementation:**

```ts
// tools/readability/confirm/tagFailures.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "untypedFailure"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmTagFailures(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "untypedFailure") < componentTotal(before, "untypedFailure") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Remove escape hatches

Every [escape hatch](#escape-hatch) MUST be replaced by a construct the checker verifies: a type
guard, a schema decode, `satisfies`, `unknown` with narrowing, or a corrected upstream type.

#### Applicability

Applies iff some module entry has `components.escapeHatch > 0`.

#### Effect on metric

Degradation mechanism: an assertion or suppression makes the written types lie — the reader can no
longer trust the most load-bearing documentation the file has. Each removal is predicted
−6 points. Replacements that use narrowing may add a small `cognitiveCost` (+1 for a guard `if`
or ternary), so the net predicted change is between −5 and −6 points per occurrence.

#### Trade-offs

Guards add runtime checks on hot paths (visible in the whole-process self-host benchmark); a failed decode needs
an error path, which may add a [tagged failure class](#tagged-failure-class) declaration.
Detectable: whole-process self-host runtime regression, or `cognitiveCost` rising by more than 1 per removed
hatch.

**Before:**

```ts
import { Effect } from "effect";

// escape hatch: `as number` asserts what the checker cannot verify
export const parsePort = (raw: unknown): Effect.Effect<number> => Effect.succeed(raw as number);
```

**After:**

```ts
import { Effect, Schema } from "effect";

class InvalidPort extends Schema.TaggedErrorClass<InvalidPort>()("InvalidPort", {
  raw: Schema.String,
}) {}

// the checker verifies the narrowing; the failure path is typed instead of asserted away
export const parsePort = (raw: unknown): Effect.Effect<number, InvalidPort> =>
  typeof raw === "number" ? Effect.succeed(raw) : Effect.fail(new InvalidPort({ raw: String(raw) }));
```

#### Confirmation

Measure, replace every reported hatch, measure again. Confirmed iff `improvement`, the
project-wide `escapeHatch` count decreased by the number of removals, the
`assertionForwarderCallsites` companion did not increase (no laundering), and invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/removeEscapeHatches.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "escapeHatch"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmRemoveEscapeHatches(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "escapeHatch") < componentTotal(before, "escapeHatch") &&
    after.companions.assertionForwarderCallsites <=
      before.companions.assertionForwarderCallsites &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Linearize long sequential chains into generator form

A [sequential chain](#sequential-chain) with chain length greater than 2 SHOULD be rewritten as a
[generator form](#generator-form), one `yield*` per former continuation stage.

#### Applicability

Applies iff some module entry has `components.chainExcess > 0`.

#### Effect on metric

Degradation mechanism: each continuation stage opens a callback scope the reader must stack;
beyond two stages the intermediate values' names and types stop being simultaneously visible. The
rewrite reduces `chainExcess` to 0 for the chain: predicted −2 points per excess stage. Each
former callback body becomes a linear statement, which can also reduce `cognitiveCost` when the
callbacks contained structural constructs (nesting level drops by one).

#### Trade-offs

The generator adds two boilerplate lines (`Effect.gen(function* () {` and `})`), which can tip
`spanExcess` for an already-long function — detectable in the same module entry. For a chain of
exactly 2 stages there is no metric gain, which is why this lever is SHOULD and applies only above
the budget.

**Before:**

```ts
import { Effect } from "effect";

declare const fetchUser: (id: string) => Effect.Effect<{ readonly name: string }>;
declare const fetchOrders: (user: { readonly name: string }) => Effect.Effect<readonly string[]>;
declare const log: (count: number) => Effect.Effect<void>;
declare const summarize: (orders: readonly string[]) => Effect.Effect<string>;

// sequential chain of length 4: chainExcess = 2 → 4 points
export const report = fetchUser("u1").pipe(
  Effect.flatMap((user) => fetchOrders(user)),
  Effect.tap((orders) => log(orders.length)),
  Effect.flatMap((orders) => summarize(orders)),
  Effect.andThen((summary) => Effect.succeed(`report: ${summary}`)),
);
```

**After:**

```ts
import { Effect } from "effect";

declare const fetchUser: (id: string) => Effect.Effect<{ readonly name: string }>;
declare const fetchOrders: (user: { readonly name: string }) => Effect.Effect<readonly string[]>;
declare const log: (count: number) => Effect.Effect<void>;
declare const summarize: (orders: readonly string[]) => Effect.Effect<string>;

// generator form: every intermediate value has a visible name and type; chainExcess = 0
export const report = Effect.gen(function* () {
  const user = yield* fetchUser("u1");
  const orders = yield* fetchOrders(user);
  yield* log(orders.length);
  const summary = yield* summarize(orders);
  return `report: ${summary}`;
});
```

#### Confirmation

Measure, rewrite every chain above budget, measure again. Confirmed iff `improvement`, the
project-wide `chainExcess` count decreased, and invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/linearizeChains.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "chainExcess"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmLinearizeChains(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "chainExcess") < componentTotal(before, "chainExcess") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Flatten control flow with guard clauses

A function whose [cognitive cost](#cognitive-cost) includes nesting increments SHOULD invert its
conditions into early-return guard clauses so that the remaining logic sits at nesting level 0.

#### Applicability

Applies iff some module entry has `components.cognitiveCost > 0` and re-running the
[cognitive cost](#cognitive-cost) predicate on that module's functions attributes at least one
nesting increment (a structural construct counted at nesting ≥ 1) — both decidable from the
decomposition plus one predicate evaluation, with no human judgment.

#### Effect on metric

Degradation mechanism: nested structures multiply the facts a reader holds simultaneously — every
enclosing condition stays live while reading the inner body. Guard clauses convert nesting
increments into flat increments: for a construct at nesting level k, the rewrite saves k points.
Predicted change: −(sum of nesting increments eliminated), typically −1 to −3 points per
converted level.

#### Trade-offs

Condition inversion can join conditions with `||`, adding a logical-run point or, past two
operators, a [compound condition](#compound-condition) (+2); detectable as those component counts
rising in the same entry. Net gain remains positive whenever the eliminated nesting exceeds the
added operators.

**Before:**

```ts
interface User {
  readonly name: string;
}

// cognitive cost 6: if(+1), nested if(+2), doubly nested if(+3)
export function firstLongName(users: readonly User[] | undefined): string | undefined {
  if (users !== undefined) {
    if (users.length > 0) {
      const first = users[0];
      if (first !== undefined) {
        return first.name;
      }
    }
  }
  return undefined;
}
```

**After:**

```ts
interface User {
  readonly name: string;
}

// cognitive cost 3: guard if(+1, one `||` run +1), flat if(+1) — everything at nesting 0
export function firstLongName(users: readonly User[] | undefined): string | undefined {
  if (users === undefined || users.length === 0) return undefined;
  const first = users[0];
  if (first === undefined) return undefined;
  return first.name;
}
```

#### Confirmation

Measure, flatten the reported functions, measure again. Confirmed iff `improvement`, the
project-wide `cognitiveCost` count decreased, and invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/flattenControlFlow.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "cognitiveCost"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmFlattenControlFlow(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "cognitiveCost") < componentTotal(before, "cognitiveCost") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Replace nested conditional expressions with Match

A [nested conditional expression](#nested-conditional-expression) SHOULD be rewritten as a `Match`
expression (or an `if`/`else` sequence when the scrutinee is not a discriminated value), one case
per outcome.

#### Applicability

Applies iff some module entry has `components.nestedConditional > 0`.

#### Effect on metric

Degradation mechanism: a ternary tree encodes a decision table in one expression with no vertical
structure; the reader must parse precedence to recover the branches. The rewrite removes each
[nested conditional expression](#nested-conditional-expression): predicted −4 points per
occurrence. `Match.when` cases are plain function arguments, so they add no structural
[cognitive cost](#cognitive-cost) increments; an `if`/`else` rewrite instead trades the 4 points
for `if`/`else` increments (net −4 + 2 = −2 when flat).

#### Trade-offs

The `Match` form is longer vertically (one line per case), which can tip `spanExcess` in an
already-long function; detectable in the same entry. `Match.exhaustive` also hard-fails on
non-exhaustive scrutinee types, which may surface latent unhandled cases as compile errors —
desirable, but it blocks the record until fixed (`diagnosticCount` must be 0).

**Before:**

```ts
type Status = "active" | "idle" | "failed";

// nested conditional expression: a decision tree in one expression
export const describe = (status: Status, retries: number): string =>
  status === "failed" ? (retries > 0 ? "retrying" : "dead") : status === "active" ? "running" : "waiting";
```

**After:**

```ts
import { Match } from "effect";

type Status = "active" | "idle" | "failed";

// one case per outcome; the inner ternary is now a single, un-nested conditional
export const describe = (status: Status, retries: number): string =>
  Match.value(status).pipe(
    Match.when("failed", () => (retries > 0 ? "retrying" : "dead")),
    Match.when("active", () => "running"),
    Match.when("idle", () => "waiting"),
    Match.exhaustive,
  );
```

#### Confirmation

Measure, rewrite every reported expression, measure again. Confirmed iff `improvement`, the
project-wide `nestedConditional` count decreased, and invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/replaceNestedConditionals.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "nestedConditional"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmReplaceNestedConditionals(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "nestedConditional") < componentTotal(before, "nestedConditional") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Name opaque export types

An [annotation gap](#annotation-gap) SHOULD be closed by declaring a named interface or type alias
for the export and writing it as an explicit annotation.

#### Applicability

Applies iff some module entry has `components.annotationGap > 0`.

#### Effect on metric

Degradation mechanism: an exported value with a large unwritten type forces every consumer to
reconstruct the compiler's inference; the module's contract exists only in tooling hovers.
Annotating removes the [annotation gap](#annotation-gap): predicted −4 points per export. A named
alias also shrinks the rendered type at every downstream hover.

#### Trade-offs

A hand-written annotation can drift from intent when the implementation changes — but the checker
verifies assignability on every build, so drift surfaces as a diagnostic, never silently. Wider
than that, none: the annotation adds one declaration and changes no behavior.

**Before:**

```ts
import { Effect } from "effect";

declare const loadConfig: Effect.Effect<{
  readonly host: string;
  readonly port: number;
  readonly tls: { readonly cert: string; readonly key: string };
  readonly limits: { readonly maxConnections: number; readonly timeoutMillis: number };
}>;

// annotation gap: consumers must reconstruct a >160-character inferred type
export const resolvedConfig = loadConfig.pipe(
  Effect.map((config) => ({ ...config, origin: `${config.host}:${config.port}` })),
);
```

**After:**

```ts
import { Effect } from "effect";

declare const loadConfig: Effect.Effect<{
  readonly host: string;
  readonly port: number;
  readonly tls: { readonly cert: string; readonly key: string };
  readonly limits: { readonly maxConnections: number; readonly timeoutMillis: number };
}>;

export interface ResolvedConfig {
  readonly host: string;
  readonly port: number;
  readonly tls: { readonly cert: string; readonly key: string };
  readonly limits: { readonly maxConnections: number; readonly timeoutMillis: number };
  readonly origin: string;
}

// the contract is written down; the checker verifies it on every build
export const resolvedConfig: Effect.Effect<ResolvedConfig> = loadConfig.pipe(
  Effect.map((config) => ({ ...config, origin: `${config.host}:${config.port}` })),
);
```

#### Confirmation

Measure, annotate every reported export, measure again. Confirmed iff `improvement`, the
project-wide `annotationGap` count decreased, and invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/nameExportTypes.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "annotationGap"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmNameExportTypes(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "annotationGap") < componentTotal(before, "annotationGap") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Extract compound conditions into named predicates

A [compound condition](#compound-condition) SHOULD be replaced by a call to (or a `const` binding
of) a named boolean expression whose name states what the formula decides.

#### Applicability

Applies iff some module entry has `components.compoundCondition > 0`.

#### Effect on metric

Degradation mechanism: a four-plus-operand boolean formula must be mentally evaluated at every
reading; a name states its meaning once. Extraction removes the [compound condition](#compound-condition)
from the condition position: predicted −2 points per occurrence. The extracted expression itself
sits in an initializer, not a condition position, so it is not re-counted.

#### Trade-offs

The extracted helper adds a declaration; if extracted as a function used before its declaration it
adds a [forward reference](#forward-reference) (+1) — declare it above its first use. Nothing else
measured can worsen.

**Before:**

```ts
interface Session {
  readonly user: string | undefined;
  readonly expired: boolean;
  readonly locked: boolean;
  readonly attempts: number;
}

export function admit(session: Session): string {
  // compound condition: three logical operators evaluated inline
  if (session.user !== undefined && !session.expired && !session.locked && session.attempts < 3) {
    return "welcome";
  }
  return "denied";
}
```

**After:**

```ts
interface Session {
  readonly user: string | undefined;
  readonly expired: boolean;
  readonly locked: boolean;
  readonly attempts: number;
}

export function admit(session: Session): string {
  // the formula's meaning is stated once, by name; the condition position holds one operand
  const isAdmissible =
    session.user !== undefined && !session.expired && !session.locked && session.attempts < 3;
  if (isAdmissible) {
    return "welcome";
  }
  return "denied";
}
```

#### Confirmation

Measure, extract every reported condition, measure again. Confirmed iff `improvement`, the
project-wide `compoundCondition` count decreased, and invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/extractConditions.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "compoundCondition"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmExtractConditions(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "compoundCondition") < componentTotal(before, "compoundCondition") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Eliminate forward references

A [top-level declaration](#top-level-declaration) containing [forward references](#forward-reference)
SHOULD be moved below the declarations it references, so the module reads top to bottom.

#### Applicability

Applies iff some module entry has `components.forwardReference > 0`.

#### Effect on metric

Degradation mechanism: a use above its definition forces a downward jump and a return, once per
reading. Reordering removes each [forward reference](#forward-reference): predicted −1 point per
reference. Reordering is purely positional — no symbol, type, or export changes.

#### Trade-offs

None on measured properties: reordering [top-level declarations](#top-level-declaration) without
cyclic value references changes no types, counts, or behavior. (Mutually recursive declarations
cannot reach zero forward references; the residual count for a genuine cycle is its floor.)

**Before:**

```ts
// forward reference: `formatLine` is declared below its use
export function renderReport(lines: readonly string[]): string {
  return lines.map(formatLine).join("\n");
}

function formatLine(line: string): string {
  return `| ${line}`;
}
```

**After:**

```ts
function formatLine(line: string): string {
  return `| ${line}`;
}

// definition-before-use: the reader has already met `formatLine`
export function renderReport(lines: readonly string[]): string {
  return lines.map(formatLine).join("\n");
}
```

#### Confirmation

Measure, reorder the reported modules, measure again. Confirmed iff `improvement`, the
project-wide `forwardReference` count decreased, and invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/reorderDeclarations.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "forwardReference"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmReorderDeclarations(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "forwardReference") < componentTotal(before, "forwardReference") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Unify combinator orientation

Every [orientation minority call](#combinator-orientation) SHOULD be rewritten into the majority
orientation of its combinator (into pipe-position on ties).

#### Applicability

Applies iff some module entry has `components.orientationMinority > 0`.

#### Effect on metric

Degradation mechanism: when one combinator appears in both call shapes, the reader must re-derive
the position of the subject at each call site instead of amortizing one convention. Rewriting the
minority calls empties the smaller group: predicted −1 point per rewritten call, and the
combinator's whole group stops contributing on future measurements.

#### Trade-offs

None on measured properties: both orientations of a dual combinator are type-equivalent by
construction, so the rewrite changes neither types nor behavior nor any other component count.

**Before:**

```ts
import { Effect } from "effect";

declare const price: Effect.Effect<number>;
declare const quantity: Effect.Effect<number>;
declare const shipping: Effect.Effect<number>;

export const withTax = price.pipe(Effect.map((value) => value * 1.2));
export const doubledQuantity = quantity.pipe(Effect.map((value) => value * 2));
// orientation minority call: data-first `Effect.map` in a pipe-majority project
export const roundedShipping = Effect.map(shipping, (value) => Math.round(value));
```

**After:**

```ts
import { Effect } from "effect";

declare const price: Effect.Effect<number>;
declare const quantity: Effect.Effect<number>;
declare const shipping: Effect.Effect<number>;

export const withTax = price.pipe(Effect.map((value) => value * 1.2));
export const doubledQuantity = quantity.pipe(Effect.map((value) => value * 2));
// unified: every `Effect.map` call site now has the subject in the same position
export const roundedShipping = shipping.pipe(Effect.map((value) => Math.round(value)));
```

#### Confirmation

Measure, rewrite every reported call, measure again. Confirmed iff `improvement`, the
project-wide `orientationMinority` count decreased, and invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/unifyOrientation.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "orientationMinority"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmUnifyOrientation(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "orientationMinority") < componentTotal(before, "orientationMinority") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Name magic numbers

A [magic number](#magic-number) SHOULD be moved into the initializer of a `const` whose name
states what the value means, declared above its first use.

#### Applicability

Applies iff some module entry has `components.magicNumber > 0`.

#### Effect on metric

Degradation mechanism: an unexplained literal in logic makes the reader guess its provenance and
whether other occurrences of the same number are related. Naming removes the
[magic number](#magic-number) (the `const` initializer position is excluded by definition):
predicted −1 point per literal. Choosing a name with three or more alphabetic characters is
required — a two-letter name that lives more than 8 [code lines](#code-line) becomes an
[opaque identifier](#opaque-identifier) (+3), a strictly worse trade the metric makes visible.

#### Trade-offs

One added declaration per named constant; if several literals share a value but not a meaning,
naming them together creates false coupling — name per meaning, which the metric cannot check
(residual gap noted in [Metric](#metric)).

**Before:**

```ts
declare const attempts: number;

export function shouldGiveUp(): boolean {
  return attempts > 5; // magic number: why 5?
}
```

**After:**

```ts
declare const attempts: number;

const maxRetryAttempts = 5; // the value's meaning is stated once, by name

export function shouldGiveUp(): boolean {
  return attempts > maxRetryAttempts;
}
```

#### Confirmation

Measure, name every reported literal, measure again. Confirmed iff `improvement`, the
project-wide `magicNumber` count decreased, the `opaqueIdentifier` count did not increase, and
invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/nameMagicNumbers.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (
  record: MeasurementRecord,
  key: "magicNumber" | "opaqueIdentifier",
): number => record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmNameMagicNumbers(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "magicNumber") < componentTotal(before, "magicNumber") &&
    componentTotal(after, "opaqueIdentifier") <= componentTotal(before, "opaqueIdentifier") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Convert reassigned bindings to single assignment

A [reassigned binding](#reassigned-binding) SHOULD be replaced by a single-assignment `const` —
via an expression, a reduction, or an extracted function — so a name denotes one value for its
whole life.

#### Applicability

Applies iff some module entry has `components.reassignedBinding > 0`.

#### Effect on metric

Degradation mechanism: a mutating variable forces the reader to replay every intervening line to
know its value at a use site. Conversion removes the [reassigned binding](#reassigned-binding):
predicted −2 points per binding. When the mutation lived in a loop, the loop often disappears too,
removing its structural [cognitive cost](#cognitive-cost) increment (an additional −1 or more).

#### Trade-offs

A reduction can be less direct than a simple accumulation for genuinely stateful algorithms; if
the rewrite needs a nested callback with structural constructs inside, `cognitiveCost` can rise —
detectable in the same entry. Reductions on hot paths can also allocate closures; detectable in
the whole-process self-host benchmark results.

**Before:**

```ts
declare const sizes: readonly number[];

export function totalBytes(): number {
  let total = 0; // reassigned binding
  for (const size of sizes) {
    total += size;
  }
  return total;
}
```

**After:**

```ts
declare const sizes: readonly number[];

export function totalBytes(): number {
  // single assignment: `total` denotes one value for its whole life; the loop is gone too
  const total = sizes.reduce((sum, size) => sum + size, 0);
  return total;
}
```

#### Confirmation

Measure, convert every reported binding, measure again. Confirmed iff `improvement`, the
project-wide `reassignedBinding` count decreased, and invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/singleAssignment.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "reassignedBinding"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmSingleAssignment(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "reassignedBinding") < componentTotal(before, "reassignedBinding") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Replace boolean literal arguments with options objects

A call site with [boolean literal arguments](#boolean-literal-argument) SHOULD be migrated — with
its callee — to a single options-object parameter whose property names state each flag's meaning.

#### Applicability

Applies iff some module entry has `components.booleanLiteralArgument > 0`.

#### Effect on metric

Degradation mechanism: a bare `true` in a multi-argument call carries zero information at the call
site; the reader must open the callee's signature. Property names travel with the values:
predicted −2 points per converted argument (property values in object literals are excluded by the
[boolean literal argument](#boolean-literal-argument) predicate).

#### Trade-offs

Every caller of the changed function must be updated in the same change (the checker enforces
this — `diagnosticCount` must return to 0). The options object allocates at each call; detectable
in the whole-process self-host benchmark if the callee is hot.

**Before:**

```ts
// boolean literal arguments: meaning invisible at the call site
export function connect(host: string, tls: boolean, retry: boolean): string {
  return `${host}:${tls}:${retry}`;
}

export const connection = connect("db.local", true, false);
```

**After:**

```ts
// each flag's meaning travels with its value
export interface ConnectOptions {
  readonly tls: boolean;
  readonly retry: boolean;
}

export function connect(host: string, options: ConnectOptions): string {
  return `${host}:${options.tls}:${options.retry}`;
}

export const connection = connect("db.local", { tls: true, retry: false });
```

#### Confirmation

Measure, migrate every reported call site and callee, measure again. Confirmed iff `improvement`,
the project-wide `booleanLiteralArgument` count decreased, and invariants hold (export *names*
are unchanged; signatures may change).

**Confirmation implementation:**

```ts
// tools/readability/confirm/optionsObjects.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "booleanLiteralArgument"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmOptionsObjects(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "booleanLiteralArgument") <
      componentTotal(before, "booleanLiteralArgument") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Narrow wide parameter lists

A [wide parameter list](#wide-parameter-list) SHOULD be collapsed so at most 4 parameters remain,
by grouping cohesive parameters into a named object parameter.

#### Applicability

Applies iff some module entry has `components.wideParameterList > 0`.

#### Effect on metric

Degradation mechanism: beyond four positional parameters, call sites require recalling parameter
order; argument transpositions type-check when adjacent parameters share a type. Grouping removes
the excess: predicted −3 points per excess parameter eliminated.

#### Trade-offs

Same as options objects: every caller updates in the same change (checker-enforced), and the
object allocates per call — detectable in the whole-process self-host benchmark on hot paths. Grouping
non-cohesive parameters trades positional confusion for a junk-drawer type; the metric cannot
detect cohesion (residual gap noted in [Metric](#metric)).

**Before:**

```ts
// wide parameter list: 6 positional parameters (excess 2)
export function renderTable(
  rows: readonly (readonly string[])[],
  header: boolean,
  widths: readonly number[],
  separator: string,
  align: "left" | "right",
  truncateAt: number,
): string {
  return rows.length === 0 ? "" : `${header} ${widths.length} ${separator} ${align} ${truncateAt}`;
}
```

**After:**

```ts
export interface TableStyle {
  readonly header: boolean;
  readonly widths: readonly number[];
  readonly separator: string;
  readonly align: "left" | "right";
  readonly truncateAt: number;
}

// 2 parameters: the style options are named at every call site
export function renderTable(rows: readonly (readonly string[])[], style: TableStyle): string {
  return rows.length === 0
    ? ""
    : `${style.header} ${style.widths.length} ${style.separator} ${style.align} ${style.truncateAt}`;
}
```

#### Confirmation

Measure, collapse every reported function, measure again. Confirmed iff `improvement`, the
project-wide `wideParameterList` count decreased, and invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/narrowParameters.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "wideParameterList"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmNarrowParameters(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "wideParameterList") < componentTotal(before, "wideParameterList") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Split over-long functions

An [analyzable function](#analyzable-function) whose [function span](#function-span) exceeds 40
[code lines](#code-line) SHOULD be split into functions each within the threshold, extracted along
its distinct responsibilities.

#### Applicability

Applies iff some module entry has `components.spanExcess > 0`.

#### Effect on metric

Degradation mechanism: past roughly a screenful, the reader loses the beginning of the function
before reaching its end; every local binding stays live across the whole span. Splitting reduces
each fragment below the threshold: predicted −1 point per 10-line unit of former excess.
Extraction also shortens live ranges, which can remove [opaque identifier](#opaque-identifier)
points, and drops nesting when inner blocks become top-level bodies (−`cognitiveCost`).

#### Trade-offs

Highest-risk lever in this playbook: extraction with poor names or wrong seams makes things worse
— new [forward references](#forward-reference) (+1 each) if helpers are placed below their caller,
new undocumented exports (+2 each, per [documented export](#documented-export)) if helpers are
exported, and call-indirection the metric does not price. Apply after the cheaper levers, and
check the whole module entry, not just `spanExcess`.

**Before:**

```ts
declare const rawLines: readonly string[];

// one function doing two jobs across a long span (abridged here; imagine 45+ code lines)
export function report(): string {
  const cleaned: string[] = [];
  for (const line of rawLines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      cleaned.push(trimmed);
    }
  }
  const widths: number[] = [];
  for (const line of cleaned) {
    widths.push(line.length);
  }
  const maxWidth = widths.reduce((a, b) => Math.max(a, b), 0);
  return cleaned.map((line) => line.padEnd(maxWidth, " ")).join("\n");
}
```

**After:**

```ts
declare const rawLines: readonly string[];

function cleanLines(lines: readonly string[]): readonly string[] {
  return lines.map((line) => line.trim()).filter((line) => line.length > 0);
}

function padToWidest(lines: readonly string[]): readonly string[] {
  const maxWidth = lines.reduce((widest, line) => Math.max(widest, line.length), 0);
  return lines.map((line) => line.padEnd(maxWidth, " "));
}

// each function is one job, each within the span threshold, helpers declared above their caller
export function report(): string {
  return padToWidest(cleanLines(rawLines)).join("\n");
}
```

#### Confirmation

Measure, split every reported function, measure again. Confirmed iff `improvement`, the
project-wide `spanExcess` count decreased, `forwardReference` and `undocumentedExport` did not
increase, and invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/splitFunctions.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (
  record: MeasurementRecord,
  key: "spanExcess" | "forwardReference" | "undocumentedExport",
): number => record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmSplitFunctions(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "spanExcess") < componentTotal(before, "spanExcess") &&
    componentTotal(after, "forwardReference") <= componentTotal(before, "forwardReference") &&
    componentTotal(after, "undocumentedExport") <= componentTotal(before, "undocumentedExport") &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Document exported declarations

An undocumented export (per [documented export](#documented-export)) SHOULD receive a JSDoc
comment stating what the export does and when to use it.

#### Applicability

Applies iff some module entry has `components.undocumentedExport > 0`.

#### Effect on metric

Degradation mechanism: an exported declaration is read from other modules through hovers and
imports; without a doc comment the reader must open and read the implementation. Documenting
converts each undocumented export: predicted −2 points per export.

#### Trade-offs

Wrong or stale prose is worse than none, and the metric cannot judge truthfulness (residual gap
noted in [Metric](#metric)); the doc-body uniqueness companion catches only copy-paste stuffing.
Review remains responsible for accuracy.

**Before:**

```ts
// undocumented export: consumers must read the body to learn the contract
export function formatLine(line: string): string {
  return `| ${line}`;
}
```

**After:**

```ts
/**
 * Prefixes one report line with the table border used by `renderReport`.
 */
export function formatLine(line: string): string {
  return `| ${line}`;
}
```

#### Confirmation

Measure, document every reported export, measure again. Confirmed iff `improvement`, the
project-wide `undocumentedExport` count decreased, the `duplicateDocBodies` companion did not
increase, and invariants hold.

**Confirmation implementation:**

```ts
// tools/readability/confirm/documentExports.ts
import { compareRecords, type MeasurementRecord } from "../record.ts";

const componentTotal = (record: MeasurementRecord, key: "undocumentedExport"): number =>
  record.modules.reduce((total, entry) => total + entry.components[key], 0);

export function confirmDocumentExports(
  before: MeasurementRecord,
  after: MeasurementRecord,
): boolean {
  return (
    compareRecords(before, after) === "improvement" &&
    componentTotal(after, "undocumentedExport") < componentTotal(before, "undocumentedExport") &&
    after.companions.duplicateDocBodies <= before.companions.duplicateDocBodies &&
    after.companions.exportSurfaceDigest === before.companions.exportSurfaceDigest &&
    after.companions.strictFlagsDigest === before.companions.strictFlagsDigest
  );
}
```

### Diagnostic procedure

Given a valid [measurement record](#measurement-record), the ordered list of applicable levers is
computed deterministically:

1. Sum each component key across all module entries.
2. Discard components whose project-wide count is 0.
3. Score each remaining component as `weight × count` using the
   [readability cost](#readability-cost) weight table.
4. Map each component to its lever one-to-one: `shadowingBinding` → Eliminate shadowing bindings;
   `opaqueIdentifier` → Rename opaque identifiers; `untypedFailure` → Replace untyped failures
   with tagged failure classes; `escapeHatch` → Remove escape hatches; `chainExcess` → Linearize
   long sequential chains into generator form; `cognitiveCost` → Flatten control flow with guard
   clauses; `nestedConditional` → Replace nested conditional expressions with Match;
   `annotationGap` → Name opaque export types; `compoundCondition` → Extract compound conditions
   into named predicates; `forwardReference` → Eliminate forward references;
   `orientationMinority` → Unify combinator orientation; `magicNumber` → Name magic numbers;
   `reassignedBinding` → Convert reassigned bindings to single assignment;
   `booleanLiteralArgument` → Replace boolean literal arguments with options objects;
   `wideParameterList` → Narrow wide parameter lists; `spanExcess` → Split over-long functions;
   `undocumentedExport` → Document exported declarations.
5. Order levers by score descending; break ties by the levers' order of appearance in this
   document (lower risk first); within each lever, order target modules by that component's count
   descending, then by path ascending.

```ts
// tools/readability/diagnose.ts
import { weights, type ComponentKey } from "./cost.ts";
import type { MeasurementRecord } from "./record.ts";

/** Lever names in this document's order (the tie-break: lower risk first). */
const leverByComponent: Readonly<Record<ComponentKey, string>> = {
  shadowingBinding: "Eliminate shadowing bindings",
  opaqueIdentifier: "Rename opaque identifiers",
  untypedFailure: "Replace untyped failures with tagged failure classes",
  escapeHatch: "Remove escape hatches",
  chainExcess: "Linearize long sequential chains into generator form",
  cognitiveCost: "Flatten control flow with guard clauses",
  nestedConditional: "Replace nested conditional expressions with Match",
  annotationGap: "Name opaque export types",
  compoundCondition: "Extract compound conditions into named predicates",
  forwardReference: "Eliminate forward references",
  orientationMinority: "Unify combinator orientation",
  magicNumber: "Name magic numbers",
  reassignedBinding: "Convert reassigned bindings to single assignment",
  booleanLiteralArgument: "Replace boolean literal arguments with options objects",
  wideParameterList: "Narrow wide parameter lists",
  spanExcess: "Split over-long functions",
  undocumentedExport: "Document exported declarations",
};

export interface Diagnosis {
  readonly lever: string;
  readonly score: number;
  readonly modules: readonly string[];
}

export function diagnose(record: MeasurementRecord): readonly Diagnosis[] {
  const order = Object.keys(leverByComponent) as readonly ComponentKey[];
  return order
    .map((key) => {
      const count = record.modules.reduce((total, entry) => total + entry.components[key], 0);
      const modules = record.modules
        .filter((entry) => entry.components[key] > 0)
        .sort(
          (a, b) => b.components[key] - a.components[key] || (a.path < b.path ? -1 : 1),
        )
        .map((entry) => entry.path);
      return { lever: leverByComponent[key], score: weights[key] * count, modules };
    })
    .filter((diagnosis) => diagnosis.score > 0)
    .sort(
      (a, b) => b.score - a.score || order.findIndex((k) => leverByComponent[k] === a.lever) - order.findIndex((k) => leverByComponent[k] === b.lever),
    );
}
```

## Invariants against gaming

A confirmation is valid only when the primary success criterion of
[Baseline and regression tracking](#baseline-and-regression-tracking) **and every applicable
invariant below hold simultaneously**. The companion values live in every
[measurement record](#measurement-record)'s `companions` field and are computed with the same
determinism as the primary metric; their implementation closes this section.

**1. Deleting covered functionality.** Deleting a complicated function deletes its points. Rejected
by two invariants: the export-surface digest (SHA-256 over the sorted `module#exportName` pairs of
every [exported declaration](#exported-declaration)) must be equal across the measurement pair,
and the project test suite (`bun test`) must pass on both sides. Intentional API removals are
recorded as explicit baseline resets, never as lever confirmations.

**2. Shifting cost outside the measurement boundary.** Moving a gnarly module into a separately
published package turns it into an external library file, which contributes no counts (per
[source module](#source-module)). Rejected by: `dependencyNamesDigest` (SHA-256 over the sorted
dependency names of every workspace manifest) must be equal across the pair, and
`sourceModuleCount` may only decrease when the export-surface digest is unchanged (i.e. the
removed module exported nothing the surface misses — pure reorganization).

**3. Relaxing the compiler to erase checker-facing counts.** Turning off `strict` removes the
errors that motivated [escape hatches](#escape-hatch) and changes inferred types under
[annotation gaps](#annotation-gap), lowering counts while making the code *less* trustworthy.
Rejected by: `strictFlagsDigest` (a digest over the strictness-relevant compiler options) must be
equal across the pair, and `diagnosticCount === 0` is required for any record to be valid at all.

**4. Assertion laundering.** Wrapping `as` in a helper (`const cast = <T>(x: unknown): T => x as T`)
concentrates many [escape hatches](#escape-hatch) into one while every call site looks clean.
Rejected by the `assertionForwarderCallsites` companion: the number of call sites whose callee is
an assertion forwarder — a function whose body is exactly an assertion of one of its parameters —
must not increase across the pair (enforced by the escape-hatch lever's confirmation).

**5. Documentation stuffing.** Pasting the same 20-character blurb onto every export erases
`undocumentedExport` points without informing anyone. Rejected by the `duplicateDocBodies`
companion: the number of [documented exports](#documented-export) whose normalized doc body
(lowercased, whitespace-collapsed) occurs more than once project-wide must not increase across the
pair (enforced by the documentation lever's confirmation). Unique machine-generated prose evades
this companion; that residual gap is declared in [Metric](#metric) and owned by review.

**6. Hiding chains from the counter.** Rewriting `subject.pipe(Effect.flatMap(f), Effect.flatMap(g))`
as `Effect.flatMap(Effect.flatMap(subject, f), g)` would dodge a pipe-only counter. Rejected by
construction: the [sequential chain](#sequential-chain) predicate counts continuation stages
through both the pipe-position and data-first forms, so both spellings report the same chain
length.

**7. Threshold gaming by mechanical splitting.** Splitting a 60-line function into `part1`/`p2`
erases `spanExcess` without clarifying anything. Rejected by the split-function confirmation's
own clauses: `forwardReference` and `undocumentedExport` must not increase, near-empty helper
names become [opaque identifiers](#opaque-identifier) (+3 each), and the export-surface digest
forbids casually exporting the fragments. A split that survives all of that has produced named,
ordered, in-budget functions — which is the improvement the lever intends.

**8. Constant laundering.** Naming a [magic number](#magic-number) `n1` trades 1 point for a
3-point [opaque identifier](#opaque-identifier) whenever the constant is used more than 8
[code lines](#code-line) away, and the magic-number lever's confirmation additionally requires
`opaqueIdentifier` not to increase. The arithmetic makes the lazy spelling strictly worse.

**9. Exploiting the aggregation statistic.** The aggregate is a plain sum of nonnegative
per-module values ([Decomposition](#decomposition)): adding modules cannot lower it, reweighting
is impossible without changing `weightTableDigest` (which makes records incomparable), and there
is no mean, median, or percentile to shift. No invariant is needed beyond the comparability check
in `compareRecords`.

**10. Overfitting to fixed measurement inputs.** The metric is static and total: it reads every
[source module](#source-module) of the [program under measurement](#program-under-measurement),
with no sampled workload, seed, or fixture to overfit. The only fixed input is the `tsconfig`
path; invariant 2's module-count clause and invariant 1's export-surface digest reject shrinking
the program's reach, and any `tsconfig` edit changes `strictFlagsDigest` or the file set digest
and is therefore visible in the pair.

**Companion implementation:**

```ts
// tools/readability/companions.ts
import * as crypto from "node:crypto";
import * as ts from "typescript";
import { docText, undocumentedExports } from "./predicates/documentedExport.ts";
import { exportedDeclarations } from "./predicates/exportedDeclaration.ts";
import { isSourceModule } from "./predicates/sourceModule.ts";

const sha256 = (text: string): string =>
  `sha256:${crypto.createHash("sha256").update(text).digest("hex")}`;

/** Invariant 1: sorted `module#exportName` pairs, digested. */
export function exportSurfaceDigest(program: ts.Program, checker: ts.TypeChecker): string {
  const pairs: string[] = [];
  for (const file of program.getSourceFiles()) {
    if (!isSourceModule(file, program)) continue;
    const moduleSymbol = checker.getSymbolAtLocation(file);
    if (moduleSymbol === undefined) continue;
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
      pairs.push(`${file.fileName}#${exported.getName()}`);
    }
  }
  return sha256(pairs.sort().join("\n"));
}

/** Invariant 2: sorted dependency names across the given workspace manifests, digested. */
export function dependencyNamesDigest(manifestPaths: readonly string[]): string {
  const names = new Set<string>();
  for (const manifestPath of manifestPaths) {
    const contents = ts.sys.readFile(manifestPath);
    if (contents === undefined) continue;
    const manifest = JSON.parse(contents) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    for (const name of Object.keys(manifest.dependencies ?? {})) names.add(name);
    for (const name of Object.keys(manifest.devDependencies ?? {})) names.add(name);
  }
  return sha256([...names].sort().join("\n"));
}

/** Invariant 3: strictness-relevant compiler options, digested. */
export function strictFlagsDigest(program: ts.Program): string {
  const options = program.getCompilerOptions();
  const strictness = {
    strict: options.strict ?? false,
    noImplicitAny: options.noImplicitAny ?? options.strict ?? false,
    strictNullChecks: options.strictNullChecks ?? options.strict ?? false,
    strictFunctionTypes: options.strictFunctionTypes ?? options.strict ?? false,
    noUncheckedIndexedAccess: options.noUncheckedIndexedAccess ?? false,
    exactOptionalPropertyTypes: options.exactOptionalPropertyTypes ?? false,
    useUnknownInCatchVariables: options.useUnknownInCatchVariables ?? options.strict ?? false,
  };
  return sha256(JSON.stringify(strictness));
}

/** Invariant 4: call sites whose callee's body is exactly an assertion of a parameter. */
export function assertionForwarderCallsites(
  program: ts.Program,
  checker: ts.TypeChecker,
): number {
  const forwarderSymbols = new Set<ts.Symbol>();
  const parameterAssertion = (
    fn: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression,
  ): boolean => {
    const body = fn.body;
    const expression =
      body !== undefined && ts.isBlock(body)
        ? body.statements.length === 1 && ts.isReturnStatement(body.statements[0]!)
          ? body.statements[0]!.expression
          : undefined
        : body;
    return (
      expression !== undefined &&
      ts.isAsExpression(expression) &&
      ts.isIdentifier(expression.expression) &&
      fn.parameters.some(
        (parameter) =>
          ts.isIdentifier(parameter.name) &&
          ts.isIdentifier(expression.expression) &&
          parameter.name.text === expression.expression.text,
      )
    );
  };
  for (const file of program.getSourceFiles()) {
    if (!isSourceModule(file, program)) continue;
    const visit = (node: ts.Node): void => {
      if (
        (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) &&
        parameterAssertion(node)
      ) {
        const nameNode = ts.isFunctionDeclaration(node) ? node.name : undefined;
        const anchor =
          nameNode ??
          (ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)
            ? node.parent.name
            : undefined);
        const symbol = anchor !== undefined ? checker.getSymbolAtLocation(anchor) : undefined;
        if (symbol !== undefined) forwarderSymbols.add(symbol);
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  let callsites = 0;
  for (const file of program.getSourceFiles()) {
    if (!isSourceModule(file, program)) continue;
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const symbol = checker.getSymbolAtLocation(node.expression);
        if (symbol !== undefined && forwarderSymbols.has(symbol)) callsites += 1;
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return callsites;
}

/** Invariant 5: documented exports whose normalized doc body occurs more than once. */
export function duplicateDocBodies(program: ts.Program, checker: ts.TypeChecker): number {
  const bodies = new Map<string, number>();
  for (const file of program.getSourceFiles()) {
    if (!isSourceModule(file, program)) continue;
    const undocumented = new Set(undocumentedExports(file, checker));
    for (const declaration of exportedDeclarations(file, checker)) {
      if (undocumented.has(declaration)) continue;
      const normalized = docText(declaration).toLowerCase().replace(/\s+/g, " ");
      bodies.set(normalized, (bodies.get(normalized) ?? 0) + 1);
    }
  }
  let duplicates = 0;
  for (const count of bodies.values()) {
    if (count > 1) duplicates += count;
  }
  return duplicates;
}
```
