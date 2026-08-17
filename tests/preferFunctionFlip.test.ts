import { test } from "bun:test"
import { preferFunctionFlip } from "@better-typescript/guidance/preset/conceptAndCompositionPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-function-flip reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferFunctionFlip))
