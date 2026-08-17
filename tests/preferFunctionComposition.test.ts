import { test } from "bun:test"
import { preferFunctionComposition } from "@better-typescript/guidance/preset/conceptAndCompositionPolicies"
import { assertPolicyFixture } from "./assertPolicyFixture.js"
test("prefer-function-composition reports disallowed and permits allowed fixture items", () =>
  assertPolicyFixture(preferFunctionComposition))
