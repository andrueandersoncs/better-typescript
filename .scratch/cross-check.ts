// Cross-rule audit: run ALL rules against every rule's Good examples.
// The shipped test (tests/ruleExamples.test.ts) only checks a rule's examples
// against the rule itself, so cross-rule contradictions slip through.
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as ts from "typescript"
import { LoadedProject } from "../src/project/loadProject.js"
import { rules } from "../src/rules/index.js"
import type { ExampleSnippet, Rule, RuleMatch } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDirectory, "..")
const examplesRoot = path.join(repoRoot, ".scratch", "cross-examples")

const compilerOptionsJson = {
  target: "ES2022",
  module: "NodeNext",
  moduleResolution: "NodeNext",
  lib: ["ES2022"],
  types: ["node"],
  strict: true,
  skipLibCheck: true,
  noEmit: true
}

const compilerOptions = ts.convertCompilerOptionsFromJson(
  compilerOptionsJson,
  repoRoot
).options

const sharedHost = ts.createCompilerHost(compilerOptions)
const realSourceFileCache = new Map<string, ts.SourceFile | undefined>()

const getRealSourceFile = (
  fileName: string,
  languageVersion: ts.ScriptTarget | ts.CreateSourceFileOptions
): ts.SourceFile | undefined => {
  if (realSourceFileCache.has(fileName)) {
    return realSourceFileCache.get(fileName)
  }
  const sourceFile = sharedHost.getSourceFile(fileName, languageVersion)
  realSourceFileCache.set(fileName, sourceFile)
  return sourceFile
}

const createVirtualHost = (
  virtualFiles: ReadonlyMap<string, string>
): ts.CompilerHost => ({
  ...sharedHost,
  fileExists: (fileName) =>
    virtualFiles.has(fileName) || sharedHost.fileExists(fileName),
  readFile: (fileName) =>
    virtualFiles.get(fileName) ?? sharedHost.readFile(fileName),
  directoryExists: (directoryName) => {
    const prefix = directoryName.endsWith(path.sep)
      ? directoryName
      : directoryName + path.sep
    return (
      [...virtualFiles.keys()].some((f) => f.startsWith(prefix)) ||
      ts.sys.directoryExists(directoryName)
    )
  },
  realpath: (fileName) =>
    virtualFiles.has(fileName)
      ? fileName
      : (ts.sys.realpath?.(fileName) ?? fileName),
  getSourceFile: (fileName, languageVersion) => {
    const virtualText = virtualFiles.get(fileName)
    return virtualText === undefined
      ? getRealSourceFile(fileName, languageVersion)
      : ts.createSourceFile(fileName, virtualText, languageVersion)
  },
  writeFile: () => {}
})

interface CrossViolation {
  readonly hostRule: string
  readonly matchRule: string
  readonly location: string
  readonly message: string
}

const crossCheckRule = (rule: Rule): ReadonlyArray<CrossViolation> => {
  const snippets: ReadonlyArray<ExampleSnippet> = [
    ...rule.example.context,
    ...rule.example.good
  ]
  const setRoot = path.join(examplesRoot, rule.id)
  const virtualFiles = new Map(
    snippets.map((snippet) => [
      path.join(setRoot, snippet.filePath),
      snippet.code
    ])
  )
  const program = ts.createProgram({
    rootNames: [...virtualFiles.keys()],
    options: compilerOptions,
    host: createVirtualHost(virtualFiles)
  })
  const loadedProject = new LoadedProject({
    program,
    configPath: path.join(setRoot, "tsconfig.json"),
    rootPath: setRoot
  })
  const matches: ReadonlyArray<RuleMatch> = runRules([...rules])(loadedProject)

  return matches
    .filter((match) => match.ruleId !== rule.id)
    .map((match) => ({
      hostRule: rule.id,
      matchRule: match.ruleId,
      location: `${path.relative(setRoot, path.join(setRoot, match.fileName))}:${match.line}`,
      message: match.message
    }))
}

const all: CrossViolation[] = []
for (const rule of rules) {
  const violations = crossCheckRule(rule)
  all.push(...violations)
}

// Summary: which rule's Good examples violate which other rules
const byHost = new Map<string, CrossViolation[]>()
for (const v of all) {
  const list = byHost.get(v.hostRule) ?? []
  list.push(v)
  byHost.set(v.hostRule, list)
}

console.log(`TOTAL cross-rule violations in Good examples: ${all.length}\n`)
for (const [host, violations] of [...byHost.entries()].sort(
  (a, b) => b[1].length - a[1].length
)) {
  console.log(`## ${host} (${violations.length})`)
  for (const v of violations) {
    console.log(`  - [${v.matchRule}] ${v.location}  ${v.message}`)
  }
  console.log()
}

// Pair frequency matrix
const pairCounts = new Map<string, number>()
for (const v of all) {
  const key = `${v.hostRule} <- ${v.matchRule}`
  pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1)
}
console.log("## Pair frequency")
for (const [pair, count] of [...pairCounts.entries()].sort(
  (a, b) => b[1] - a[1]
)) {
  console.log(`  ${count}  ${pair}`)
}
