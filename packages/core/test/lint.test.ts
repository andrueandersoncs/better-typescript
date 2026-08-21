import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array, Effect, Option, pipe } from "effect"
import { defineConfig } from "@better-typescript/core/config"
import {
  NodeTarget,
  PositionTarget,
  RuleFinding,
  Violation,
  lint,
  lintConfigured
} from "@better-typescript/core/linter"
import type { Rule } from "@better-typescript/core/linter"
import type { RuleName } from "@better-typescript/core/ruleName"
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
  const makeNodeFinding = (message: string, node: typeof firstDeclaration): RuleFinding => {
    const target = NodeTarget.make({ node })

    return RuleFinding.make({ message, target })
  }
  const rules: ReadonlyArray<Rule> = [
    {
      name: "z-rule",
      check: ({ sourceFile: checkedSourceFile }) =>
        checkedSourceFile === sourceFile
          ? [
              makeNodeFinding("second declaration", secondDeclaration),
              makeNodeFinding("alternate second declaration", secondDeclaration),
              makeNodeFinding("second declaration", secondDeclaration)
            ]
          : []
    },
    {
      name: "a-rule",
      check: ({ sourceFile: checkedSourceFile }) =>
        checkedSourceFile === sourceFile
          ? [makeNodeFinding("first declaration", firstDeclaration)]
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
      message: "alternate second declaration",
      filePath: "src/main.ts",
      line: 2,
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

test("lint materializes explicit positions with configured Rule metadata", async () => {
  const fixturePath = new URL("fixtures/linter-core", import.meta.url).pathname
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const rule: Rule = {
    name: "position-rule",
    check: ({ sourceFile }) => {
      const position = sourceFile.getPositionOfLineAndCharacter(1, 7)
      const target = PositionTarget.make({ sourceFile, position })
      const finding = RuleFinding.make({ message: "explicit position", target })

      return [
        {
          ...finding,
          ruleName: "forged-rule",
          level: "error",
          filePath: "forged.ts",
          line: 99,
          column: 99
        }
      ]
    }
  }
  const config = defineConfig([{ files: ["src/main.ts"], rules: { "position-rule": "warn" } }])

  assert.deepEqual(lintConfigured(config)({ project, rules: [rule] }), [
    {
      ruleName: "position-rule",
      level: "warn",
      message: "explicit position",
      filePath: "src/main.ts",
      line: 2,
      column: 8
    }
  ])
})

test("PositionTarget rejects offsets outside its source file", async () => {
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

  assert.throws(
    () => PositionTarget.make({ sourceFile, position: -1 }),
    /Position must be an integer within the source file/
  )
  assert.throws(
    () => PositionTarget.make({ sourceFile, position: sourceFile.end + 1 }),
    /Position must be an integer within the source file/
  )
})

test("Rule rejects pre-serialized Violations at its type interface", () => {
  const violation = Violation.make({
    ruleName: "serialized-rule",
    level: "error",
    message: "already serialized",
    filePath: "src/main.ts",
    line: 1,
    column: 1
  })
  const serializedRule: Rule = {
    name: "serialized-rule",
    // @ts-expect-error Rule checks return targeted local findings, not Violations.
    check: () => [violation]
  }

  assert.equal(serializedRule.name, "serialized-rule")
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
    check: ({ sourceFile }) => {
      const declaration = pipe(sourceFile.statements, Array.head, Option.getOrThrow)
      const target = NodeTarget.make({ node: declaration })
      const finding = RuleFinding.make({ message: name, target })

      return [finding]
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

test("lint config discards findings targeted outside the configured file", async () => {
  const fixturePath = new URL("fixtures/linter-core", import.meta.url).pathname
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const secondarySource = pipe(
    project.projects,
    Array.head,
    Option.flatMap(({ program }) =>
      pipe(
        program.getSourceFiles(),
        Array.findFirst(({ fileName }) => fileName.endsWith("/src/secondary.ts"))
      )
    ),
    Option.getOrThrow
  )
  const secondaryDeclaration = pipe(secondarySource.statements, Array.head, Option.getOrThrow)
  const rule: Rule = {
    name: "cross-file-rule",
    check: () => [
      RuleFinding.make({
        message: "node target outside configured file",
        target: NodeTarget.make({ node: secondaryDeclaration })
      }),
      RuleFinding.make({
        message: "position target outside configured file",
        target: PositionTarget.make({ sourceFile: secondarySource, position: 0 })
      })
    ]
  }
  const config = defineConfig([{ files: ["src/main.ts"], rules: { "*": "error" } }])

  assert.deepEqual(lintConfigured(config)({ project, rules: [rule] }), [])
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
