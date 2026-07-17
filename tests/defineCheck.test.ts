import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Array, Effect } from "effect"
import type { Subscription } from "@better-typescript/core/engine/check/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import { makeRefactorExampleResolver } from "@better-typescript/core/engine/example"
import { defineSilentPlannedCheck } from "@better-typescript/checks/defineCheck"

const emptyPlan = (_context: ProgramContext): ReadonlyArray<Subscription> => Array.empty()

test("defineSilentPlannedCheck owns check identity, examples, and report policy", async () => {
  const check = defineSilentPlannedCheck("prefer-curried-data-last-functions", emptyPlan)
  const resolve = await Effect.runPromise(makeRefactorExampleResolver)
  const examples = await Effect.runPromise(resolve(check.examples))

  assert.equal(check.name, "prefer-curried-data-last-functions")
  assert.equal(check.reported, false)
  assert.equal(examples.length > 0, true)
})
