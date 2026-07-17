import * as assert from "node:assert/strict"
import { test } from "node:test"
import { noUnused } from "@better-typescript/checks/noUnused"
import { compilerOptionsForChecks } from "@better-typescript/core/engine/check"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("no-unused reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(noUnused))

test("no-unused owns the compiler options required by its primary diagnostics", () => {
  assert.deepEqual(compilerOptionsForChecks([noUnused.check]), {
    noEmit: true,
    noUnusedLocals: true,
    noUnusedParameters: true
  })
})
