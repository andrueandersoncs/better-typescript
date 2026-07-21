import { test } from "node:test"
import { preferInferredTypes } from "@better-typescript/guidance/policies/preferInferredTypes"
import { assertPolicyFixture } from "./ruleTestAssertions.js"

test("prefer-inferred-types reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferInferredTypes))

test("prefer-inferred-types remains active with unused diagnostics enabled", () =>
  assertPolicyFixture(preferInferredTypes, {
    noUnusedLocals: true,
    noUnusedParameters: true
  }))
