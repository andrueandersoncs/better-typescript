import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array, Effect, Option, pipe } from "effect"
import { lint } from "@better-typescript/core/linter"
import type { Rule } from "@better-typescript/core/linter"
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
  const makeLocatedViolation = (ruleName: string, message: string, node: typeof firstDeclaration) =>
    makeViolation({ ruleName, message, workspaceRoot: project.rootPath, sourceFile, node })
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
      message: "first declaration",
      filePath: "src/main.ts",
      line: 1,
      column: 1
    },
    {
      ruleName: "z-rule",
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
