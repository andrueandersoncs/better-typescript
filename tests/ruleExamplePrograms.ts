import * as path from "node:path"
import { fileURLToPath } from "node:url"
import * as ts from "typescript"
import { LoadedProject } from "../src/project/loadProject.js"
import { rules } from "../src/rules/index.js"
import type { ExampleSnippet, Rule, Finding } from "../src/rules/index.js"
import { runRules } from "../src/runner/runRules.js"

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(testDirectory, "..")
const examplesRoot = path.join(repoRoot, "tests", "rule-examples")

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

const convertedOptions = ts.convertCompilerOptionsFromJson(
  compilerOptionsJson,
  repoRoot
)

const compilerOptions = convertedOptions.options

const diagnosticsFormatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => repoRoot,
  getNewLine: () => "\n"
}

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

const hasVirtualDirectory =
  (virtualFiles: ReadonlyMap<string, string>) =>
  (directoryName: string): boolean => {
    const prefix = directoryName.endsWith(path.sep)
      ? directoryName
      : directoryName + path.sep

    return [...virtualFiles.keys()].some((fileName) =>
      fileName.startsWith(prefix)
    )
  }

const createVirtualHost = (
  virtualFiles: ReadonlyMap<string, string>
): ts.CompilerHost => ({
  ...sharedHost,
  fileExists: (fileName) =>
    virtualFiles.has(fileName) || sharedHost.fileExists(fileName),
  readFile: (fileName) =>
    virtualFiles.get(fileName) ?? sharedHost.readFile(fileName),
  directoryExists: (directoryName) =>
    hasVirtualDirectory(virtualFiles)(directoryName) ||
    ts.sys.directoryExists(directoryName),
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

export type ExampleSetLabel = "bad" | "good"

export interface CompiledExampleSet {
  readonly compileProblems: ReadonlyArray<string>
  readonly ruleMatches: ReadonlyArray<Finding>
}

const duplicateProblems = (
  label: string,
  snippets: ReadonlyArray<ExampleSnippet>
): ReadonlyArray<string> => {
  const filePaths = snippets.map((snippet) => snippet.filePath)
  const duplicates = filePaths.filter(
    (filePath, index) => filePaths.indexOf(filePath) !== index
  )

  return [...new Set(duplicates)].map(
    (filePath) => `duplicated ${label} snippet filePath: ${filePath}`
  )
}

const exampleSetSnippets = (
  rule: Rule,
  label: ExampleSetLabel
): ReadonlyArray<ExampleSnippet> =>
  label === "bad" ? rule.example.bad : rule.example.good

const snippetProblems =
  (program: ts.Program, setRoot: string) =>
  (absolutePath: string): ReadonlyArray<string> => {
    const relativePath = path.relative(setRoot, absolutePath)
    const sourceFile = program.getSourceFile(absolutePath)

    if (sourceFile === undefined) {
      return [`${relativePath}: snippet is missing from the program`]
    }

    const diagnostics = [
      ...program.getSyntacticDiagnostics(sourceFile),
      ...program.getSemanticDiagnostics(sourceFile)
    ]

    return diagnostics.map((diagnostic) =>
      ts
        .formatDiagnostics([diagnostic], diagnosticsFormatHost)
        .replaceAll(setRoot + path.sep, "")
        .trim()
    )
  }

export const compileExampleSet = (
  rule: Rule,
  label: ExampleSetLabel
): CompiledExampleSet => {
  const setSnippets = exampleSetSnippets(rule, label)
  const duplicates = [
    ...duplicateProblems("context", rule.example.context),
    ...duplicateProblems(label, setSnippets)
  ]

  if (duplicates.length > 0) {
    return { compileProblems: duplicates, ruleMatches: [] }
  }

  const setRoot = path.join(examplesRoot, rule.id, label)
  const snippets = [...rule.example.context, ...setSnippets]
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
  const compileProblems = [...virtualFiles.keys()].flatMap(
    snippetProblems(program, setRoot)
  )
  // Every registered rule runs so the test can also assert cross-rule coherence:
  // a Good example must satisfy the whole guide, not only its own rule.
  const ruleMatches = runRules([...rules])(loadedProject)

  return { compileProblems, ruleMatches }
}
