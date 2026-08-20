import * as assert from "node:assert/strict"
import { test } from "bun:test"
import * as ts from "typescript"
import { defineConfig } from "@better-typescript/core/config"
import { lintConfigured } from "@better-typescript/core/linter"
import { builtinRules } from "@better-typescript/rules/builtinRules"
import { ruleNamed } from "./ruleNamed.js"

const makeVirtualProject = (sources: Readonly<Record<string, string>>) => {
  const rootPath = "/virtual"
  const fileNames = Object.keys(sources)
  const options: ts.CompilerOptions = {
    module: ts.ModuleKind.ESNext,
    noLib: true,
    noUnusedLocals: true,
    target: ts.ScriptTarget.ES2022
  }
  const baseHost = ts.createCompilerHost(options, true)
  const readVirtualSource = (fileName: string) => sources[fileName]
  const host: ts.CompilerHost = {
    ...baseHost,
    fileExists: (fileName) =>
      readVirtualSource(fileName) !== undefined || baseHost.fileExists(fileName),
    readFile: (fileName) => readVirtualSource(fileName) ?? baseHost.readFile(fileName),
    getSourceFile: (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      const source = readVirtualSource(fileName)

      return source === undefined
        ? baseHost.getSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)
        : ts.createSourceFile(fileName, source, languageVersion, true)
    }
  }
  const program = ts.createProgram({ rootNames: fileNames, options, host })

  const loadedProject = { program, configPath: `${rootPath}/tsconfig.json`, rootPath }
  const workspace = { rootPath, projects: [loadedProject] }

  return { program, workspace }
}

const duplicateConfig = defineConfig([
  { files: ["alpha.ts"], rules: { "no-duplicate-function-names": "error" } }
])

test("Program-wide indexes inform findings for only the configured source", () => {
  const project = makeVirtualProject({
    "/virtual/alpha.ts": "export function shared() {}",
    "/virtual/beta.ts": "export function shared() {}"
  })
  const rule = ruleNamed("no-duplicate-function-names")

  const violations = lintConfigured(duplicateConfig)({ project: project.workspace, rules: [rule] })

  assert.equal(violations.length, 1)
  assert.equal(violations[0]?.filePath, "alpha.ts")
  assert.match(violations[0]?.message ?? "", /beta\.ts/)
})

test("file subscriptions do not inspect disabled sources", () => {
  const project = makeVirtualProject({
    "/virtual/alpha.ts": "const alpha = 1; console.log(alpha)",
    "/virtual/beta.ts": "const beta = 2"
  })
  const visited: Array<string> = []
  const semanticDiagnostics = project.program.getSemanticDiagnostics.bind(project.program)

  project.program.getSemanticDiagnostics = (sourceFile, cancellationToken) => {
    if (sourceFile !== undefined) {
      visited.push(sourceFile.fileName)
    }

    return semanticDiagnostics(sourceFile, cancellationToken)
  }

  const config = defineConfig([{ files: ["alpha.ts"], rules: { "no-unused": "error" } }])
  const rule = ruleNamed("no-unused")

  lintConfigured(config)({ project: project.workspace, rules: [rule] })

  assert.deepEqual(visited, ["/virtual/alpha.ts"])
})

test("node subscriptions do not traverse disabled sources", () => {
  const project = makeVirtualProject({
    "/virtual/alpha.ts": "const alpha = 1",
    "/virtual/beta.ts": "for (;;) {}"
  })
  project.program.getTypeChecker()

  const sourceFiles = project.program.getSourceFiles()
  const disabled = sourceFiles.find((sourceFile) => sourceFile.fileName.endsWith("beta.ts"))

  assert.ok(disabled)

  const guardedDisabled = new Proxy(disabled, {
    get: (target, property, receiver) => {
      assert.notEqual(property, "statements", "disabled source was traversed")

      return Reflect.get(target, property, receiver)
    }
  })
  const guardedSources = sourceFiles.map((sourceFile) =>
    sourceFile === disabled ? guardedDisabled : sourceFile
  )

  project.program.getSourceFiles = () => guardedSources

  const config = defineConfig([{ files: ["alpha.ts"], rules: { "no-for-loops": "error" } }])
  const rule = ruleNamed("no-for-loops")

  lintConfigured(config)({ project: project.workspace, rules: [rule] })
})

test("prefer-inferred-types does not analyze disabled sources", () => {
  const project = makeVirtualProject({
    "/virtual/alpha.ts": "const alpha: number = 1",
    "/virtual/beta.ts": "const beta: number = 2"
  })
  const checker = project.program.getTypeChecker()
  const getSymbolAtLocation = checker.getSymbolAtLocation.bind(checker)
  const visited: Array<string> = []

  checker.getSymbolAtLocation = (node) => {
    visited.push(node.getSourceFile().fileName)

    return getSymbolAtLocation(node)
  }

  const config = defineConfig([
    { files: ["alpha.ts"], rules: { "prefer-inferred-types": "error" } }
  ])
  const rule = ruleNamed("prefer-inferred-types")

  lintConfigured(config)({ project: project.workspace, rules: [rule] })

  assert.ok(visited.length > 0)
  assert.ok(visited.every((fileName) => fileName === "/virtual/alpha.ts"))
})

test("latest Program indexes isolate A/B/A analyses", () => {
  const first = makeVirtualProject({
    "/virtual/alpha.ts": "export function shared() {}",
    "/virtual/first.ts": "export function shared() {}"
  })
  const second = makeVirtualProject({
    "/virtual/alpha.ts": "export function other() {}",
    "/virtual/second.ts": "export function other() {}"
  })
  const rule = ruleNamed("no-duplicate-function-names")
  const projects = [first, second, first]
  const messages = projects.flatMap((project) =>
    lintConfigured(duplicateConfig)({ project: project.workspace, rules: [rule] }).map(
      ({ message }) => message
    )
  )

  assert.match(messages[0] ?? "", /first\.ts/)
  assert.match(messages[1] ?? "", /second\.ts/)
  assert.match(messages[2] ?? "", /first\.ts/)
})

test("built-in scanner caches do not retain a completed Program", () => {
  let first: ReturnType<typeof makeVirtualProject> | null = makeVirtualProject({
    "/virtual/alpha.ts": "export const alpha = 1"
  })
  const weakProgram = new WeakRef(first.program)
  const allRules = Object.fromEntries(builtinRules.map(({ name }) => [name, "error"] as const))
  const config = defineConfig([{ files: ["alpha.ts"], rules: allRules }])

  lintConfigured(config)({ project: first.workspace, rules: builtinRules })
  first = null

  const second = makeVirtualProject({ "/virtual/alpha.ts": "export const beta = 2" })

  lintConfigured(config)({ project: second.workspace, rules: builtinRules })
  Bun.gc(true)

  assert.equal(weakProgram.deref(), undefined)
})
