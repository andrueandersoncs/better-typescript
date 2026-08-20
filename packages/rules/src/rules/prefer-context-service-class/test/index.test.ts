import * as assert from "node:assert/strict"
import * as path from "node:path"
import { test } from "bun:test"
import { Effect } from "effect"
import { lint } from "@better-typescript/core/linter"
import { builtinRules } from "@better-typescript/rules/builtinRules"
import { loadProject } from "@better-typescript/core/project/loadProject"
import { assertRuleFixture } from "../../../../../../tests/assertRuleFixture.js"
import { ruleNamed } from "../../../../../../tests/ruleNamed.js"

const expectedMessage =
  "Prefer a class extending Context.Service for service definitions. " +
  "Pass the service interface as the Shape type parameter."

test("prefer-context-service-class reports function-style definitions and permits class style", () =>
  assertRuleFixture(ruleNamed("prefer-context-service-class")))

test("prefer-context-service-class has one canonical Rule and one message", async () => {
  const registered = builtinRules.filter(({ name }) => name === "prefer-context-service-class")
  const rule = ruleNamed("prefer-context-service-class")
  const fixturePath = path.join(import.meta.dir, "../fixtures/rule")
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const findings = lint({ project, rules: [rule] })

  assert.equal(registered.length, 1)
  assert.ok(findings.length > 0)
  assert.ok(findings.every(({ message }) => message === expectedMessage))
})

test("prefer-context-service-class is disjoint from service operation wrapping", async () => {
  const fixturePath = path.join(import.meta.dir, "../fixtures/rule")
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const rules = [ruleNamed("prefer-context-service-class"), ruleNamed("service-method-effect-fn")]
  const violations = lint({ project, rules })
    .filter(({ filePath }) => filePath === "src/matrix.ts")
    .map(({ column, line, message, ruleName }) => ({ column, line, message, ruleName }))

  assert.deepEqual(violations, [
    {
      column: 30,
      line: 7,
      message: expectedMessage,
      ruleName: "prefer-context-service-class"
    },
    {
      column: 5,
      line: 11,
      message:
        "Wrap public Effect service operations with a named Effect.fn. " +
        "Name the operation Domain.operation and keep the generator body focused on its workflow.",
      ruleName: "service-method-effect-fn"
    }
  ])
})

test("prefer-context-service-class is independent from Effect.fn naming", async () => {
  const fixturePath = path.join(import.meta.dir, "../fixtures/rule")
  const project = await Effect.runPromise(loadProject({ projectPath: fixturePath }))
  const rules = [ruleNamed("prefer-context-service-class"), ruleNamed("effect-fn-name")]
  const violations = lint({ project, rules })
    .filter(({ filePath }) => filePath === "src/effect-fn-matrix.ts")
    .map(({ column, line, message, ruleName }) => ({ column, line, message, ruleName }))

  assert.deepEqual(violations, [
    {
      column: 30,
      line: 7,
      message: expectedMessage,
      ruleName: "prefer-context-service-class"
    },
    {
      column: 43,
      line: 9,
      message: expectedMessage,
      ruleName: "prefer-context-service-class"
    },
    {
      column: 9,
      line: 14,
      message:
        "Use a non-empty domain-qualified Effect.fn name. " +
        "Use a stable name such as UserRepo.get for tracing and spans.",
      ruleName: "effect-fn-name"
    }
  ])
})
