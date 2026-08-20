import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Effect } from "effect"
import { lint } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

const expectedMessage =
  "Compose dependent layers with Layer.provide or Layer.provideMerge, not Layer.merge. " +
  "Use Layer.provide to hide dependency services, or Layer.provideMerge to keep them exposed; " +
  "reserve merge and mergeAll for independent layers."

const fixtureViolations = (fileName: string) => async (ruleNames: ReadonlyArray<string>) => {
  const fixturePath = path.join(import.meta.dir, "../fixtures/rule")
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const rules = ruleNames.map(ruleNamed)

  return lint({ project, rules })
    .filter(({ filePath }) => filePath === `src/${fileName}`)
    .map(({ line, message, ruleName }) => ({ line, message, ruleName }))
}

const matrixViolations = fixtureViolations("matrix.ts")

test("dependent-layer-merge detects dependency edges and permits independent layers", () =>
  assertRuleFixture(ruleNamed("dependent-layer-merge")))

test("dependent-layer-merge has one exact message", async () => {
  const violations = await matrixViolations(["dependent-layer-merge"])

  assert.ok(violations.length > 0)
  assert.ok(violations.every(({ message }) => message === expectedMessage))
})

test("dependent-layer-merge is independent from Layer acquisition lifetime", async () => {
  const violations = await matrixViolations([
    "dependent-layer-merge",
    "layer-forever-acquisition",
    "scoped-background-work"
  ])

  assert.deepEqual(
    violations.map(({ line, ruleName }) => ({ line, ruleName })),
    [
      { line: 4, ruleName: "dependent-layer-merge" },
      { line: 6, ruleName: "layer-forever-acquisition" },
      { line: 8, ruleName: "scoped-background-work" },
      { line: 12, ruleName: "layer-forever-acquisition" },
      { line: 14, ruleName: "dependent-layer-merge" },
      { line: 16, ruleName: "dependent-layer-merge" }
    ]
  )
})

test("dependent-layer-merge leaves aliases and uncertain casts to their owners", async () => {
  const violations = await matrixViolations([
    "dependent-layer-merge",
    "no-value-aliases",
    "unsafe-casts"
  ])

  assert.deepEqual(
    violations.map(({ line, ruleName }) => ({ line, ruleName })),
    [
      { line: 4, ruleName: "dependent-layer-merge" },
      { line: 14, ruleName: "dependent-layer-merge" },
      { line: 16, ruleName: "dependent-layer-merge" },
      { line: 18, ruleName: "unsafe-casts" },
      { line: 20, ruleName: "no-value-aliases" }
    ]
  )
})

test("dependent-layer-merge co-reports only independent syntax concerns", async () => {
  const violations = await fixtureViolations("syntax-matrix.ts")([
    "dependent-layer-merge",
    "no-nested-calls",
    "prefer-pipe-function"
  ])

  assert.deepEqual(
    violations.map(({ line, ruleName }) => ({ line, ruleName })),
    [
      { line: 6, ruleName: "dependent-layer-merge" },
      { line: 8, ruleName: "dependent-layer-merge" },
      { line: 8, ruleName: "no-nested-calls" },
      { line: 10, ruleName: "prefer-pipe-function" },
      { line: 10, ruleName: "dependent-layer-merge" }
    ]
  )
})
