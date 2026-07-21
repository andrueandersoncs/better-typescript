import * as assert from "node:assert/strict"
import { test } from "node:test"
import { noUnused } from "@better-typescript/guidance/policies/noUnused"
import { compilerOptionsForPolicies } from "@better-typescript/core/engine/policy"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("no-unused reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noUnused))

test("no-unused owns the compiler options required by its primary diagnostics", () => {
  assert.deepEqual(compilerOptionsForPolicies([noUnused]), {
    noEmit: true,
    noUnusedLocals: true,
    noUnusedParameters: true
  })
})
