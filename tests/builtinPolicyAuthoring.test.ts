import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array } from "effect"
import { Policy } from "@better-typescript/core/engine/policy/policyClass"
import { WorkspacePolicy } from "@better-typescript/core/engine/policy/workspacePolicyClass"
import { makeBuiltinPolicy } from "@better-typescript/guidance/makeBuiltinPolicy"
import { makeMatcherFromSubscriptions } from "@better-typescript/matchers/matcher/makeMatcherFromSubscriptions"
import { WorkspaceMatcher } from "@better-typescript/matchers/matcher/workspaceMatcher"
import { emptyGuidance } from "./definePolicyEmptyGuidance.js"
import { emptyPlan } from "./definePolicyEmptyPlan.js"

test("built-in program Policy owns package examples, visibility, and stage", () => {
  const policy = makeBuiltinPolicy({
    name: "prefer-curried-data-last-functions",
    matcher: makeMatcherFromSubscriptions(emptyPlan),
    guidance: emptyGuidance,
    reported: false,
    stage: "program"
  })

  assert.equal(policy instanceof Policy, true)
  assert.equal(policy.name, "prefer-curried-data-last-functions")
  assert.equal(policy.reported, false)
  assert.equal(policy.examples._tag, "directory")
  assert.equal(policy.examples.root.endsWith("prefer-curried-data-last-functions"), true)
})

test("built-in workspace Policy owns package examples, visibility, and stage", () => {
  const policy = makeBuiltinPolicy({
    name: "source-directory",
    matcher: new WorkspaceMatcher({ match: () => Array.empty() }),
    guidance: emptyGuidance,
    reported: true,
    stage: "workspace"
  })

  assert.equal(policy instanceof WorkspacePolicy, true)
  assert.equal(policy.name, "source-directory")
  assert.equal(policy.reported, true)
  assert.equal(policy.examples._tag, "directory")
  assert.equal(policy.examples.root.endsWith("source-directory"), true)
})
