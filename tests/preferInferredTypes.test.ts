import { test } from "bun:test"
import { preferInferredTypes } from "@better-typescript/guidance/preset/defaultWiring"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-inferred-types reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferInferredTypes))

test("prefer-inferred-types remains active with unused diagnostics enabled", () =>
  assertPolicyFixture(preferInferredTypes, {
    noUnusedLocals: true,
    noUnusedParameters: true
  }))
