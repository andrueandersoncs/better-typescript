import * as ts from "typescript"
import * as path from "node:path"

const projectRoot = process.cwd()
const configPath = ts.findConfigFile(
  projectRoot,
  ts.sys.fileExists,
  "tsconfig.json"
)
if (!configPath) {
  console.error("No tsconfig.json")
  process.exit(1)
}

const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
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

interface FuncDecl {
  name: string
  fileName: string
  line: number
  symbol: ts.Symbol
  isExported: boolean
  node: ts.Node
}

const hasExportKeyword = (stmt: ts.Statement): boolean => {
  if (!ts.canHaveModifiers(stmt)) return false
  const mods = ts.getModifiers(stmt)
  return (
    mods !== undefined &&
    mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
  )
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
          topLevelFunctions.push({
            name: decl.name.text,
            fileName: path.relative(projectRoot, sf.fileName),
            line: loc.line + 1,
            symbol: sym,
            isExported: exported,
            node: decl
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
        isExported: hasExportKeyword(stmt),
        node: stmt
      })
    }
  }
}

// Phase 2: For each reference, track whether it's a callee or a value-position use
interface RefInfo {
  totalRefs: number
  calleeRefs: number // parent is CallExpression and this is .expression
  valueRefs: number // everything else (arg, property value, assigned, returned, etc.)
  sites: string[]
}

const symbolRefs = new Map<ts.Symbol, RefInfo>()

const classifyRef = (node: ts.Node, sf: ts.SourceFile, func: FuncDecl) => {
  const declName = ts.isVariableDeclaration(func.node)
    ? (func.node as ts.VariableDeclaration).name
    : (func.node as ts.FunctionDeclaration).name
  if (node === declName) return // skip declaration

  const info = symbolRefs.get(func.symbol) ?? {
    totalRefs: 0,
    calleeRefs: 0,
    valueRefs: 0,
    sites: []
  }
  info.totalRefs++

  // Is this identifier the callee of a call expression?
  // foo(x) -> parent is CallExpression, parent.expression === node
  // Also handle: foo.bar() where foo is not the callee, or pipe(foo, bar) where foo is an arg
  const parent = node.parent
  const isCallee = ts.isCallExpression(parent) && parent.expression === node

  if (isCallee) {
    info.calleeRefs++
  } else {
    info.valueRefs++
  }

  const loc = sf.getLineAndCharacterOfPosition(node.getStart(sf))
  const relFile = path.relative(projectRoot, sf.fileName)
  if (info.sites.length < 3) {
    const posKind = isCallee ? "callee" : "value"
    info.sites.push(relFile + ":" + (loc.line + 1) + " (" + posKind + ")")
  }

  symbolRefs.set(func.symbol, info)
}

const walkRefs = (node: ts.Node, sf: ts.SourceFile) => {
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
        if (resolved === func.symbol || sym === func.symbol) {
          classifyRef(node, sf, func)
          break
        }
      }
    }
  }
  ts.forEachChild(node, (child) => walkRefs(child, sf))
}

for (const sf of projectFiles) {
  walkRefs(sf, sf)
}

// Phase 3: Report
// Rule: flag functions with exactly 1 total reference, AND that reference is a callee position
interface Result {
  name: string
  file: string
  line: number
  refCount: number
  calleeRefs: number
  valueRefs: number
  exported: boolean
  sites: string[]
}

const calleeOnlyResults: Result[] = []
const valueOnlyResults: Result[] = []
const mixedResults: Result[] = []
const deadResults: Result[] = []

for (const func of topLevelFunctions) {
  const refs = symbolRefs.get(func.symbol)
  const total = refs?.totalRefs ?? 0

  if (total === 0) {
    deadResults.push({
      name: func.name,
      file: func.fileName,
      line: func.line,
      refCount: 0,
      calleeRefs: 0,
      valueRefs: 0,
      exported: func.isExported,
      sites: []
    })
  } else if (total === 1) {
    const entry: Result = {
      name: func.name,
      file: func.fileName,
      line: func.line,
      refCount: total,
      calleeRefs: refs?.calleeRefs ?? 0,
      valueRefs: refs?.valueRefs ?? 0,
      exported: func.isExported,
      sites: refs?.sites ?? []
    }
    if (refs?.calleeRefs === 1) {
      calleeOnlyResults.push(entry)
    } else {
      valueOnlyResults.push(entry)
    }
  }
}

calleeOnlyResults.sort(
  (a, b) => a.file.localeCompare(b.file) || a.line - b.line
)
valueOnlyResults.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)

console.log("=== REFINED SINGLE-USE FUNCTION ANALYSIS ===")
console.log("Total top-level functions: " + topLevelFunctions.length)
console.log("Dead code (0 refs): " + deadResults.length)
console.log(
  "Single-use, CALLEE position (rule would flag): " + calleeOnlyResults.length
)
console.log(
  "Single-use, VALUE position (rule would NOT flag): " + valueOnlyResults.length
)
console.log("")

console.log("--- WOULD FLAG: single-use as callee ---")
for (const r of calleeOnlyResults) {
  console.log(
    "  " +
      r.file +
      ":" +
      r.line +
      "  " +
      r.name +
      (r.exported ? " [exported]" : "") +
      "  <- " +
      r.sites.join(", ")
  )
}

console.log("")
console.log("--- WOULD NOT FLAG: single-use as value ---")
for (const r of valueOnlyResults) {
  console.log(
    "  " +
      r.file +
      ":" +
      r.line +
      "  " +
      r.name +
      (r.exported ? " [exported]" : "") +
      "  <- " +
      r.sites.join(", ")
  )
}
