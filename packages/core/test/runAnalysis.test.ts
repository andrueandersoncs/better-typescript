import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Effect, Option, pipe } from "effect"
import * as ts from "typescript"
import { runAnalysis } from "@better-typescript/core/analysis"
import { NodeTarget, PositionTarget, RuleFinding } from "@better-typescript/core/linter"
import type { Rule } from "@better-typescript/core/linter"

const fixtureRoot = new URL("fixtures/analysis-run", import.meta.url).pathname
const workspaceInput = new URL("fixtures/analysis-run/workspace-input", import.meta.url).pathname
const sharedFilePath = path.join(fixtureRoot, "shared.ts")
const sharedSourceFile = ts.createSourceFile(sharedFilePath, "", ts.ScriptTarget.Latest)
const sharedTarget = PositionTarget.make({ sourceFile: sharedSourceFile, position: 0 })
const sharedFinding = RuleFinding.make({ message: "Shared aggregate.", target: sharedTarget })

const makeFixtureRule = (visit: (program: ts.Program, projectRoot: string) => void): Rule => ({
  name: "fixture-rule",
  check: ({ program, projectRoot, sourceFile }) => {
    visit(program, projectRoot)
    const declaration = pipe(sourceFile.statements, Option.fromIterable, Option.getOrThrow)
    const target = NodeTarget.make({ node: declaration })
    const finding = RuleFinding.make({ message: "Fixture declaration.", target })

    return [finding, sharedFinding]
  }
})

test("runAnalysis owns a complete ordered configured solution-workspace run", async () => {
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

test("runAnalysis checks only files selected by tsconfig", async () => {
  const projectPath = new URL("fixtures/project-boundary", import.meta.url).pathname
  const rule: Rule = {
    name: "project-boundary-rule",
    check: ({ sourceFile }) => {
      const declaration = pipe(sourceFile.statements, Option.fromIterable, Option.getOrThrow)
      const target = NodeTarget.make({ node: declaration })

      return [RuleFinding.make({ message: "Checked source.", target })]
    }
  }

  const result = await Effect.runPromise(runAnalysis({ projectPath, rules: [rule] }))

  assert.deepEqual(
    result.violations.map(({ filePath }) => filePath),
    ["src/main.ts"]
  )
})
