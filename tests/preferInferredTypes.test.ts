import { test } from "node:test"
import { preferInferredTypes } from "@better-typescript/checks/preferInferredTypes"
import { assertCheckFixture } from "./ruleTestAssertions.js"

test("prefer-inferred-types reports disallowed and permits allowed fixture items", () =>
  assertCheckFixture(preferInferredTypes))

test("prefer-inferred-types remains active with unused diagnostics enabled", () =>
  assertCheckFixture(preferInferredTypes, {
    noUnusedLocals: true,
    noUnusedParameters: true
  }))
