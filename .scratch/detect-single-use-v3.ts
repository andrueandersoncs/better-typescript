import * as ts from "typescript"
import * as path from "node:path"

const projectRoot = process.cwd()
const configPath = ts.findConfigFile(
  projectRoot,
  ts.sys.fileExists,
  "tsconfig.json"
)
const configFile = ts.readConfigFile(configPath!, ts.sys.readFile)
const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  projectRoot
)
const program = ts.createProgram(parsedConfig.fileNames, parsedConfig.options)
const checker = program.getTypeChecker()

const isProjectFile = (sf: ts.SourceFile): boolean =>
  !sf.isDeclarationFile && !sf.fileName.includes("/node_modules/")

const projectFiles = program.getSourceFiles().filter(isProjectFile)

const hasExportKeyword = (stmt: ts.Statement): boolean => {
  if (!ts.canHaveModifiers(stmt)) return false
  const mods = ts.getModifiers(stmt)
  return (
    mods !== undefined &&
    mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  )
}

interface FuncDecl {
  name: string
  fileName: string
  line: number
  symbol: ts.Symbol
  node: ts.Node
  isExported: boolean
  isArrow: boolean
  bodyLineCount: number
  hasParameters: boolean
  paramCount: number
}

const bodyLines = (node: ts.Node, sf: ts.SourceFile): number => {
  const text = node.getText(sf)
  return text.split("\n").length
}

const topLevelFunctions: FuncDecl[] = []

for (const sf of projectFiles) {
  for (const stmt of sf.statements) {
    if (ts.isVariableStatement(stmt)) {
      const exported = hasExportKeyword(stmt)
      for (const decl of stmt.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          (ts.isArrowFunction(decl.initializer) ||
            ts.isFunctionExpression(decl.initializer))
        ) {
          const sym = checker.getSymbolAtLocation(decl.name)
          if (!sym) continue
          const loc = sf.getLineAndCharacterOfPosition(decl.name.getStart(sf))
          const fn = decl.initializer as
            ts.ArrowFunction | ts.FunctionExpression
          topLevelFunctions.push({
            name: decl.name.text,
            fileName: path.relative(projectRoot, sf.fileName),
            line: loc.line + 1,
            symbol: sym,
            node: decl,
            isExported: exported,
            isArrow: ts.isArrowFunction(decl.initializer),
            bodyLineCount: bodyLines(decl.initializer, sf),
            hasParameters: fn.parameters.length > 0,
            paramCount: fn.parameters.length
          })
        }
      }
    }
    if (ts.isFunctionDeclaration(stmt) && stmt.name) {
      const sym = checker.getSymbolAtLocation(stmt.name)
      if (!sym) continue
      const loc = sf.getLineAndCharacterOfPosition(stmt.name.getStart(sf))
      topLevelFunctions.push({
        name: stmt.name.text,
        fileName: path.relative(projectRoot, sf.fileName),
        line: loc.line + 1,
        symbol: sym,
        node: stmt,
        isExported: hasExportKeyword(stmt),
        isArrow: false,
        bodyLineCount: bodyLines(stmt, sf),
        hasParameters: stmt.parameters.length > 0,
        paramCount: stmt.parameters.length
      })
    }
  }
}

// Find single-use callee-only functions
interface RefSite {
  node: ts.Identifier
  sf: ts.SourceFile
}

const singleCalleeRefs = new Map<ts.Symbol, RefSite>()
const multiOrValueRefs = new Set<ts.Symbol>()

const classifyRefs = (node: ts.Node, sf: ts.SourceFile) => {
  if (ts.isIdentifier(node)) {
    let sym: ts.Symbol | undefined
    try {
      sym = checker.getSymbolAtLocation(node)
    } catch {
      return
    }
    if (sym) {
      let resolved = sym
      try {
        if (sym.flags & ts.SymbolFlags.Alias)
          resolved = checker.getAliasedSymbol(sym)
      } catch {}

      for (const func of topLevelFunctions) {
        if (resolved !== func.symbol && sym !== func.symbol) continue

        // Skip declaration
        const declName = ts.isVariableDeclaration(func.node)
          ? (func.node as ts.VariableDeclaration).name
          : (func.node as ts.FunctionDeclaration).name
        if (node === declName) continue

        if (multiOrValueRefs.has(func.symbol)) break // already disqualified

        const parent = node.parent
        const isCallee =
          ts.isCallExpression(parent) && parent.expression === node

        if (!isCallee) {
          multiOrValueRefs.add(func.symbol)
          singleCalleeRefs.delete(func.symbol)
        } else if (singleCalleeRefs.has(func.symbol)) {
          // second callee ref -> disqualify
          multiOrValueRefs.add(func.symbol)
          singleCalleeRefs.delete(func.symbol)
        } else {
          singleCalleeRefs.set(func.symbol, { node, sf })
        }
        break
      }
    }
  }
  ts.forEachChild(node, (child) => classifyRefs(child, sf))
}

for (const sf of projectFiles) {
  classifyRefs(sf, sf)
}

// Now analyze each callee-only single-use function's call site
// Question: if we inlined this function at its call site, would the result
// violate noInlineClosures?
//
// noInlineClosures: arrow functions are only allowed in:
//   - VariableDeclaration initializer (naming position)
//   - ArrowFunction body (currying position)
//
// So if the call site is inside e.g. Array.map(items, ...) or pipe(x, ...)
// or an object literal { onSome: ... }, inlining would create an arrow in a
// disallowed position.
//
// But the callee-only functions are called as foo(x), so inlining means
// replacing foo(x) with the body. The body itself might be an expression
// that doesn't involve creating a new arrow. So the question is:
// does the function take parameters? If yes, inlining requires wrapping
// the body in a let/const or substituting params - which wouldn't create
// a closure violation.
//
// Actually the real question is simpler: WHY does this function exist as
// a separate named const? Possible reasons:
// 1. noInlineClosures forced extraction (but these are callee-only, not value-position)
// 2. Curried function pattern (returns another function)
// 3. Intentional decomposition for naming
// 4. Would be too complex inline

// Let's classify the call sites
interface CallSiteAnalysis {
  func: FuncDecl
  callSiteLine: number
  callSiteFile: string
  // What kind of parent contains the call?
  callSiteContext: string
  // Is the function a curried function (returns a function)?
  isCurried: boolean
  // Does the function have a return type annotation containing =>?
  bodyExpressionOnly: boolean
}

const results: CallSiteAnalysis[] = []

for (const func of topLevelFunctions) {
  const ref = singleCalleeRefs.get(func.symbol)
  if (!ref) continue

  const callExpr = ref.node.parent as ts.CallExpression
  const loc = ref.sf.getLineAndCharacterOfPosition(ref.node.getStart(ref.sf))

  // Check if the function body is a single expression (concise arrow)
  let bodyExpressionOnly = false
  let isCurried = false
  if (ts.isVariableDeclaration(func.node)) {
    const init = (func.node as ts.VariableDeclaration).initializer
    if (init && ts.isArrowFunction(init)) {
      bodyExpressionOnly = !ts.isBlock(init.body)
      // Check if body is another arrow function (currying)
      if (bodyExpressionOnly) {
        const body = init.body
        isCurried =
          ts.isArrowFunction(body) ||
          (ts.isParenthesizedExpression(body) &&
            ts.isArrowFunction(body.expression))
      } else if (ts.isBlock(init.body)) {
        // Check return type for function signature
        const returnStatements = init.body.statements.filter(
          ts.isReturnStatement
        )
        isCurried = returnStatements.some(
          (r) =>
            r.expression &&
            (ts.isArrowFunction(r.expression) ||
              ts.isFunctionExpression(r.expression))
        )
      }
    }
  }

  // What's the enclosing context of the call site?
  let context = "unknown"
  let ancestor: ts.Node = callExpr
  while (ancestor.parent) {
    ancestor = ancestor.parent
    if (
      ts.isArrowFunction(ancestor) ||
      ts.isFunctionExpression(ancestor) ||
      ts.isFunctionDeclaration(ancestor)
    ) {
      // Find the name of the enclosing function
      if (ts.isArrowFunction(ancestor) || ts.isFunctionExpression(ancestor)) {
        if (ts.isVariableDeclaration(ancestor.parent)) {
          context = "body of " + (ancestor.parent.name as ts.Identifier).text
        } else {
          context = "anonymous function"
        }
      } else if (ts.isFunctionDeclaration(ancestor) && ancestor.name) {
        context = "body of " + ancestor.name.text
      }
      break
    }
    if (ts.isSourceFile(ancestor)) {
      context = "module scope"
      break
    }
  }

  results.push({
    func,
    callSiteLine: loc.line + 1,
    callSiteFile: path.relative(projectRoot, ref.sf.fileName),
    callSiteContext: context,
    isCurried,
    bodyExpressionOnly
  })
}

// Summarize
const curried = results.filter((r) => r.isCurried)
const moduleScope = results.filter((r) => r.callSiteContext === "module scope")
const inFunction = results.filter((r) =>
  r.callSiteContext.startsWith("body of")
)
const concise = results.filter((r) => r.bodyExpressionOnly)
const multiLine = results.filter((r) => !r.bodyExpressionOnly)

console.log(
  "=== CALL SITE ANALYSIS OF " + results.length + " FLAGGED FUNCTIONS ==="
)
console.log("")
console.log("By call site location:")
console.log("  Module scope (top-level const init): " + moduleScope.length)
console.log("  Inside another function body:        " + inFunction.length)
console.log("")
console.log("By function shape:")
console.log("  Curried (returns another function):   " + curried.length)
console.log("  Concise arrow (expression body):      " + concise.length)
console.log("  Block body (multi-statement):         " + multiLine.length)
console.log("")

// The key insight: functions called at module scope are decomposition steps.
// These exist because the author chose to break a const initializer into pieces.
// Example: const x = foo(bar(baz(input)))
// Becomes: const a = baz(input); const b = bar(a); const x = foo(b)
// With named helpers: const bazStep = ...; const barStep = ...; const x = ...

// Functions called inside another function body MIGHT be inlineable.
// But they also might be decomposition for readability.

console.log("--- Called at MODULE SCOPE (decomposition chains) ---")
for (const r of moduleScope.slice(0, 10)) {
  console.log(
    "  " +
      r.func.fileName +
      ":" +
      r.func.line +
      "  " +
      r.func.name +
      " (" +
      r.func.bodyLineCount +
      " lines" +
      (r.isCurried ? ", curried" : "") +
      ")"
  )
}
if (moduleScope.length > 10)
  console.log("  ... and " + (moduleScope.length - 10) + " more")

console.log("")
console.log("--- Called INSIDE ANOTHER FUNCTION ---")
for (const r of inFunction.slice(0, 20)) {
  console.log(
    "  " +
      r.func.fileName +
      ":" +
      r.func.line +
      "  " +
      r.func.name +
      " (" +
      r.func.bodyLineCount +
      " lines" +
      (r.isCurried ? ", curried" : "") +
      ")" +
      "  called in: " +
      r.callSiteContext
  )
}
if (inFunction.length > 20)
  console.log("  ... and " + (inFunction.length - 20) + " more")

// Check how many of the "inside function" ones are called from a function
// that is ITSELF single-use-callee (chain of decomposition)
const singleCalleeSymbols = new Set(singleCalleeRefs.keys())
const calledFromSingleUse = inFunction.filter((r) => {
  // Is the enclosing function also single-use?
  const enclosingName = r.callSiteContext.replace("body of ", "")
  return topLevelFunctions.some(
    (f) => f.name === enclosingName && singleCalleeSymbols.has(f.symbol)
  )
})

console.log("")
console.log("Of the " + inFunction.length + " called inside functions:")
console.log(
  "  Enclosing function is ALSO single-use callee: " +
    calledFromSingleUse.length
)
console.log(
  "  Enclosing function has multiple uses:         " +
    (inFunction.length - calledFromSingleUse.length)
)
