import * as assert from "node:assert/strict"
import { test } from "node:test"
import { preferEquivalenceStrictEqual } from "@better-typescript/checks/preferEquivalenceStrictEqual"
import { strictEqual } from "@better-typescript/core/engine/equivalence"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-equivalence-strict-equal reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferEquivalenceStrictEqual))

test("strict equality helper preserves identity and NaN semantics", () => {
  const reference = {}

  assert.ok(strictEqual(reference, reference))
  assert.equal(strictEqual(reference, {}), false)
  assert.equal(strictEqual(Number.NaN, Number.NaN), false)
})
