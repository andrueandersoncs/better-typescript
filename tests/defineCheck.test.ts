import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Array, Effect } from "effect"
import type { Subscription } from "@better-typescript/core/engine/check/data"
import type { ProgramContext } from "@better-typescript/core/engine/sources/data"
import { makeRefactorExampleResolver } from "@better-typescript/core/engine/example"
import { makeSilentCheck, makeSilentPlannedCheck } from "@better-typescript/checks/defineCheck"
import { makeCheckFromSubscriptions } from "@better-typescript/core/engine/check"

const emptyPlan = (_context: ProgramContext): ReadonlyArray<Subscription> => Array.empty()

test("makeSilentPlannedCheck owns check identity, examples, and report policy", async () => {
  const check = makeSilentPlannedCheck("prefer-curried-data-last-functions", emptyPlan)
  const resolve = await Effect.runPromise(makeRefactorExampleResolver)
  const examples = await Effect.runPromise(resolve(check.examples))

  assert.equal(check.name, "prefer-curried-data-last-functions")
  assert.equal(check.reported, false)
  assert.equal(examples.length > 0, true)
})

test("makeSilentCheck owns an existing check's identity and report policy", async () => {
  const check = makeCheckFromSubscriptions(emptyPlan)
  const named = makeSilentCheck("architecture-evidence", check)
  const resolve = await Effect.runPromise(makeRefactorExampleResolver)
  const examples = await Effect.runPromise(resolve(named.examples))

  assert.equal(named.name, "architecture-evidence")
  assert.equal(named.reported, false)
  assert.deepEqual(examples, [])
})
