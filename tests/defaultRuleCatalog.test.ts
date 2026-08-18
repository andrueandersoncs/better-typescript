import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array, Order, pipe } from "effect"
import { builtinRules } from "@better-typescript/rules/builtinRules"
import { expectedRuleNames } from "./overhaulExpectedTargetRuleNames.js"

test("built-in rule catalog contains every selected identity once", () => {
  const names = pipe(
    builtinRules,
    Array.map(({ name }) => name),
    Array.sort(Order.String)
  )

  assert.equal(Array.dedupe(names).length, names.length)
  assert.deepEqual(names, expectedRuleNames)
})
