import * as assert from "node:assert/strict"
import { test } from "node:test"
import { Array, Effect } from "effect"
import { requireWireSafeSchemaTaggedClass } from "@better-typescript/checks/requireWireSafeSchemaTaggedClass"
import { defaultWiring } from "@better-typescript/checks/preset/defaultWiring"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("require-wire-safe-schema-tagged-class rejects opaque encodings and permits portable encodings", () =>
  assertCheckFixture(requireWireSafeSchemaTaggedClass))

test("default preset activates the wire-safe Schema tagged-class policy", async () => {
  const wiring = await Effect.runPromise(defaultWiring)
  const isActive = Array.some(
    wiring.checks,
    (check) => check.name === "require-wire-safe-schema-tagged-class"
  )

  assert.equal(isActive, true)
})
