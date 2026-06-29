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

// Phase 2: Count references per symbol
const symbolRefCounts = new Map<ts.Symbol, { count: number; sites: string[] }>()

const countRefs = (node: ts.Node, sf: ts.SourceFile) => {
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
          // Skip the declaration name itself
          const declName = ts.isVariableDeclaration(func.node)
            ? (func.node as ts.VariableDeclaration).name
            : (func.node as ts.FunctionDeclaration).name
          if (node === declName) continue

          const entry = symbolRefCounts.get(func.symbol) ?? {
            count: 0,
            sites: []
          }
          const loc = sf.getLineAndCharacterOfPosition(node.getStart(sf))
          const relFile = path.relative(projectRoot, sf.fileName)
          entry.count++
          if (entry.sites.length < 3) {
            entry.sites.push(relFile + ":" + (loc.line + 1))
          }
          symbolRefCounts.set(func.symbol, entry)
          break
        }
      }
    }
  }
  ts.forEachChild(node, (child) => countRefs(child, sf))
}

for (const sf of projectFiles) {
  countRefs(sf, sf)
}

// Phase 3: Check if single-ref functions are passed as arguments
const checkPassedAsArg = (targetSym: ts.Symbol): boolean => {
  for (const sf of projectFiles) {
    let found = false
    const walk = (node: ts.Node) => {
      if (found) return
      if (ts.isIdentifier(node)) {
        let sym: ts.Symbol | undefined
        try {
          sym = checker.getSymbolAtLocation(node)
        } catch {
          return
        }
        let resolved = sym
        try {
          if (sym && sym.flags & ts.SymbolFlags.Alias)
            resolved = checker.getAliasedSymbol(sym)
        } catch {}
        if (resolved === targetSym || sym === targetSym) {
          const parent = node.parent
          if (ts.isCallExpression(parent) && parent.expression !== node) {
            found = true
          }
        }
      }
      if (!found) ts.forEachChild(node, walk)
    }
    walk(sf)
    if (found) return true
  }
  return false
}

interface Result {
  name: string
  file: string
  line: number
  refCount: number
  exported: boolean
  sites: string[]
  passedAsArg: boolean
}

const results: Result[] = []

for (const func of topLevelFunctions) {
  const refs = symbolRefCounts.get(func.symbol)
  const refCount = refs?.count ?? 0

  if (refCount <= 1) {
    results.push({
      name: func.name,
      file: func.fileName,
      line: func.line,
      refCount,
      exported: func.isExported,
      sites: refs?.sites ?? [],
      passedAsArg: refCount === 1 ? checkPassedAsArg(func.symbol) : false
    })
  }
}

results.sort((a, b) => a.refCount - b.refCount || a.file.localeCompare(b.file))

console.log("\n=== TOP-LEVEL FUNCTIONS WITH 0-1 REFERENCES ===")
console.log("Total top-level functions found: " + topLevelFunctions.length)
console.log(
  "Functions with 0 references (dead code): " +
    results.filter((r) => r.refCount === 0).length
)
console.log(
  "Functions with 1 reference: " +
    results.filter((r) => r.refCount === 1).length
)
console.log(
  "  - of which passed as argument: " +
    results.filter((r) => r.refCount === 1 && r.passedAsArg).length
)
console.log(
  "  - of which exported: " +
    results.filter((r) => r.refCount === 1 && r.exported).length
)

console.log("\n--- ZERO REFERENCES (dead code) ---")
for (const r of results.filter((r) => r.refCount === 0)) {
  console.log(
    "  " +
      (r.exported ? "[exported] " : "") +
      r.file +
      ":" +
      r.line +
      "  " +
      r.name
  )
}

console.log("\n--- ONE REFERENCE (candidates for inlining) ---")
for (const r of results.filter((r) => r.refCount === 1)) {
  const tags: string[] = []
  if (r.exported) tags.push("exported")
  if (r.passedAsArg) tags.push("passed-as-arg")
  const tagStr = tags.length > 0 ? " [" + tags.join(", ") + "]" : ""
  console.log(
    "  " +
      r.file +
      ":" +
      r.line +
      "  " +
      r.name +
      tagStr +
      "  <- " +
      r.sites.join(", ")
  )
}
