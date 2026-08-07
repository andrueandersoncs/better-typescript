import * as assert from "node:assert/strict"
import { test } from "bun:test"
import { noUnused } from "@better-typescript/guidance/preset/defaultWiring"
import { compilerOptionsForPolicies } from "@better-typescript/core/engine/policy/compilerOptionsForPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("no-unused reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(noUnused))

test("no-unused owns the compiler options required by its primary diagnostics", () => {
  assert.deepEqual(compilerOptionsForPolicies([noUnused]), {
    noEmit: true,
    noUnusedLocals: true,
    noUnusedParameters: true
  })
})
