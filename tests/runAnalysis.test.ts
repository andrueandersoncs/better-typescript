import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Effect, Option, pipe } from "effect"
import type * as ts from "typescript"
import { runAnalysis } from "@better-typescript/core/analysis"
import { Violation, makeViolation } from "@better-typescript/core/linter"
import type { Rule } from "@better-typescript/core/linter"

const fixtureRoot = new URL("fixtures/analysis-run", import.meta.url).pathname
const workspaceInput = new URL("fixtures/analysis-run/workspace-input", import.meta.url).pathname
const makeFixtureRule = (visit: (program: ts.Program, projectRoot: string) => void): Rule => ({
  name: "fixture-rule",
  check: ({ program, projectRoot, sourceFile, workspaceRoot }) => {
    visit(program, projectRoot)
    const declaration = pipe(sourceFile.statements, Option.fromIterable, Option.getOrThrow)

    const locatedViolation = makeViolation({
      ruleName: "fixture-rule",
      message: "Fixture declaration.",
      workspaceRoot,
      sourceFile,
      node: declaration
    })
    const sharedViolation = Violation.make({
      ruleName: "fixture-rule",
      level: "warn",
      message: "Shared aggregate.",
      filePath: "shared.ts",
      line: 1,
      column: 1
    })

    return [locatedViolation, sharedViolation]
  }
})

test("runAnalysis owns a complete ordered solution-workspace run", async () => {
  const programOrder: Array<WeakRef<ts.Program>> = []
  const projectOrder: Array<string> = []
  let currentProgram: WeakRef<ts.Program> | null = null
  const rule = makeFixtureRule((program, projectRoot) => {
    if (currentProgram?.deref() !== program) {
      if (currentProgram !== null) {
        Bun.gc(true)
        assert.equal(currentProgram.deref(), undefined)
      }

      programOrder.push(new WeakRef(program))
      projectOrder.push(projectRoot)
      currentProgram = new WeakRef(program)
    }
  })

  const result = await Effect.runPromise(
    runAnalysis({ projectPath: workspaceInput, rules: [rule] })
  )

  assert.equal(result.rootPath, fixtureRoot)
  assert.deepEqual(Object.keys(result), ["rootPath", "violations"])
  assert.equal(programOrder.length, 2)
  assert.deepEqual(
    projectOrder.map((projectRoot) => projectRoot.slice(fixtureRoot.length + 1)),
    ["packages/beta", "packages/alpha"]
  )
  assert.deepEqual(result.violations, [
    {
      ruleName: "fixture-rule",
      level: "warn",
      message: "Fixture declaration.",
      filePath: "packages/alpha/src/alpha.ts",
      line: 1,
      column: 1
    },
    {
      ruleName: "fixture-rule",
      level: "warn",
      message: "Fixture declaration.",
      filePath: "packages/beta/src/beta.ts",
      line: 1,
      column: 1
    },
    {
      ruleName: "fixture-rule",
      level: "warn",
      message: "Shared aggregate.",
      filePath: "shared.ts",
      line: 1,
      column: 1
    }
  ])
})

test("runAnalysis repeats without returning compiler state", async () => {
  const firstRunProjects = new Array<string>()
  const secondRunProjects = new Array<string>()

  const firstResult = await Effect.runPromise(
    runAnalysis({
      projectPath: fixtureRoot,
      rules: [makeFixtureRule((_program, projectRoot) => firstRunProjects.push(projectRoot))]
    })
  )

  const secondResult = await Effect.runPromise(
    runAnalysis({
      projectPath: fixtureRoot,
      rules: [makeFixtureRule((_program, projectRoot) => secondRunProjects.push(projectRoot))]
    })
  )

  assert.deepEqual(secondResult, firstResult)
  assert.deepEqual(secondRunProjects, firstRunProjects)
  assert.equal(firstRunProjects.length, 2)
})
