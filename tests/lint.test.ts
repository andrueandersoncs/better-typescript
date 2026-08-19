import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array, Effect, Option, pipe } from "effect"
import { defineConfig } from "@better-typescript/core/config"
import { lint, lintConfigured } from "@better-typescript/core/linter"
import type { Rule } from "@better-typescript/core/linter"
import type { RuleName } from "@better-typescript/core/ruleName"
import { makeViolation } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"

test("lint returns sorted and deduplicated violations from every rule", async () => {
  const fixturePath = new URL("fixtures/linter-core", import.meta.url).pathname
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const sourceFile = pipe(
    project.projects,
    Array.head,
    Option.flatMap(({ program }) =>
      pipe(
        program.getSourceFiles(),
        Array.findFirst(({ fileName }) => fileName.endsWith("/src/main.ts"))
      )
    ),
    Option.getOrThrow
  )
  const firstDeclaration = pipe(sourceFile.statements, Array.head, Option.getOrThrow)
  const secondDeclaration = pipe(sourceFile.statements, Array.get(1), Option.getOrThrow)
  const makeLocatedViolation = (
    ruleName: RuleName,
    message: string,
    node: typeof firstDeclaration
  ) => makeViolation({ ruleName, message, workspaceRoot: project.rootPath, sourceFile, node })
  const rules: ReadonlyArray<Rule> = [
    {
      name: "z-rule",
      check: ({ sourceFile: checkedSourceFile }) =>
        checkedSourceFile === sourceFile
          ? [
              makeLocatedViolation("z-rule", "second declaration", secondDeclaration),
              makeLocatedViolation("z-rule", "second declaration", secondDeclaration)
            ]
          : []
    },
    {
      name: "a-rule",
      check: ({ sourceFile: checkedSourceFile }) =>
        checkedSourceFile === sourceFile
          ? [makeLocatedViolation("a-rule", "first declaration", firstDeclaration)]
          : []
    }
  ]

  assert.deepEqual(lint({ project, rules }), [
    {
      ruleName: "a-rule",
      level: "error",
      message: "first declaration",
      filePath: "src/main.ts",
      line: 1,
      column: 1
    },
    {
      ruleName: "z-rule",
      level: "error",
      message: "second declaration",
      filePath: "src/main.ts",
      line: 2,
      column: 1
    }
  ])
})

test("lint returns an empty array when rules find no violations", async () => {
  const fixturePath = new URL("fixtures/linter-core", import.meta.url).pathname
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const rules: ReadonlyArray<Rule> = [{ name: "empty-rule", check: () => [] }]

  assert.deepEqual(lint({ project, rules }), [])
})

test("lint config selects files and applies later rule overrides", async () => {
  const fixturePath = new URL("fixtures/linter-core", import.meta.url).pathname
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const makeRule = (name: RuleName): Rule => ({
    name,
    check: ({ sourceFile, workspaceRoot }) => {
      const declaration = pipe(sourceFile.statements, Array.head, Option.getOrThrow)

      return [
        makeViolation({
          ruleName: name,
          message: name,
          workspaceRoot,
          sourceFile,
          node: declaration
        })
      ]
    }
  })
  const rules = [makeRule("alpha-rule"), makeRule("beta-rule")]
  const config = defineConfig([
    { files: ["src/**/*.ts"], rules: { "*": "error" } },
    { files: ["src/secondary.ts"], rules: { "alpha-rule": "off", "beta-rule": "warn" } }
  ])

  assert.deepEqual(
    lintConfigured(config)({ project, rules }).map(({ filePath, level, ruleName }) => ({
      filePath,
      level,
      ruleName
    })),
    [
      { filePath: "src/main.ts", level: "error", ruleName: "alpha-rule" },
      { filePath: "src/main.ts", level: "error", ruleName: "beta-rule" },
      { filePath: "src/secondary.ts", level: "warn", ruleName: "beta-rule" }
    ]
  )
})

test("lint config leaves unmatched files unlinted", async () => {
  const fixturePath = new URL("fixtures/linter-core", import.meta.url).pathname
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const rules: ReadonlyArray<Rule> = [{ name: "empty-rule", check: () => [] }]
  const config = defineConfig([{ files: ["tests/**/*.ts"], rules: { "*": "error" } }])

  assert.deepEqual(lintConfigured(config)({ project, rules }), [])
})

test("defineConfig rejects non-kebab-case rule identifiers", () => {
  assert.throws(
    () => defineConfig([{ files: ["**/*.ts"], rules: { camelCaseRule: "error" } }]),
    /kebab-case/
  )
})

test("lint config rejects unknown rule identifiers", async () => {
  const fixturePath = new URL("fixtures/linter-core", import.meta.url).pathname
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const rules: ReadonlyArray<Rule> = [{ name: "known-rule", check: () => [] }]
  const config = defineConfig([{ files: ["**/*.ts"], rules: { "unknown-rule": "error" } }])

  assert.throws(() => lintConfigured(config)({ project, rules }), /unknown rule names/)
})

test("lint rejects duplicate rule identifiers", async () => {
  const fixturePath = new URL("fixtures/linter-core", import.meta.url).pathname
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const duplicateRule: Rule = { name: "duplicate-rule", check: () => [] }

  assert.throws(() => lint({ project, rules: [duplicateRule, duplicateRule] }), /must be unique/)
})

test("lint rejects non-kebab-case rule names", async () => {
  const fixturePath = new URL("fixtures/linter-core", import.meta.url).pathname
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const rules: ReadonlyArray<Rule> = [{ name: "camelCaseRule", check: () => [] }]

  assert.throws(() => lint({ project, rules }), /kebab-case/)
})
