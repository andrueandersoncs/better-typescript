import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Effect } from "effect"
import { lint } from "@better-typescript/core/linter"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { assertRuleFixture } from "../../../../test/assertRuleFixture.js"
import { ruleNamed } from "../../../../test/ruleNamed.js"

const expectedMessage =
  "Flatten an Effect that produces a Layer with Layer.unwrap. " +
  "Replace the manual Layer.effect and Layer.flatMap bridge with Layer.unwrap(effect)."

const matrixViolations = async (ruleNames: ReadonlyArray<string>) => {
  const fixturePath = path.join(import.meta.dir, "../fixtures/rule")
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const rules = ruleNames.map(ruleNamed)

  return lint({ project, rules })
    .filter(({ filePath }) => filePath === "src/matrix.ts")
    .map(({ line, message, ruleName }) => ({ line, message, ruleName }))
}

test("prefer-layer-unwrap detects manual Effect<Layer> flattening", () =>
  assertRuleFixture(ruleNamed("prefer-layer-unwrap")))

test("prefer-layer-unwrap has one exact message and target", async () => {
  const violations = await matrixViolations(["prefer-layer-unwrap"])

  assert.deepEqual(violations, [
    { line: 4, message: expectedMessage, ruleName: "prefer-layer-unwrap" },
    { line: 8, message: expectedMessage, ruleName: "prefer-layer-unwrap" },
    { line: 15, message: expectedMessage, ruleName: "prefer-layer-unwrap" }
  ])
})

test("prefer-layer-unwrap is independent from Layer lifetime", async () => {
  const violations = await matrixViolations(["prefer-layer-unwrap", "layer-forever-acquisition"])

  assert.deepEqual(
    violations.map(({ line, ruleName }) => ({ line, ruleName })),
    [
      { line: 4, ruleName: "prefer-layer-unwrap" },
      { line: 6, ruleName: "layer-forever-acquisition" },
      { line: 8, ruleName: "prefer-layer-unwrap" },
      { line: 9, ruleName: "layer-forever-acquisition" },
      { line: 15, ruleName: "prefer-layer-unwrap" }
    ]
  )
})

test("prefer-layer-unwrap is independent from dependent composition", async () => {
  const violations = await matrixViolations(["prefer-layer-unwrap", "dependent-layer-merge"])

  assert.deepEqual(
    violations.map(({ line, ruleName }) => ({ line, ruleName })),
    [
      { line: 4, ruleName: "prefer-layer-unwrap" },
      { line: 8, ruleName: "prefer-layer-unwrap" },
      { line: 13, ruleName: "dependent-layer-merge" },
      { line: 15, ruleName: "prefer-layer-unwrap" },
      { line: 16, ruleName: "dependent-layer-merge" }
    ]
  )
})

test("prefer-layer-unwrap leaves value aliases to their owner", async () => {
  const violations = await matrixViolations(["prefer-layer-unwrap", "no-value-aliases"])

  assert.deepEqual(
    violations.map(({ line, ruleName }) => ({ line, ruleName })),
    [
      { line: 4, ruleName: "prefer-layer-unwrap" },
      { line: 8, ruleName: "prefer-layer-unwrap" },
      { line: 15, ruleName: "prefer-layer-unwrap" },
      { line: 20, ruleName: "no-value-aliases" }
    ]
  )
})
