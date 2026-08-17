import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { emptyRefactorExampleSource } from "@better-typescript/core/engine/example/examplesFromDefinition"
import { makeSilentPolicy } from "@better-typescript/core/engine/policy/makeSilentPolicy"
import { makeMatcherFromSubscriptions } from "@better-typescript/matchers/matcher/makeMatcherFromSubscriptions"
import { emptyPlan } from "./definePolicyEmptyPlan.js"
import { emptyGuidance } from "./definePolicyEmptyGuidance.js"

test("makeSilentPolicy owns an existing matcher's identity and report policy", () => {
  const matcher = makeMatcherFromSubscriptions(emptyPlan)
  const named = makeSilentPolicy({
    name: "architecture-evidence",
    matcher,
    guidance: emptyGuidance,
    examples: emptyRefactorExampleSource
  })
  assert.equal(named.name, "architecture-evidence")
  assert.equal(named.reported, false)
  assert.equal(named.examples, emptyRefactorExampleSource)
})
