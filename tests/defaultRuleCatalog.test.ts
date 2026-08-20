import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array } from "effect"
import { builtinRules } from "@better-typescript/rules/builtinRules"
import { expectedRuleNames } from "./expectedBuiltinRuleNames.js"

test("built-in rule catalog contains every selected identity once", () => {
  const names = Array.map(builtinRules, ({ name }) => name)

  assert.equal(Array.dedupe(names).length, names.length)
  assert.deepEqual(names, expectedRuleNames)
})

test("every built-in rule name is kebab-case", () => {
  const kebabCase = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

  assert.ok(builtinRules.every(({ name }) => kebabCase.test(name)))
})
