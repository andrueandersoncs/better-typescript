import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { builtinRules } from "@better-typescript/rules/builtinRules"
import { assertRuleFixture } from "./assertRuleFixture.js"
import { ruleNamed } from "./ruleNamed.js"
import { runRuleFixture } from "./runRuleFixture.js"

const expectedMessage =
  "Read runtime configuration through Effect Config, not process.env. " +
  "Read the key in a Config-backed layer and provide deterministic config in tests."

test("process-environment reports production reads and permits roots and tests", () =>
  assertRuleFixture(ruleNamed("process-environment")))

test("process-environment has one canonical Rule and one message", async () => {
  const registered = builtinRules.filter(({ name }) => name === "process-environment")
  const violations = await runRuleFixture(ruleNamed("process-environment"))

  assert.equal(registered.length, 1)
  assert.ok(violations.length > 0)
  assert.ok(violations.every(({ message }) => message === expectedMessage))
})
