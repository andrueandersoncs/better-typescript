import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { Array, Option, pipe } from "effect"
import {
  defaultDerive,
  defaultPolicyCatalog,
  defaultWiring
} from "@better-typescript/guidance/preset/defaultWiring"
import { conceptControl } from "@better-typescript/guidance/preset/conceptAndCompositionPolicies"
import { expectedPolicyNames } from "./defaultWiringExpectedPolicyNames.js"
import { isConceptControl } from "./defaultWiringIsConceptControl.js"
import { policyName } from "./defaultWiringPolicyName.js"

test("default wiring preserves the public policy catalog order", () => {
  const policyNames = Array.map(defaultPolicyCatalog, policyName)

  const conceptControlPolicy = pipe(
    Array.findFirst(defaultPolicyCatalog, isConceptControl),
    Option.getOrUndefined
  )

  assert.deepEqual(policyNames, expectedPolicyNames)
  assert.strictEqual(defaultWiring.policies, defaultPolicyCatalog)
  assert.strictEqual(defaultWiring.derive, defaultDerive)
  assert.strictEqual(conceptControlPolicy, conceptControl)
})
