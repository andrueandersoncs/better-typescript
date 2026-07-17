import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Array } from "effect"
import type { Subscription } from "@better-typescript/core/engine/check/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import { defineSilentCheck, defineSilentPlannedCheck } from "@better-typescript/checks/defineCheck"
import { checkFromSubscriptions } from "@better-typescript/core/engine/check"

const emptyPlan = (_context: ProgramContext): ReadonlyArray<Subscription> => Array.empty()

test("defineSilentPlannedCheck owns check identity, examples, and report policy", () => {
  const check = defineSilentPlannedCheck("prefer-curried-data-last-functions", emptyPlan)

  assert.equal(check.name, "prefer-curried-data-last-functions")
  assert.equal(check.reported, false)
  assert.equal(check.examples().length > 0, true)
})

test("defineSilentCheck owns an existing check's identity and report policy", () => {
  const check = checkFromSubscriptions(emptyPlan)
  const namedCheck = defineSilentCheck("architecture-evidence", check)

  assert.equal(namedCheck.name, "architecture-evidence")
  assert.equal(namedCheck.reported, false)
  assert.deepEqual(namedCheck.examples(), [])
})
