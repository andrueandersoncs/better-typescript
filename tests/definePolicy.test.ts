import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Array, Effect } from "effect"
import type { Subscription } from "@better-typescript/matchers/matcher/data"
import type { ProgramContext } from "@better-typescript/matchers/sources/data"
import { makeRefactorExampleResolver } from "@better-typescript/core/engine/example"
import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example"
import { defineSilentPolicy } from "@better-typescript/core/engine/policy"
import { makeMatcherFromSubscriptions } from "@better-typescript/matchers/matcher"
import { defineSilentBuiltinPolicy } from "@better-typescript/guidance/definePolicy"

const emptyPlan = (_context: ProgramContext): ReadonlyArray<Subscription> => Array.empty()
const emptyGuidance = () => () => Array.empty()

test("defineSilentBuiltinPolicy owns policy identity, examples, and report policy", async () => {
  const policy = defineSilentBuiltinPolicy(
    "prefer-curried-data-last-functions",
    makeMatcherFromSubscriptions(emptyPlan),
    emptyGuidance
  )
  const resolve = await Effect.runPromise(makeRefactorExampleResolver())
  const examples = await Effect.runPromise(resolve(policy.examples))

  assert.equal(policy.name, "prefer-curried-data-last-functions")
  assert.equal(policy.reported, false)
  assert.equal(examples.length > 0, true)
})

test("defineSilentPolicy owns an existing matcher's identity and report policy", async () => {
  const matcher = makeMatcherFromSubscriptions(emptyPlan)
  const named = defineSilentPolicy({
    name: "architecture-evidence",
    matcher,
    guidance: emptyGuidance,
    examples: emptyRefactorExampleSource
  })
  const resolve = await Effect.runPromise(makeRefactorExampleResolver())
  const examples = await Effect.runPromise(resolve(named.examples))

  assert.equal(named.name, "architecture-evidence")
  assert.equal(named.reported, false)
  assert.deepEqual(examples, [])
})
