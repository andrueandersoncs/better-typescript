import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Array } from "effect"
import type { Subscription } from "@better-typescript/core/engine/check/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import { defineSilentPlannedCheck } from "@better-typescript/checks/defineCheck"

const emptyPlan = (_context: ProgramContext): ReadonlyArray<Subscription> => Array.empty()

test("defineSilentPlannedCheck owns check identity, examples, and report policy", () => {
  const check = defineSilentPlannedCheck("prefer-curried-data-last-functions", emptyPlan)

  assert.equal(check.name, "prefer-curried-data-last-functions")
  assert.equal(check.reported, false)
  assert.equal(check.examples().length > 0, true)
})
